package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.notification.application.NotificationService;
import io.github.goraebap.bit.module.notification.application.NotificationViews;
import io.github.goraebap.bit.module.notification.domain.Notification;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.workitem.application.RecurrenceService;
import io.github.goraebap.bit.module.workitem.application.WorkItemQueryService;
import io.github.goraebap.bit.module.workitem.application.WorkItemRequests;
import io.github.goraebap.bit.module.workitem.application.WorkItemService;
import io.github.goraebap.bit.module.workitem.application.WorkItemViews;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
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
            "app.secrets.generate=false", "app.auth.secret=work-item-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false", "app.auth.allowed-origins=http://localhost:8080"
        })
class WorkItemIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @LocalServerPort
    private int port;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private WorkItemService workItemService;

    @Autowired
    private WorkItemQueryService workItemQueryService;

    @Autowired
    private RecurrenceService recurrenceService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private WorkItemRepository workItemRepository;

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
                + Path.of("build/test-db/workItem-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        for (String trigger : List.of("reject_task", "reject_move", "reject_close"))
            jdbcTemplate.execute("DROP TRIGGER IF EXISTS " + trigger);
        for (String table : List.of(
                "notification",
                "comment",
                "activity",
                "work_item_person",
                "work_item_label",
                "work_item",
                "recurrence",
                "board_column",
                "project_member",
                "project_key",
                "project",
                "workspace_invitation",
                "workspace_member",
                "work_item_view_tweak",
                "work_item_view",
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
                "work-item-test",
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
    void anAgentWorksOnWorkItemsOverStatelessMcpWithItsKeyAndASessionIsRefused() throws Exception {
        String password = "work item integration password phrase";
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
                            "get_work_item_context",
                            "list_work_items",
                            "create_work_item",
                            "update_work_item",
                            "move_work_item",
                            "add_comment");

            var created = call(
                    client,
                    key,
                    "create_work_item",
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
            var moved = JSON.readTree(text(call(client, key, "move_work_item", Map.of("ref", ref, "status", "done"))));
            assertThat(moved.path("closed").asBoolean()).isTrue();
            var context = JSON.readTree(text(call(client, key, "get_work_item_context", Map.of("ref", ref))));
            assertThat(context.path("description").asText()).isEqualTo("## Plan\n\n- [ ] step");
            var timeline = context.path("timeline");
            assertThat(timeline.get(0).path("activity").asText()).isEqualTo("업무를 만듦");
            assertThat(timeline.get(0).path("agent").asText()).isEqualTo("mcp-agent");
            assertThat(timeline.get(1).path("comment").asText()).isEqualTo("Started **work**");
            assertThat(timeline.get(2).path("activity").asText()).contains("상태:");
            assertThat(jdbcTemplate.queryForObject(
                            "SELECT created_by_agent FROM work_item WHERE number=1", String.class))
                    .isEqualTo("mcp-agent");

            var missing = call(client, key, "get_work_item_context", Map.of("ref", "BIT-99"));
            assertThat(missing.path("isError").asBoolean()).isTrue();
            assertThat(text(missing)).contains("BIT-99");
            var badStatus = call(client, key, "move_work_item", Map.of("ref", ref, "status", "Nowhere"));
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
    void anWorkItemsChangesAndCommentsReadAsOneTimelineOldestFirst() {
        String id = create(owner, "Task", todo, null);
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle("Renamed");
        update.setDescription("## Notes");
        workItemService.revise(owner, workspace, project, id, update);
        String comment = commentService.create(
                owner, workspace, io.github.goraebap.bit.module.link.TargetType.work_item, id, "Looks right");
        workItemService.move(owner, workspace, project, id, 1, done, null, null);
        var lines = timelineService
                .list(owner, workspace, io.github.goraebap.bit.module.link.TargetType.work_item, id, null, 100)
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
                owner, workspace, io.github.goraebap.bit.module.link.TargetType.work_item, id, null, 2);
        var rest = timelineService.list(
                owner, workspace, io.github.goraebap.bit.module.link.TargetType.work_item, id, first.nextCursor(), 100);
        assertThat(first.items()).hasSize(2);
        assertThat(rest.items()).hasSize(3);
        assertThat(rest.nextCursor()).isNull();
    }

    @Test
    void referencesSurviveKeyChangesAndCompletionOnlyChangesOnStateTransitions() {
        String id = create(owner, "Task", todo, null);
        workItemService.move(owner, workspace, project, id, 0, done, null, null);
        var completed = workItemQueryService.get(owner, workspace, project, id);
        assertThat(completed.closedAt()).isNotNull();
        workItemService.move(owner, workspace, project, id, completed.version(), done, null, null);
        var repeated = workItemQueryService.get(owner, workspace, project, id);
        assertThat(repeated.closedAt()).isEqualTo(completed.closedAt());
        assertThat(repeated.version()).isEqualTo(completed.version());
        workItemService.move(owner, workspace, project, id, repeated.version(), null, null, null);
        assertThat(workItemQueryService.get(owner, workspace, project, id).closedAt())
                .isNull();
        projectService.revise(owner, workspace, project, 0, null, false, "NEW", true, null, false);
        assertThat(workItemQueryService.byRef(owner, workspace, "BIT-1").key()).isEqualTo("NEW-1");
        assertThat(workItemQueryService.byRef(owner, workspace, "NEW-1").id()).isEqualTo(id);
        assertThatThrownBy(() -> workItemQueryService.byRef(owner, workspace, "BIT-0"))
                .hasMessageContaining("찾을 수");
        assertThatThrownBy(() -> workItemQueryService.byRef(owner, workspace, "NEW-9999999999999999999"))
                .hasMessageContaining("찾을 수");
    }

    @Test
    void failingCreationRollsBackAllocatedNumberAndForeignColumnsAndAssigneesAreRejected() {
        jdbcTemplate.execute(
                "CREATE TRIGGER reject_task BEFORE INSERT ON work_item WHEN NEW.title='FAIL' BEGIN SELECT RAISE(ABORT,'forced failure'); END");
        assertThatThrownBy(() -> create(owner, "FAIL", todo, null)).isInstanceOf(RuntimeException.class);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT last_work_item_number FROM project WHERE project_id=?", Long.class, project))
                .isZero();
        String other = projectService.create(owner, workspace, "Other", "OT", null);
        String otherColumn =
                projectService.columns(owner, workspace, other).getFirst().id();
        assertThatThrownBy(() -> create(owner, "Foreign", otherColumn, null)).hasMessageContaining("컬럼");
        assertThatThrownBy(() -> create(owner, "Unassigned", todo, Ids.newId())).hasMessageContaining("멤버");
        String id = create(owner, "Valid", todo, null);
        assertThat(workItemQueryService.get(owner, workspace, project, id).number())
                .isEqualTo(1);
    }

    @Test
    void neighborMovesAreScopedAndRenumberBothSourceAndDestination() {
        String a = create(owner, "A", todo, null);
        String b = create(owner, "B", todo, null);
        String c = create(owner, "C", todo, null);
        workItemService.move(owner, workspace, project, a, 0, todo, c, b);
        assertThat(workItemRepository.findColumnItems(project, todo, false).stream()
                        .map(WorkItem::id))
                .containsExactly(b, a, c);
        assertThat(workItemRepository.findColumnItems(project, todo, false).stream()
                        .map(WorkItem::position))
                .containsExactly(0d, 1d, 2d);
        assertThatThrownBy(() -> workItemService.move(owner, workspace, project, a, 0, done, null, null))
                .hasMessageContaining("다른 변경");
        String other = projectService.create(owner, workspace, "Other", "OT", null);
        String foreign = workItemService.create(owner, workspace, other, details("Foreign", null), null);
        long version = workItemQueryService.get(owner, workspace, project, a).version();
        assertThatThrownBy(() -> workItemService.move(owner, workspace, project, a, version, todo, foreign, null))
                .hasMessageContaining("위치");
        assertThatThrownBy(() -> workItemService.move(owner, workspace, other, a, version, null, null, null))
                .hasMessageContaining("찾을 수");
        workItemService.move(owner, workspace, project, a, version, done, null, null);
        assertThat(workItemRepository.findColumnItems(project, todo, false).stream()
                        .map(WorkItem::position))
                .containsExactly(0d, 1d);
    }

    @Test
    void finalReclassificationAndColumnTransferRollbackTogetherOnDatabaseFailure() {
        String id = create(owner, "State", todo, null);
        jdbcTemplate.execute(
                "CREATE TRIGGER reject_close BEFORE UPDATE ON work_item WHEN NEW.closed_at IS NOT NULL BEGIN SELECT RAISE(ABORT,'forced failure'); END");
        assertThatThrownBy(() -> projectService.reviseColumn(owner, workspace, project, todo, 0, "Final", null, true))
                .isInstanceOf(RuntimeException.class);
        assertThat(projectService.columns(owner, workspace, project).getFirst().finalColumn())
                .isFalse();
        assertThat(workItemQueryService.get(owner, workspace, project, id).closedAt())
                .isNull();
        jdbcTemplate.execute("DROP TRIGGER reject_close");
        projectService.reviseColumn(owner, workspace, project, todo, 0, "Final", null, true);
        assertThat(workItemQueryService.get(owner, workspace, project, id).closedAt())
                .isNotNull();
        jdbcTemplate.execute(
                "CREATE TRIGGER reject_move BEFORE UPDATE ON work_item WHEN NEW.board_column_id<>OLD.board_column_id BEGIN SELECT RAISE(ABORT,'forced failure'); END");
        assertThatThrownBy(() -> projectService.deleteColumn(owner, workspace, project, todo, 1, done))
                .isInstanceOf(RuntimeException.class);
        assertThat(projectService.columns(owner, workspace, project).stream()
                        .anyMatch(col -> col.id().equals(todo)))
                .isTrue();
        assertThat(workItemQueryService.get(owner, workspace, project, id).columnId())
                .isEqualTo(todo);
    }

    @Test
    void columnDeletionMovesArchivedTasksButDeletedTasksRestoreToBacklog() {
        String live = create(owner, "Live", todo, null);
        String archived = create(owner, "Archived", todo, null);
        String deleted = create(owner, "Deleted", todo, null);
        workItemService.archive(owner, workspace, project, archived, 0, true);
        workItemService.delete(owner, workspace, project, deleted, 0);
        projectService.deleteColumn(owner, workspace, project, todo, 0, done);
        assertThat(workItemQueryService.get(owner, workspace, project, live).columnId())
                .isEqualTo(done);
        assertThat(workItemQueryService.get(owner, workspace, project, archived).archivedAt())
                .isNotNull();
        assertThat(workItemQueryService.get(owner, workspace, project, archived).closedAt())
                .isNotNull();
        workItemService.restore(owner, workspace, project, deleted, 1);
        var restored = workItemQueryService.get(owner, workspace, project, deleted);
        assertThat(restored.columnId()).isNull();
        assertThat(restored.closedAt()).isNull();
        assertThatThrownBy(() -> projectService.deleteColumn(owner, workspace, project, done, 0, null))
                .hasMessageContaining("완료 컬럼");
    }

    @Test
    void archivedProjectsBlockAllTaskWritesAndPreserveIndividualStatesOnRestoration() {
        String id = create(owner, "Archive", todo, owner.userId());
        workItemService.archive(owner, workspace, project, id, 0, true);
        projectService.archive(owner, workspace, project, 0, true);
        assertThatThrownBy(() -> workItemService.archive(owner, workspace, project, id, 1, false))
                .hasMessageContaining("보관");
        assertThatThrownBy(() -> create(owner, "Blocked", todo, null)).hasMessageContaining("보관");
        assertThat(workItemQueryService
                        .list(owner, workspace, null, true, new WorkItemRequests.ListRequest())
                        .items())
                .isEmpty();
        projectService.archive(owner, workspace, project, 1, false);
        assertThat(workItemQueryService.get(owner, workspace, project, id).archivedAt())
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
                numbers.add(workItemQueryService
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
        assertThat(workItemQueryService.get(viewer, workspace, project, id).title())
                .isEqualTo("Member task");
        assertThatThrownBy(() -> create(viewer, "Forbidden", todo, null)).hasMessageContaining("권한");
        jdbcTemplate.update(
                "DELETE FROM workspace_member WHERE workspace_id=? AND iam_user_id=?", workspace, member.userId());
        assertThatThrownBy(() -> create(owner, "New assignment", todo, member.userId()))
                .hasMessageContaining("멤버");
        assertThat(workItemQueryService.get(owner, workspace, project, id).people())
                .extracting(WorkItemViews.Person::id)
                .containsExactly(member.userId());
        assertThatThrownBy(() -> workItemQueryService.get(member, workspace, project, id))
                .hasMessageContaining("찾을 수");
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle("Kept assignment");
        workItemService.revise(owner, workspace, project, id, update);
        assertThat(workItemQueryService.get(owner, workspace, project, id).people())
                .extracting(WorkItemViews.Person::id)
                .containsExactly(member.userId());
    }

    @Test
    void filtersAndPositionCursorsUseStableBoundariesAndMyTasksStayInTheWorkspace() {
        create(owner, "One", todo, owner.userId());
        create(owner, "Two", done, owner.userId());
        var request = new WorkItemRequests.ListRequest();
        request.setSize(1);
        request.setSort("position");
        request.setDirection("ASC");
        var page = workItemQueryService.list(owner, workspace, project, false, request);
        request.setCursor(page.nextCursor());
        var next = workItemQueryService.list(owner, workspace, project, false, request);
        assertThat(page.items()).hasSize(1);
        assertThat(next.items()).hasSize(1);
        assertThat(next.items().getFirst().id())
                .isNotEqualTo(page.items().getFirst().id());
        assertThat(next.nextCursor()).isNull();
        request.setQ("Other");
        assertThatThrownBy(() -> workItemQueryService.list(owner, workspace, project, false, request))
                .hasMessageContaining("요청");
        var filters = new WorkItemRequests.ListRequest();
        filters.setClosed(true);
        assertThat(workItemQueryService
                        .list(owner, workspace, project, false, filters)
                        .items())
                .hasSize(1);
        filters.setPriority(List.of("low,high,", "low"));
        assertThat(workItemQueryService
                        .list(owner, workspace, project, false, filters)
                        .items())
                .isEmpty();
        filters.setPriority(List.of("bad"));
        assertThatThrownBy(() -> workItemQueryService.list(owner, workspace, project, false, filters))
                .hasMessageContaining("요청");
        assertThat(workItemQueryService
                        .list(owner, workspace, null, true, new WorkItemRequests.ListRequest())
                        .items())
                .hasSize(2);
    }

    @Test
    void httpSupportsNullablePatchesBearerWritesAndRejectsForeignResourcesBeforeBinding() throws Exception {
        String password = "work item integration password phrase";
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
            String base = "/api/v1/workspaces/" + workspace + "/projects/" + project + "/work-items";
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
            String workItemId = JSON.readTree(get.body()).path("id").asText();
            var comment = http(
                    client,
                    "POST",
                    "/api/v1/workspaces/" + workspace + "/comments",
                    JSON.writeValueAsString(
                            Map.of("targetType", "work_item", "targetId", workItemId, "body", "**Agreed**")),
                    key);
            expect(comment, 201);
            String commentPath = comment.headers().firstValue("location").orElseThrow();
            expect(
                    http(client, "PATCH", commentPath, "{\"body\":\"Agreed, shipping\",\"expectedVersion\":0}", null),
                    204);
            var timeline = http(
                    client,
                    "GET",
                    "/api/v1/workspaces/" + workspace + "/timeline?targetType=work_item&targetId=" + workItemId,
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
            expect(http(client, "GET", "/api/v1/workspaces/" + workspace + "/work-items/by-ref/BIT-1", null, key), 200);
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
        workItemService.create(
                owner,
                workspace,
                project,
                new WorkItem.Details("High", null, WorkItem.Priority.high, null, null, null, null),
                todo);
        String archived = create(owner, "Archive", todo, null);
        workItemService.archive(owner, workspace, project, archived, 0, true);
        var request = new WorkItemRequests.ListRequest();
        request.setSize(1);
        assertThat(workItemQueryService
                        .list(owner, workspace, project, false, request)
                        .items())
                .hasSize(1);
        var counts = workItemQueryService.counts(owner, workspace, project, request);
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
        assertThat(workItemQueryService
                        .counts(owner, workspace, project, request)
                        .getFirst()
                        .count())
                .isEqualTo(1);
        request.setPriority(List.of());
        request.setArchived(true);
        assertThat(workItemQueryService
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
        String otherTask = workItemService.create(
                owner, otherWorkspace, otherProject, details("Other space", owner.userId()), null);
        assertThat(workItemQueryService
                        .list(owner, workspace, null, true, new WorkItemRequests.ListRequest())
                        .items())
                .hasSize(2);
        assertThat(workItemQueryService
                        .list(owner, otherWorkspace, null, true, new WorkItemRequests.ListRequest())
                        .items()
                        .getFirst()
                        .id())
                .isEqualTo(otherTask);
        var request = new WorkItemRequests.ListRequest();
        request.setSize(1);
        var page = workItemQueryService.list(owner, workspace, null, true, request);
        request.setCursor(page.nextCursor());
        assertThatThrownBy(() -> workItemQueryService.list(owner, otherWorkspace, null, true, request))
                .hasMessageContaining("요청");
        assertThatThrownBy(() -> workItemQueryService.get(owner, workspace, otherProject, otherTask))
                .hasMessageContaining("찾을 수");
        assertThat(workItemQueryService
                        .counts(owner, workspace, project, new WorkItemRequests.ListRequest())
                        .getFirst()
                        .count())
                .isEqualTo(2);
    }

    @Test
    void datePriorityTriggerAndAssignmentFiltersRoundTripAndNullablePatchesPreserveOtherValues() {
        var start = java.time.LocalDate.of(2026, 10, 22);
        var due = start.plusDays(3);
        var details = new WorkItem.Details(
                "Filtered", "body", WorkItem.Priority.high, WorkItem.TriggerType.finding, owner.userId(), start, due);
        String id = workItemService.create(owner, workspace, project, details, todo);
        var filter = new WorkItemRequests.ListRequest();
        filter.setPriority(List.of("high,low,"));
        filter.setTriggerType(List.of("finding"));
        filter.setPersonId(owner.userId());
        filter.setColumn(todo);
        filter.setFrom(start.plusDays(1));
        filter.setTo(due);
        filter.setQ("filter");
        var page = workItemQueryService.list(owner, workspace, project, false, filter);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().dueDate()).isEqualTo(due);
        filter.setFrom(due.plusDays(1));
        filter.setTo(due.plusDays(2));
        assertThat(workItemQueryService
                        .list(owner, workspace, project, false, filter)
                        .items())
                .isEmpty();
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(0L);
        update.setDescription(null);
        update.setPeopleIds(List.of());
        workItemService.revise(owner, workspace, project, id, update);
        var read = workItemQueryService.get(owner, workspace, project, id);
        assertThat(read.description()).isNull();
        assertThat(read.people()).isEmpty();
        assertThat(read.priority()).isEqualTo(WorkItem.Priority.high);
        update = new WorkItemRequests.Update();
        update.setExpectedVersion(1L);
        update.setDueDate(start.minusDays(1));
        final var invalid = update;
        assertThatThrownBy(() -> workItemService.revise(owner, workspace, project, id, invalid))
                .hasMessageContaining("마감일");
        assertThat(workItemQueryService.get(owner, workspace, project, id).dueDate())
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
                            workItemService.move(owner, workspace, project, id, 0, todo, null, null);
                            return true;
                        } catch (io.github.goraebap.bit.shared.error.BusinessException conflict) {
                            assertThat(conflict.errorCode().code())
                                    .isIn("PROJECT_COLUMN_NOT_FOUND", "WORK_ITEM_VERSION_CONFLICT");
                            return false;
                        }
                    });
            for (var result : executor.invokeAll(actions)) result.get();
        }
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM work_item w JOIN board_column c ON c.board_column_id=w.board_column_id WHERE w.deleted_at IS NULL AND c.deleted_at IS NOT NULL",
                        Integer.class))
                .isZero();
        assertThat(workItemQueryService.get(owner, workspace, project, id).columnId())
                .isIn(null, done);
    }

    @Test
    void adminsCanWriteButInstanceAdministrationDoesNotGrantWorkspaceDataAccess() {
        CurrentUser admin = participant("admin");
        membership(admin, "admin");
        String id = create(admin, "Admin task", todo, null);
        assertThat(workItemQueryService.get(admin, workspace, project, id).title())
                .isEqualTo("Admin task");
        CurrentUser outsider = identity("instance-admin", true);
        assertThatThrownBy(() -> workItemQueryService.get(outsider, workspace, project, id))
                .hasMessageContaining("찾을 수");
        assertThatThrownBy(() -> create(outsider, "No implicit access", todo, null))
                .hasMessageContaining("찾을 수");
        jdbcTemplate.update("UPDATE iam_password SET must_change=1 WHERE iam_user_id=?", owner.userId());
        assertThatThrownBy(() -> create(owner, "Stale principal", todo, null)).hasMessageContaining("권한");
        assertThatThrownBy(() -> workItemQueryService.get(owner, workspace, project, id))
                .hasMessageContaining("권한");
    }

    @Test
    void deletedListingIncludesArchivedTasksAndDeletedNumbersAreNeverReused() {
        String id = create(owner, "Deleted archive", todo, null);
        workItemService.archive(owner, workspace, project, id, 0, true);
        workItemService.delete(owner, workspace, project, id, 1);
        var filter = new WorkItemRequests.ListRequest();
        filter.setDeleted(true);
        var page = workItemQueryService.list(owner, workspace, project, false, filter);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().archivedAt()).isNotNull();
        String next = create(owner, "Next number", todo, null);
        assertThat(workItemQueryService.get(owner, workspace, project, next).number())
                .isEqualTo(2);
        workItemService.restore(owner, workspace, project, id, 2);
        assertThat(workItemQueryService.get(owner, workspace, project, id).archivedAt())
                .isNotNull();
        CurrentUser viewer = participant("viewer");
        membership(viewer, "viewer");
        assertThatThrownBy(() -> workItemQueryService.list(viewer, workspace, project, false, filter))
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

    @Test
    void eventsHaveTimesAndAttendeesAndStayOffTheBoardWhileTasksTakePeople() {
        CurrentUser member = identity("member", false);
        membership(member, "member");
        var startsAt = java.time.Instant.parse("2026-10-28T01:00:00Z");
        var meeting = new WorkItem.Details(
                "Weekly",
                null,
                null,
                null,
                java.util.Set.of(owner.userId(), member.userId()),
                null,
                null,
                startsAt,
                startsAt.plusSeconds(3600),
                false);
        // An event never takes a column, even when one is asked for.
        String event = workItemService.create(
                owner, workspace, project, WorkItem.Kind.event, meeting, todo, java.util.Set.of());
        var read = workItemQueryService.get(owner, workspace, project, event);
        assertThat(read.kind()).isEqualTo(WorkItem.Kind.event);
        assertThat(read.columnId()).isNull();
        assertThat(read.startsAt()).isEqualTo(startsAt);
        assertThat(read.people()).hasSize(2);
        // Times on a task, or dates on a timed event, are refused.
        var timedTask =
                new WorkItem.Details("Bad", null, null, null, java.util.Set.of(), null, null, startsAt, null, false);
        assertThatThrownBy(() -> workItemService.create(
                        owner, workspace, project, WorkItem.Kind.task, timedTask, todo, java.util.Set.of()))
                .hasMessageContaining("일정은");

        String task = workItemService.create(owner, workspace, project, details("Spec", member.userId()), todo);
        var mine = new WorkItemRequests.WorkspaceListRequest();
        assertThat(workItemQueryService
                        .listWorkspace(member, workspace, withPerson(mine, member.userId()))
                        .items())
                .extracting(WorkItemViews.Item::id)
                .containsExactlyInAnyOrder(event, task);
        var backlog = new WorkItemRequests.ListRequest();
        backlog.setCategory(List.of("none"));
        assertThat(workItemQueryService
                        .list(owner, workspace, project, false, backlog)
                        .items())
                .extracting(WorkItemViews.Item::id)
                .doesNotContain(event);
        var events = new WorkItemRequests.ListRequest();
        events.setKind(List.of("event"));
        events.setFrom(java.time.LocalDate.of(2026, 10, 28));
        events.setTo(java.time.LocalDate.of(2026, 10, 28));
        assertThat(workItemQueryService
                        .list(owner, workspace, project, false, events)
                        .items())
                .extracting(WorkItemViews.Item::id)
                .containsExactly(event);

        // A task that becomes an event leaves its column, keeping its days as an all-day event.
        var dated = new WorkItemRequests.Update();
        dated.setExpectedVersion(0L);
        dated.setStartDate(java.time.LocalDate.of(2026, 11, 2));
        workItemService.revise(owner, workspace, project, task, dated);
        var toEvent = new WorkItemRequests.Update();
        toEvent.setExpectedVersion(1L);
        toEvent.setKind(WorkItem.Kind.event);
        workItemService.revise(owner, workspace, project, task, toEvent);
        var changed = workItemQueryService.get(owner, workspace, project, task);
        assertThat(changed.kind()).isEqualTo(WorkItem.Kind.event);
        assertThat(changed.columnId()).isNull();
        assertThat(changed.allDay()).isTrue();
        assertThat(changed.startDate()).isEqualTo(java.time.LocalDate.of(2026, 11, 2));
        assertThat(changed.people()).extracting(WorkItemViews.Person::id).containsExactly(member.userId());
        assertThat(jdbcTemplate.queryForList(
                        "SELECT payload FROM activity WHERE target_type='work_item' AND target_id=?",
                        String.class,
                        task))
                .anySatisfy(payload -> assertThat(payload).contains("\"field\":\"kind\""));
    }

    @Test
    void aRepeatingEventIsMadeAheadEditsCarryToLaterOccurrencesAndCancellingEndsIt() throws Exception {
        var zone = java.time.ZoneId.of("Asia/Seoul");
        var today = java.time.LocalDate.now(zone);
        var monday = today.with(java.time.temporal.TemporalAdjusters.nextOrSame(java.time.DayOfWeek.MONDAY));
        var startsAt = java.time.ZonedDateTime.of(monday, java.time.LocalTime.of(10, 0), zone)
                .toInstant();
        var meeting = new WorkItem.Details(
                "Weekly",
                "Agenda",
                null,
                null,
                java.util.Set.of(owner.userId()),
                null,
                null,
                startsAt,
                startsAt.plusSeconds(3600),
                false);
        String first = workItemService.create(
                owner, workspace, project, WorkItem.Kind.event, meeting, null, java.util.Set.of());
        String password = "work item integration password phrase";
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
            String base = "/api/v1/workspaces/" + workspace + "/projects/" + project + "/work-items/";
            expect(
                    http(
                            client,
                            "PUT",
                            base + first + "/recurrence",
                            "{\"expectedVersion\":0,\"frequency\":\"weekly\",\"timeZone\":\"Asia/Seoul\"}",
                            null),
                    204);

            // Every Monday up to eight weeks ahead is its own event, each at 10:00 in Seoul with the same people.
            var series = occurrences();
            assertThat(series).hasSize(1 + (monday.equals(today) ? 8 : 7));
            assertThat(series.getFirst().id()).isEqualTo(first);
            var second = series.get(1);
            assertThat(second.occurrenceOn()).isEqualTo(monday.plusWeeks(1));
            assertThat(second.startsAt()).isEqualTo(startsAt.plus(java.time.Duration.ofDays(7)));
            assertThat(second.title()).isEqualTo("Weekly");
            assertThat(second.description()).isEqualTo("Agenda");
            assertThat(second.people()).extracting(WorkItemViews.Person::id).containsExactly(owner.userId());
            assertThat(second.recurrence().weekdays()).containsExactly(java.time.DayOfWeek.MONDAY);
            assertThat(second.createdByAgent()).isEqualTo("반복");
            var ruleId = second.recurrence().id();
            // The job finds nothing more to make until the days move on.
            recurrenceService.materialize(ruleId);
            assertThat(occurrences()).hasSize(series.size());

            // From the second on: a new title and time reach every later one; a new description only the second.
            var elevenOnSecond = java.time.ZonedDateTime.of(monday.plusWeeks(1), java.time.LocalTime.of(11, 0), zone)
                    .toInstant();
            expect(
                    http(
                            client,
                            "PATCH",
                            base + second.id() + "?scope=following",
                            JSON.writeValueAsString(Map.of(
                                    "expectedVersion",
                                    second.version(),
                                    "title",
                                    "Weekly sync",
                                    "description",
                                    "New agenda",
                                    "startsAt",
                                    elevenOnSecond.toString(),
                                    "endsAt",
                                    elevenOnSecond.plusSeconds(1800).toString())),
                            null),
                    204);
            var edited = occurrences();
            assertThat(edited.getFirst().title()).isEqualTo("Weekly");
            assertThat(edited.get(1).description()).isEqualTo("New agenda");
            assertThat(edited.get(2).title()).isEqualTo("Weekly sync");
            assertThat(edited.get(2).description()).isEqualTo("Agenda");
            assertThat(edited.get(2).startsAt())
                    .isEqualTo(java.time.ZonedDateTime.of(monday.plusWeeks(2), java.time.LocalTime.of(11, 0), zone)
                            .toInstant());
            assertThat(edited.get(2).endsAt())
                    .isEqualTo(edited.get(2).startsAt().plusSeconds(1800));
            assertThat(edited.getFirst().startsAt()).isEqualTo(startsAt);

            // Cancelling after the fourth deletes the later ones and ends the rule on its day.
            var fourth = edited.get(3);
            expect(
                    http(
                            client,
                            "DELETE",
                            base + fourth.id() + "/recurrence?expectedVersion=" + fourth.version(),
                            null,
                            null),
                    204);
            var left = occurrences();
            assertThat(left).hasSize(4);
            assertThat(left.getLast().recurrence().untilOn()).isEqualTo(fourth.occurrenceOn());
            recurrenceService.materialize(ruleId);
            assertThat(occurrences()).hasSize(4);
        }
    }

    @Test
    void aRepeatingTaskHasOnlyItsNextOccurrenceInItsColumn() {
        var today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        var report = new WorkItem.Details(
                "Daily report", null, null, null, java.util.Set.of(owner.userId()), today, null, null, null, false);
        String first =
                workItemService.create(owner, workspace, project, WorkItem.Kind.task, report, todo, java.util.Set.of());
        recurrenceService.repeat(
                owner,
                workspace,
                project,
                first,
                new WorkItemRequests.Repeat(
                        0L,
                        io.github.goraebap.bit.module.workitem.domain.Recurrence.Frequency.daily,
                        null,
                        null,
                        null,
                        "Asia/Seoul"));
        var series = occurrences();
        assertThat(series).hasSize(2);
        assertThat(series.get(1).startDate()).isEqualTo(today.plusDays(1));
        assertThat(series.get(1).columnId()).isEqualTo(todo);
        assertThat(series.get(1).people()).extracting(WorkItemViews.Person::id).containsExactly(owner.userId());
        recurrenceService.materialize(series.get(1).recurrence().id());
        assertThat(occurrences()).hasSize(2);
        // A work item that does not repeat has nothing to cancel.
        String single = create(owner, "Single", todo, null);
        assertThatThrownBy(() -> recurrenceService.stop(owner, workspace, project, single, 0))
                .hasMessageContaining("반복");
    }

    @Test
    void peopleHearWhenPutOnAWorkItemCommentedOnOrMovedButNeverOfTheirOwnChange() {
        CurrentUser member = identity("member", false);
        membership(member, "member");
        String task = workItemService.create(owner, workspace, project, details("Spec", member.userId()), todo);
        assertThat(notices(member))
                .extracting(NotificationViews.Notice::type)
                .containsExactly(Notification.Type.assigned);
        assertThat(notices(member).getFirst().body()).contains("owner").contains("담당자로 지정");
        assertThat(notices(member).getFirst().title()).isEqualTo("BIT-1 Spec");
        assertThat(notices(owner)).isEmpty();

        // A comment reaches the people on it and whoever made it, never the one who wrote it.
        commentService.create(
                member, workspace, io.github.goraebap.bit.module.link.TargetType.work_item, task, "Done?");
        assertThat(notices(owner))
                .extracting(NotificationViews.Notice::type)
                .containsExactly(Notification.Type.commented);
        assertThat(notices(member)).hasSize(1);

        var startsAt = Instant.now().plusSeconds(86_400).truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        var meeting = new WorkItem.Details(
                "Sync", null, null, null, java.util.Set.of(member.userId()), null, null, startsAt, null, false);
        String event = workItemService.create(
                owner, workspace, project, WorkItem.Kind.event, meeting, null, java.util.Set.of(), 10);
        assertThat(workItemQueryService.get(owner, workspace, project, event).reminderMinutes())
                .isEqualTo(10);
        var moved = new WorkItemRequests.Update();
        moved.setExpectedVersion(0L);
        moved.setStartsAt(startsAt.plusSeconds(3600));
        workItemService.revise(owner, workspace, project, event, moved);
        assertThat(notices(member))
                .extracting(NotificationViews.Notice::type)
                .containsExactly(Notification.Type.rescheduled, Notification.Type.invited, Notification.Type.assigned);
        // A task has no reminder, whatever is asked.
        var toTask = new WorkItemRequests.Update();
        toTask.setExpectedVersion(1L);
        toTask.setKind(WorkItem.Kind.task);
        workItemService.revise(owner, workspace, project, event, toTask);
        assertThat(workItemQueryService.get(owner, workspace, project, event).reminderMinutes())
                .isNull();

        assertThat(notificationService.unread(member, workspace)).isEqualTo(3);
        notificationService.read(member, workspace, notices(member).getLast().id());
        assertThat(notificationService.unread(member, workspace)).isEqualTo(2);
        assertThatThrownBy(() -> notificationService.read(
                        owner, workspace, notices(member).getFirst().id()))
                .hasMessageContaining("알림");
        notificationService.readAll(member, workspace);
        assertThat(notificationService.unread(member, workspace)).isZero();
        // Without mail set up nothing is sent, and the inbox keeps them all.
        notificationService.mailPending();
        assertThat(notices(member)).hasSize(3);
    }

    @Test
    void remindersAndDueDaysAreToldOnceEachHoweverOftenTheJobsRun() {
        CurrentUser member = identity("member", false);
        membership(member, "member");
        var soon = Instant.now().plusSeconds(300);
        var later = Instant.now().plusSeconds(7200);
        for (var at : List.of(soon, later))
            workItemService.create(
                    owner,
                    workspace,
                    project,
                    WorkItem.Kind.event,
                    new WorkItem.Details(
                            "Standup " + at,
                            null,
                            null,
                            null,
                            java.util.Set.of(member.userId()),
                            null,
                            null,
                            at,
                            null,
                            false),
                    null,
                    java.util.Set.of(),
                    10);
        var today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        workItemService.create(
                owner,
                workspace,
                project,
                new WorkItem.Details("Report", null, null, null, member.userId(), null, today),
                todo);
        notificationService.readAll(member, workspace);
        notificationService.remind();
        notificationService.remind();
        notificationService.dueToday();
        notificationService.dueToday();
        var told = notificationService.list(member, workspace, true, null, 30).items();
        assertThat(told)
                .extracting(NotificationViews.Notice::type)
                .containsExactlyInAnyOrder(Notification.Type.event_reminder, Notification.Type.due_today);
        assertThat(told)
                .filteredOn(n -> n.type() == Notification.Type.event_reminder)
                .singleElement()
                .satisfies(n -> assertThat(n.body()).contains("에 시작합니다"));
    }

    private List<NotificationViews.Notice> notices(CurrentUser actor) {
        return notificationService.list(actor, workspace, false, null, 30).items();
    }

    /** The project's live occurrences, in day order. */
    private List<WorkItemViews.Item> occurrences() {
        return jdbcTemplate
                .queryForList(
                        "SELECT work_item_id FROM work_item WHERE recurrence_id IS NOT NULL AND deleted_at IS NULL"
                                + " ORDER BY occurrence_on",
                        String.class)
                .stream()
                .map(id -> workItemQueryService.get(owner, workspace, project, id))
                .toList();
    }

    private static WorkItemRequests.WorkspaceListRequest withPerson(
            WorkItemRequests.WorkspaceListRequest request, String personId) {
        request.setPersonId(personId);
        return request;
    }

    private String create(CurrentUser actor, String title, String column, String assignee) {
        return workItemService.create(actor, workspace, project, details(title, assignee), column);
    }

    private static WorkItem.Details details(String title, String assignee) {
        return new WorkItem.Details(title, null, null, null, assignee, null, null);
    }

    private boolean edit(String id, String title) {
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle(title);
        try {
            workItemService.revise(owner, workspace, project, id, update);
            return true;
        } catch (io.github.goraebap.bit.shared.error.BusinessException conflict) {
            assertThat(conflict.errorCode().code()).isEqualTo("WORK_ITEM_VERSION_CONFLICT");
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
