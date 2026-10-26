package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.issue.application.IssueQueryService;
import io.github.goraebap.bit.module.issue.application.IssueRequests;
import io.github.goraebap.bit.module.issue.application.IssueService;
import io.github.goraebap.bit.module.issue.domain.Issue;
import io.github.goraebap.bit.module.issue.domain.IssueRepository;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.InstantTextBinding;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;

@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false", "app.auth.secret=issue-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false", "app.auth.allowed-origins=http://localhost:8080"
        })
class IssueIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @LocalServerPort
    private int port;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private IssueService issueService;

    @Autowired
    private IssueQueryService issueQueryService;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private io.github.goraebap.bit.module.link.application.CommentService commentService;

    @Autowired
    private io.github.goraebap.bit.module.link.application.TimelineService timelineService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String workspace;
    private String project;
    private String todo;
    private String done;
    private CurrentUser owner;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/issue-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        for (String trigger : List.of("reject_task", "reject_move", "reject_close"))
            jdbcTemplate.execute("DROP TRIGGER IF EXISTS " + trigger);
        for (String table : List.of(
                "comment",
                "activity",
                "issue_label",
                "issue",
                "board_column",
                "project_member",
                "project_key",
                "project",
                "workspace_invitation",
                "workspace_member",
                "issue_view_tweak",
                "issue_view",
                "label",
                "workspace",
                "iam_api_key",
                "iam_session",
                "iam_password",
                "iam_user")) jdbcTemplate.update("DELETE FROM " + table);
        workspace = Ids.newId();
        owner = participant("owner");
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                workspace,
                "Tasks",
                "issue-test",
                now,
                owner.userId(),
                now,
                owner.userId());
        membership(owner, "owner");
        project = projectService.create(owner, workspace, "Project", "BIT", null);
        var columns = projectService.columns(owner, workspace, project);
        todo = columns.getFirst().id();
        done = columns.getLast().id();
    }

    @Test
    void anAgentWorksOnIssuesOverStatelessMcpWithItsKeyAndASessionIsRefused() throws Exception {
        String password = "issue integration password phrase";
        jdbcTemplate.update(
                "UPDATE iam_password SET password_hash=? WHERE iam_user_id=?",
                passwordEncoder.encode(password),
                owner.userId());
        String email = jdbcTemplate.queryForObject(
                "SELECT email FROM iam_user WHERE iam_user_id=?", String.class, owner.userId());
        try (var client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build()) {
            expect(
                    http(
                            client,
                            "POST",
                            "/api/v1/auth/sessions",
                            JSON.writeValueAsString(Map.of("email", email, "password", password)),
                            null),
                    201);
            var keyResponse = http(
                    client,
                    "POST",
                    "/api/v1/me/api-keys",
                    JSON.writeValueAsString(
                            Map.of("name", "Agent", "agentName", "mcp-agent", "currentPassword", password)),
                    null);
            expect(keyResponse, 201);
            String key = JSON.readTree(keyResponse.body()).path("key").asText();

            var initialized = mcp(
                    client,
                    key,
                    "initialize",
                    Map.of(
                            "protocolVersion", "2025-06-18",
                            "capabilities", Map.of(),
                            "clientInfo", Map.of("name", "test", "version", "1")));
            expect(initialized, 200);
            assertThat(JSON.readTree(initialized.body())
                            .path("result")
                            .path("serverInfo")
                            .path("name")
                            .asText())
                    .isEqualTo("bit");
            var listed = JSON.readTree(mcp(client, key, "tools/list", Map.of()).body());
            var names = new HashSet<String>();
            listed.path("result")
                    .path("tools")
                    .forEach(tool -> names.add(tool.path("name").asText()));
            assertThat(names)
                    .contains(
                            "whoami",
                            "list_projects",
                            "list_members",
                            "list_labels",
                            "get_issue_context",
                            "list_issues",
                            "create_issue",
                            "update_issue",
                            "move_issue",
                            "add_comment");

            var created = call(
                    client,
                    key,
                    "create_issue",
                    Map.of(
                            "project",
                            "BIT",
                            "title",
                            "Agent task",
                            "description",
                            "## Plan\n\n- [ ] step",
                            "status",
                            "doing"));
            assertThat(created.path("isError").asBoolean()).isFalse();
            String ref = JSON.readTree(text(created)).path("ref").asText();
            assertThat(ref).isEqualTo("BIT-1");
            assertThat(JSON.readTree(text(created)).path("category").asText()).isEqualTo("doing");
            assertThat(call(client, key, "add_comment", Map.of("ref", ref, "body", "Started **work**"))
                            .path("isError")
                            .asBoolean())
                    .isFalse();
            var moved = JSON.readTree(text(call(client, key, "move_issue", Map.of("ref", ref, "status", "done"))));
            assertThat(moved.path("closed").asBoolean()).isTrue();
            var context = JSON.readTree(text(call(client, key, "get_issue_context", Map.of("ref", ref))));
            assertThat(context.path("description").asText()).isEqualTo("## Plan\n\n- [ ] step");
            var timeline = context.path("timeline");
            assertThat(timeline.get(0).path("activity").asText()).isEqualTo("이슈를 만듦");
            assertThat(timeline.get(0).path("agent").asText()).isEqualTo("mcp-agent");
            assertThat(timeline.get(1).path("comment").asText()).isEqualTo("Started **work**");
            assertThat(timeline.get(2).path("activity").asText()).contains("상태:");
            assertThat(jdbcTemplate.queryForObject("SELECT created_by_agent FROM issue WHERE number=1", String.class))
                    .isEqualTo("mcp-agent");

            var missing = call(client, key, "get_issue_context", Map.of("ref", "BIT-99"));
            assertThat(missing.path("isError").asBoolean()).isTrue();
            assertThat(text(missing)).contains("BIT-99");
            var badStatus = call(client, key, "move_issue", Map.of("ref", ref, "status", "Nowhere"));
            assertThat(text(badStatus)).contains("칸이 없습니다");

            // A browser's session is not an agent.
            var session = client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/mcp"))
                            .header("Content-Type", "application/json")
                            .header("Accept", "application/json, text/event-stream")
                            .header("Origin", "http://localhost:8080")
                            .POST(HttpRequest.BodyPublishers.ofString(
                                    "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(session.statusCode()).isIn(401, 403);
        }
    }

    private int rpc = 0;

    private HttpResponse<String> mcp(HttpClient client, String key, String method, Map<String, Object> params)
            throws Exception {
        String body =
                JSON.writeValueAsString(Map.of("jsonrpc", "2.0", "id", ++rpc, "method", method, "params", params));
        return client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/mcp"))
                        .header("Authorization", "Bearer " + key)
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json, text/event-stream")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private tools.jackson.databind.JsonNode call(
            HttpClient client, String key, String tool, Map<String, Object> arguments) throws Exception {
        var response = mcp(client, key, "tools/call", Map.of("name", tool, "arguments", arguments));
        expect(response, 200);
        return JSON.readTree(response.body()).path("result");
    }

    private static String text(tools.jackson.databind.JsonNode result) {
        return result.path("content").get(0).path("text").asText();
    }

    @Test
    void anIssuesChangesAndCommentsReadAsOneTimelineOldestFirst() {
        String id = create(owner, "Task", todo, null);
        var update = new IssueRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle("Renamed");
        update.setDescription("## Notes");
        issueService.revise(owner, workspace, project, id, update);
        String comment = commentService.create(
                owner, workspace, io.github.goraebap.bit.module.link.TargetType.issue, id, "Looks right");
        issueService.move(owner, workspace, project, id, 1, done, null, null);
        var lines = timelineService
                .list(owner, workspace, io.github.goraebap.bit.module.link.TargetType.issue, id, null, 100)
                .items();
        // One change's fields share its moment, so between themselves they keep no order.
        assertThat(lines)
                .extracting(line -> line.kind() + ":" + line.action() + ":" + line.field())
                .satisfiesExactly(
                        line -> assertThat(line).isEqualTo("activity:created:null"),
                        line -> assertThat(line).startsWith("activity:changed:"),
                        line -> assertThat(line).startsWith("activity:changed:"),
                        line -> assertThat(line).isEqualTo("comment:null:null"),
                        line -> assertThat(line).isEqualTo("activity:changed:column"));
        var title = lines.stream()
                .filter(line -> "title".equals(line.field()))
                .findFirst()
                .orElseThrow();
        assertThat(title.before()).isEqualTo("Task");
        assertThat(title.after()).isEqualTo("Renamed");
        var description = lines.stream()
                .filter(line -> "description".equals(line.field()))
                .findFirst()
                .orElseThrow();
        assertThat(description.after()).isNull();
        assertThat(lines.get(3).id()).isEqualTo(comment);
        assertThat(lines.get(3).body()).isEqualTo("Looks right");
        assertThat(lines.get(4).after()).isEqualTo(done);
        var first = timelineService.list(
                owner, workspace, io.github.goraebap.bit.module.link.TargetType.issue, id, null, 2);
        var rest = timelineService.list(
                owner, workspace, io.github.goraebap.bit.module.link.TargetType.issue, id, first.nextCursor(), 100);
        assertThat(first.items()).hasSize(2);
        assertThat(rest.items()).hasSize(3);
        assertThat(rest.nextCursor()).isNull();
    }

    @Test
    void referencesSurviveKeyChangesAndCompletionOnlyChangesOnStateTransitions() {
        String id = create(owner, "Task", todo, null);
        issueService.move(owner, workspace, project, id, 0, done, null, null);
        var completed = issueQueryService.get(owner, workspace, project, id);
        assertThat(completed.closedAt()).isNotNull();
        issueService.move(owner, workspace, project, id, completed.version(), done, null, null);
        var repeated = issueQueryService.get(owner, workspace, project, id);
        assertThat(repeated.closedAt()).isEqualTo(completed.closedAt());
        assertThat(repeated.version()).isEqualTo(completed.version());
        issueService.move(owner, workspace, project, id, repeated.version(), null, null, null);
        assertThat(issueQueryService.get(owner, workspace, project, id).closedAt())
                .isNull();
        projectService.revise(owner, workspace, project, 0, null, false, "NEW", true, null, false);
        assertThat(issueQueryService.byRef(owner, workspace, "BIT-1").key()).isEqualTo("NEW-1");
        assertThat(issueQueryService.byRef(owner, workspace, "NEW-1").id()).isEqualTo(id);
        assertThatThrownBy(() -> issueQueryService.byRef(owner, workspace, "BIT-0"))
                .hasMessageContaining("찾을 수");
        assertThatThrownBy(() -> issueQueryService.byRef(owner, workspace, "NEW-9999999999999999999"))
                .hasMessageContaining("찾을 수");
    }

    @Test
    void failingCreationRollsBackAllocatedNumberAndForeignColumnsAndAssigneesAreRejected() {
        jdbcTemplate.execute(
                "CREATE TRIGGER reject_task BEFORE INSERT ON issue WHEN NEW.title='FAIL' BEGIN SELECT RAISE(ABORT,'forced failure'); END");
        assertThatThrownBy(() -> create(owner, "FAIL", todo, null)).isInstanceOf(RuntimeException.class);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT last_issue_number FROM project WHERE project_id=?", Long.class, project))
                .isZero();
        String other = projectService.create(owner, workspace, "Other", "OT", null);
        String otherColumn =
                projectService.columns(owner, workspace, other).getFirst().id();
        assertThatThrownBy(() -> create(owner, "Foreign", otherColumn, null)).hasMessageContaining("컬럼");
        assertThatThrownBy(() -> create(owner, "Unassigned", todo, Ids.newId())).hasMessageContaining("멤버");
        String id = create(owner, "Valid", todo, null);
        assertThat(issueQueryService.get(owner, workspace, project, id).number())
                .isEqualTo(1);
    }

    @Test
    void neighborMovesAreScopedAndRenumberBothSourceAndDestination() {
        String a = create(owner, "A", todo, null);
        String b = create(owner, "B", todo, null);
        String c = create(owner, "C", todo, null);
        issueService.move(owner, workspace, project, a, 0, todo, c, b);
        assertThat(issueRepository.findColumnItems(project, todo, false).stream()
                        .map(Issue::id))
                .containsExactly(b, a, c);
        assertThat(issueRepository.findColumnItems(project, todo, false).stream()
                        .map(Issue::position))
                .containsExactly(0d, 1d, 2d);
        assertThatThrownBy(() -> issueService.move(owner, workspace, project, a, 0, done, null, null))
                .hasMessageContaining("다른 변경");
        String other = projectService.create(owner, workspace, "Other", "OT", null);
        String foreign = issueService.create(owner, workspace, other, details("Foreign", null), null);
        long version = issueQueryService.get(owner, workspace, project, a).version();
        assertThatThrownBy(() -> issueService.move(owner, workspace, project, a, version, todo, foreign, null))
                .hasMessageContaining("위치");
        assertThatThrownBy(() -> issueService.move(owner, workspace, other, a, version, null, null, null))
                .hasMessageContaining("찾을 수");
        issueService.move(owner, workspace, project, a, version, done, null, null);
        assertThat(issueRepository.findColumnItems(project, todo, false).stream()
                        .map(Issue::position))
                .containsExactly(0d, 1d);
    }

    @Test
    void finalReclassificationAndColumnTransferRollbackTogetherOnDatabaseFailure() {
        String id = create(owner, "State", todo, null);
        jdbcTemplate.execute(
                "CREATE TRIGGER reject_close BEFORE UPDATE ON issue WHEN NEW.closed_at IS NOT NULL BEGIN SELECT RAISE(ABORT,'forced failure'); END");
        assertThatThrownBy(() -> projectService.reviseColumn(owner, workspace, project, todo, 0, "Final", null, true))
                .isInstanceOf(RuntimeException.class);
        assertThat(projectService.columns(owner, workspace, project).getFirst().finalColumn())
                .isFalse();
        assertThat(issueQueryService.get(owner, workspace, project, id).closedAt())
                .isNull();
        jdbcTemplate.execute("DROP TRIGGER reject_close");
        projectService.reviseColumn(owner, workspace, project, todo, 0, "Final", null, true);
        assertThat(issueQueryService.get(owner, workspace, project, id).closedAt())
                .isNotNull();
        jdbcTemplate.execute(
                "CREATE TRIGGER reject_move BEFORE UPDATE ON issue WHEN NEW.board_column_id<>OLD.board_column_id BEGIN SELECT RAISE(ABORT,'forced failure'); END");
        assertThatThrownBy(() -> projectService.deleteColumn(owner, workspace, project, todo, 1, done))
                .isInstanceOf(RuntimeException.class);
        assertThat(projectService.columns(owner, workspace, project).stream()
                        .anyMatch(col -> col.id().equals(todo)))
                .isTrue();
        assertThat(issueQueryService.get(owner, workspace, project, id).columnId())
                .isEqualTo(todo);
    }

    @Test
    void columnDeletionMovesArchivedTasksButDeletedTasksRestoreToBacklog() {
        String live = create(owner, "Live", todo, null);
        String archived = create(owner, "Archived", todo, null);
        String deleted = create(owner, "Deleted", todo, null);
        issueService.archive(owner, workspace, project, archived, 0, true);
        issueService.delete(owner, workspace, project, deleted, 0);
        projectService.deleteColumn(owner, workspace, project, todo, 0, done);
        assertThat(issueQueryService.get(owner, workspace, project, live).columnId())
                .isEqualTo(done);
        assertThat(issueQueryService.get(owner, workspace, project, archived).archivedAt())
                .isNotNull();
        assertThat(issueQueryService.get(owner, workspace, project, archived).closedAt())
                .isNotNull();
        issueService.restore(owner, workspace, project, deleted, 1);
        var restored = issueQueryService.get(owner, workspace, project, deleted);
        assertThat(restored.columnId()).isNull();
        assertThat(restored.closedAt()).isNull();
        assertThatThrownBy(() -> projectService.deleteColumn(owner, workspace, project, done, 0, null))
                .hasMessageContaining("완료 컬럼");
    }

    @Test
    void archivedProjectsBlockAllTaskWritesAndPreserveIndividualStatesOnRestoration() {
        String id = create(owner, "Archive", todo, owner.userId());
        issueService.archive(owner, workspace, project, id, 0, true);
        projectService.archive(owner, workspace, project, 0, true);
        assertThatThrownBy(() -> issueService.archive(owner, workspace, project, id, 1, false))
                .hasMessageContaining("보관");
        assertThatThrownBy(() -> create(owner, "Blocked", todo, null)).hasMessageContaining("보관");
        assertThat(issueQueryService
                        .list(owner, workspace, null, true, new IssueRequests.ListRequest())
                        .items())
                .isEmpty();
        projectService.archive(owner, workspace, project, 1, false);
        assertThat(issueQueryService.get(owner, workspace, project, id).archivedAt())
                .isNotNull();
    }

    @Test
    void concurrentCreatesKeepUniqueNumbersAndCompetingEditsOnlyCommitOnce() throws Exception {
        try (var executor = Executors.newFixedThreadPool(4)) {
            List<Callable<String>> tasks = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                int n = i;
                tasks.add(() -> create(owner, "Task " + n, todo, null));
            }
            var futures = executor.invokeAll(tasks);
            var numbers = new HashSet<Long>();
            for (var f : futures)
                numbers.add(issueQueryService
                        .get(owner, workspace, project, f.get())
                        .number());
            assertThat(numbers).containsExactlyInAnyOrder(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);
            String id = futures.getFirst().get();
            List<Callable<Boolean>> edits = List.of(() -> edit(id, "One"), () -> edit(id, "Two"));
            int successes = 0;
            for (var f : executor.invokeAll(edits)) if (f.get()) successes++;
            assertThat(successes).isEqualTo(1);
        }
    }

    @Test
    void memberWritesAndViewerReadsUseCurrentMembershipAndPastAssignmentCanStillBeShown() {
        CurrentUser member = participant("member");
        membership(member, "member");
        CurrentUser viewer = participant("viewer");
        membership(viewer, "viewer");
        String id = create(member, "Member task", todo, member.userId());
        assertThat(issueQueryService.get(viewer, workspace, project, id).title())
                .isEqualTo("Member task");
        assertThatThrownBy(() -> create(viewer, "Forbidden", todo, null)).hasMessageContaining("권한");
        jdbcTemplate.update(
                "DELETE FROM workspace_member WHERE workspace_id=? AND iam_user_id=?", workspace, member.userId());
        assertThatThrownBy(() -> create(owner, "New assignment", todo, member.userId()))
                .hasMessageContaining("멤버");
        assertThat(issueQueryService.get(owner, workspace, project, id).assigneeId())
                .isEqualTo(member.userId());
        assertThatThrownBy(() -> issueQueryService.get(member, workspace, project, id))
                .hasMessageContaining("찾을 수");
        var update = new IssueRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle("Kept assignment");
        issueService.revise(owner, workspace, project, id, update);
        assertThat(issueQueryService.get(owner, workspace, project, id).assigneeId())
                .isEqualTo(member.userId());
    }

    @Test
    void filtersAndPositionCursorsUseStableBoundariesAndMyTasksStayInTheWorkspace() {
        create(owner, "One", todo, owner.userId());
        create(owner, "Two", done, owner.userId());
        var request = new IssueRequests.ListRequest();
        request.setSize(1);
        request.setSort("position");
        request.setDirection("ASC");
        var page = issueQueryService.list(owner, workspace, project, false, request);
        request.setCursor(page.nextCursor());
        var next = issueQueryService.list(owner, workspace, project, false, request);
        assertThat(page.items()).hasSize(1);
        assertThat(next.items()).hasSize(1);
        assertThat(next.items().getFirst().id())
                .isNotEqualTo(page.items().getFirst().id());
        assertThat(next.nextCursor()).isNull();
        request.setQ("Other");
        assertThatThrownBy(() -> issueQueryService.list(owner, workspace, project, false, request))
                .hasMessageContaining("요청");
        var filters = new IssueRequests.ListRequest();
        filters.setClosed(true);
        assertThat(issueQueryService
                        .list(owner, workspace, project, false, filters)
                        .items())
                .hasSize(1);
        filters.setPriority(List.of("low,high,", "low"));
        assertThat(issueQueryService
                        .list(owner, workspace, project, false, filters)
                        .items())
                .isEmpty();
        filters.setPriority(List.of("bad"));
        assertThatThrownBy(() -> issueQueryService.list(owner, workspace, project, false, filters))
                .hasMessageContaining("요청");
        assertThat(issueQueryService
                        .list(owner, workspace, null, true, new IssueRequests.ListRequest())
                        .items())
                .hasSize(2);
    }

    @Test
    void httpSupportsNullablePatchesBearerWritesAndRejectsForeignResourcesBeforeBinding() throws Exception {
        String password = "issue integration password phrase";
        jdbcTemplate.update(
                "UPDATE iam_password SET password_hash=? WHERE iam_user_id=?",
                passwordEncoder.encode(password),
                owner.userId());
        String email = jdbcTemplate.queryForObject(
                "SELECT email FROM iam_user WHERE iam_user_id=?", String.class, owner.userId());
        try (var client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build()) {
            expect(
                    http(
                            client,
                            "POST",
                            "/api/v1/auth/sessions",
                            JSON.writeValueAsString(Map.of("email", email, "password", password)),
                            null),
                    201);
            var keyResponse = http(
                    client,
                    "POST",
                    "/api/v1/me/api-keys",
                    JSON.writeValueAsString(
                            Map.of("name", "Tasks", "agentName", "task-agent", "currentPassword", password)),
                    null);
            expect(keyResponse, 201);
            String key = JSON.readTree(keyResponse.body()).path("key").asText();
            String base = "/api/v1/workspaces/" + workspace + "/projects/" + project + "/issues";
            var created = http(client, "POST", base, "{\"title\":\"HTTP task\",\"priority\":\"high\"}", key);
            expect(created, 201);
            String path = created.headers().firstValue("location").orElseThrow();
            var get = http(client, "GET", path, null, key);
            expect(get, 200);
            var counts = http(client, "GET", base + "/counts?size=1", null, key);
            expect(counts, 200);
            assertThat(JSON.readTree(counts.body()).get(0).path("count").asLong())
                    .isEqualTo(1);
            assertThat(JSON.readTree(get.body()).path("createdByAgent").asText())
                    .isEqualTo("task-agent");
            String issueId = JSON.readTree(get.body()).path("id").asText();
            var comment = http(
                    client,
                    "POST",
                    "/api/v1/workspaces/" + workspace + "/comments",
                    JSON.writeValueAsString(Map.of("targetType", "issue", "targetId", issueId, "body", "**Agreed**")),
                    key);
            expect(comment, 201);
            String commentPath = comment.headers().firstValue("location").orElseThrow();
            expect(
                    http(client, "PATCH", commentPath, "{\"body\":\"Agreed, shipping\",\"expectedVersion\":0}", null),
                    204);
            var timeline = http(
                    client,
                    "GET",
                    "/api/v1/workspaces/" + workspace + "/timeline?targetType=issue&targetId=" + issueId,
                    null,
                    key);
            expect(timeline, 200);
            var lines = JSON.readTree(timeline.body()).path("items");
            assertThat(lines.get(0).path("action").asText()).isEqualTo("created");
            assertThat(lines.get(1).path("body").asText()).isEqualTo("Agreed, shipping");
            assertThat(lines.get(1).path("actorAgent").asText()).isEqualTo("task-agent");
            expect(http(client, "DELETE", commentPath + "?expectedVersion=1", null, null), 204);
            String columnPath = "/api/v1/workspaces/" + workspace + "/projects/" + project + "/columns/" + done;
            expect(http(client, "PATCH", columnPath, "{\"expectedVersion\":0,\"color\":\"#112233\"}", null), 204);
            var columnRead =
                    JSON.readTree(http(client, "GET", columnPath, null, null).body());
            assertThat(columnRead.path("isFinal").asBoolean()).isTrue();
            expect(http(client, "PATCH", columnPath, "{\"expectedVersion\":1,\"color\":null}", null), 204);
            columnRead =
                    JSON.readTree(http(client, "GET", columnPath, null, null).body());
            assertThat(columnRead.path("color").isNull()).isTrue();
            assertThat(columnRead.path("isFinal").asBoolean()).isTrue();
            expect(http(client, "PATCH", path, "{\"expectedVersion\":0,\"priority\":null}", null), 204);
            assertThat(JSON.readTree(http(client, "GET", path, null, null).body())
                            .path("priority")
                            .isNull())
                    .isTrue();
            expect(http(client, "POST", path + "/move", "{\"expectedVersion\":1}", null), 400);
            expect(http(client, "GET", base + "?priority=high,low,&priority=high", null, key), 200);
            jdbcTemplate.update("UPDATE workspace_member SET role='viewer' WHERE workspace_id=?", workspace);
            expect(http(client, "POST", base, "bad JSON", key), 403);
            expect(http(client, "PATCH", path, "bad JSON", null), 403);
            expect(http(client, "GET", base + "?deleted=1&q=" + "x".repeat(201), null, key), 403);
            expect(http(client, "PATCH", base + "/" + Ids.newId(), "bad JSON", key), 403);
            jdbcTemplate.update("UPDATE workspace_member SET role='owner' WHERE workspace_id=?", workspace);
            expect(http(client, "PATCH", base + "/" + Ids.newId(), "bad JSON", key), 404);
            expect(http(client, "GET", "/api/v1/workspaces/" + workspace + "/issues/by-ref/BIT-1", null, key), 200);
        }
    }

    private CurrentUser participant(String role) {
        return identity(role, false);
    }

    @Test
    void boardCountsUseAllMatchingRowsRatherThanOnlyTheLoadedPage() {
        create(owner, "Count A", todo, null);
        create(owner, "Count B", todo, null);
        create(owner, "Count Done", done, null);
        issueService.create(
                owner,
                workspace,
                project,
                new Issue.Details("High", null, Issue.Priority.high, null, null, null, null),
                todo);
        String archived = create(owner, "Archive", todo, null);
        issueService.archive(owner, workspace, project, archived, 0, true);
        var request = new IssueRequests.ListRequest();
        request.setSize(1);
        assertThat(issueQueryService
                        .list(owner, workspace, project, false, request)
                        .items())
                .hasSize(1);
        var counts = issueQueryService.counts(owner, workspace, project, request);
        assertThat(counts.stream()
                        .filter(c -> todo.equals(c.columnId()))
                        .findFirst()
                        .orElseThrow()
                        .count())
                .isEqualTo(3);
        assertThat(counts.stream()
                        .filter(c -> done.equals(c.columnId()))
                        .findFirst()
                        .orElseThrow()
                        .count())
                .isEqualTo(1);
        request.setPriority(List.of("high"));
        assertThat(issueQueryService
                        .counts(owner, workspace, project, request)
                        .getFirst()
                        .count())
                .isEqualTo(1);
        request.setPriority(List.of());
        request.setArchived(true);
        assertThat(issueQueryService
                        .counts(owner, workspace, project, request)
                        .getFirst()
                        .count())
                .isEqualTo(1);
    }

    @Test
    void myTasksAndCursorsAreIsolatedEvenWhenTheSameUserBelongsToBothWorkspaces() {
        create(owner, "Mine A", todo, owner.userId());
        create(owner, "Mine B", todo, owner.userId());
        String otherWorkspace = Ids.newId();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                otherWorkspace,
                "Other",
                "other-tasks",
                now,
                owner.userId(),
                now,
                owner.userId());
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                Ids.newId(),
                otherWorkspace,
                owner.userId(),
                "owner",
                now);
        String otherProject = projectService.create(owner, otherWorkspace, "Other", "BIT", null);
        String otherTask =
                issueService.create(owner, otherWorkspace, otherProject, details("Other space", owner.userId()), null);
        assertThat(issueQueryService
                        .list(owner, workspace, null, true, new IssueRequests.ListRequest())
                        .items())
                .hasSize(2);
        assertThat(issueQueryService
                        .list(owner, otherWorkspace, null, true, new IssueRequests.ListRequest())
                        .items()
                        .getFirst()
                        .id())
                .isEqualTo(otherTask);
        var request = new IssueRequests.ListRequest();
        request.setSize(1);
        var page = issueQueryService.list(owner, workspace, null, true, request);
        request.setCursor(page.nextCursor());
        assertThatThrownBy(() -> issueQueryService.list(owner, otherWorkspace, null, true, request))
                .hasMessageContaining("요청");
        assertThatThrownBy(() -> issueQueryService.get(owner, workspace, otherProject, otherTask))
                .hasMessageContaining("찾을 수");
        assertThat(issueQueryService
                        .counts(owner, workspace, project, new IssueRequests.ListRequest())
                        .getFirst()
                        .count())
                .isEqualTo(2);
    }

    @Test
    void datePriorityTriggerAndAssignmentFiltersRoundTripAndNullablePatchesPreserveOtherValues() {
        var start = java.time.LocalDate.of(2026, 10, 22);
        var due = start.plusDays(3);
        var details = new Issue.Details(
                "Filtered", "body", Issue.Priority.high, Issue.TriggerType.finding, owner.userId(), start, due);
        String id = issueService.create(owner, workspace, project, details, todo);
        var filter = new IssueRequests.ListRequest();
        filter.setPriority(List.of("high,low,"));
        filter.setTriggerType(List.of("finding"));
        filter.setAssigneeId(owner.userId());
        filter.setColumn(todo);
        filter.setFrom(start.plusDays(1));
        filter.setTo(due);
        filter.setQ("filter");
        var page = issueQueryService.list(owner, workspace, project, false, filter);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().dueDate()).isEqualTo(due);
        filter.setFrom(due.plusDays(1));
        filter.setTo(due.plusDays(2));
        assertThat(issueQueryService
                        .list(owner, workspace, project, false, filter)
                        .items())
                .isEmpty();
        var update = new IssueRequests.Update();
        update.setExpectedVersion(0L);
        update.setDescription(null);
        update.setAssigneeId(null);
        issueService.revise(owner, workspace, project, id, update);
        var read = issueQueryService.get(owner, workspace, project, id);
        assertThat(read.description()).isNull();
        assertThat(read.assigneeId()).isNull();
        assertThat(read.priority()).isEqualTo(Issue.Priority.high);
        update = new IssueRequests.Update();
        update.setExpectedVersion(1L);
        update.setDueDate(start.minusDays(1));
        final var invalid = update;
        assertThatThrownBy(() -> issueService.revise(owner, workspace, project, id, invalid))
                .hasMessageContaining("마감일");
        assertThat(issueQueryService.get(owner, workspace, project, id).dueDate())
                .isEqualTo(due);
    }

    @Test
    void columnDeletionAndTaskMoveCannotLeaveLiveTasksInDeletedColumns() throws Exception {
        String id = create(owner, "Race", null, null);
        try (var executor = Executors.newFixedThreadPool(2)) {
            List<Callable<Boolean>> actions = List.of(
                    () -> {
                        projectService.deleteColumn(owner, workspace, project, todo, 0, done);
                        return true;
                    },
                    () -> {
                        try {
                            issueService.move(owner, workspace, project, id, 0, todo, null, null);
                            return true;
                        } catch (io.github.goraebap.bit.shared.error.BusinessException conflict) {
                            assertThat(conflict.errorCode().code())
                                    .isIn("PROJECT_COLUMN_NOT_FOUND", "ISSUE_VERSION_CONFLICT");
                            return false;
                        }
                    });
            for (var result : executor.invokeAll(actions)) result.get();
        }
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM issue w JOIN board_column c ON c.board_column_id=w.board_column_id WHERE w.deleted_at IS NULL AND c.deleted_at IS NOT NULL",
                        Integer.class))
                .isZero();
        assertThat(issueQueryService.get(owner, workspace, project, id).columnId())
                .isIn(null, done);
    }

    @Test
    void adminsCanWriteButInstanceAdministrationDoesNotGrantWorkspaceDataAccess() {
        CurrentUser admin = participant("admin");
        membership(admin, "admin");
        String id = create(admin, "Admin task", todo, null);
        assertThat(issueQueryService.get(admin, workspace, project, id).title()).isEqualTo("Admin task");
        CurrentUser outsider = identity("instance-admin", true);
        assertThatThrownBy(() -> issueQueryService.get(outsider, workspace, project, id))
                .hasMessageContaining("찾을 수");
        assertThatThrownBy(() -> create(outsider, "No implicit access", todo, null))
                .hasMessageContaining("찾을 수");
        jdbcTemplate.update("UPDATE iam_password SET must_change=1 WHERE iam_user_id=?", owner.userId());
        assertThatThrownBy(() -> create(owner, "Stale principal", todo, null)).hasMessageContaining("권한");
        assertThatThrownBy(() -> issueQueryService.get(owner, workspace, project, id))
                .hasMessageContaining("권한");
    }

    @Test
    void deletedListingIncludesArchivedTasksAndDeletedNumbersAreNeverReused() {
        String id = create(owner, "Deleted archive", todo, null);
        issueService.archive(owner, workspace, project, id, 0, true);
        issueService.delete(owner, workspace, project, id, 1);
        var filter = new IssueRequests.ListRequest();
        filter.setDeleted(true);
        var page = issueQueryService.list(owner, workspace, project, false, filter);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().archivedAt()).isNotNull();
        String next = create(owner, "Next number", todo, null);
        assertThat(issueQueryService.get(owner, workspace, project, next).number())
                .isEqualTo(2);
        issueService.restore(owner, workspace, project, id, 2);
        assertThat(issueQueryService.get(owner, workspace, project, id).archivedAt())
                .isNotNull();
        CurrentUser viewer = participant("viewer");
        membership(viewer, "viewer");
        assertThatThrownBy(() -> issueQueryService.list(viewer, workspace, project, false, filter))
                .hasMessageContaining("권한");
    }

    private CurrentUser identity(String role, boolean instanceAdmin) {
        String user = Ids.newId();
        String credential = Ids.newId();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                user,
                role + user.toLowerCase(Locale.ROOT) + "@example.test",
                role,
                now,
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES (?,?,?)",
                user,
                "fixture-hash",
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_session(iam_session_id,iam_user_id,token_hash,expires_at,absolute_expires_at,last_seen_at,created_at) VALUES (?,?,?,?,?,?,?)",
                credential,
                user,
                credential,
                InstantTextBinding.text(Instant.now().plusSeconds(3600)),
                InstantTextBinding.text(Instant.now().plusSeconds(7200)),
                now,
                now);
        if (instanceAdmin) jdbcTemplate.update("UPDATE iam_user SET is_instance_admin=1 WHERE iam_user_id=?", user);
        return new CurrentUser(user, instanceAdmin, CurrentUser.Method.SESSION, credential, null, false);
    }

    private void membership(CurrentUser actor, String role) {
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                Ids.newId(),
                workspace,
                actor.userId(),
                role,
                InstantTextBinding.text(Instant.now()));
    }

    private String create(CurrentUser actor, String title, String column, String assignee) {
        return issueService.create(actor, workspace, project, details(title, assignee), column);
    }

    private static Issue.Details details(String title, String assignee) {
        return new Issue.Details(title, null, null, null, assignee, null, null);
    }

    private boolean edit(String id, String title) {
        var update = new IssueRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle(title);
        try {
            issueService.revise(owner, workspace, project, id, update);
            return true;
        } catch (io.github.goraebap.bit.shared.error.BusinessException conflict) {
            assertThat(conflict.errorCode().code()).isEqualTo("ISSUE_VERSION_CONFLICT");
            return false;
        }
    }

    private static void expect(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(status);
    }

    private HttpResponse<String> http(HttpClient client, String method, String path, String body, String key)
            throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json");
        if (key != null) request.header("Authorization", "Bearer " + key);
        else if (!method.equals("GET")) {
            var csrf = client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/csrf"))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            request.header("Origin", "http://localhost:8080")
                    .header(
                            "X-CSRF-Token",
                            JSON.readTree(csrf.body()).path("token").asText());
        }
        if (body != null) request.header("Content-Type", "application/json");
        return client.send(
                request.method(
                                method,
                                body == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }
}
