package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.project.application.ProjectQueryService;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.project.application.ProjectViews;
import io.github.goraebap.bit.module.project.domain.ProjectRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
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
import java.util.List;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false",
            "app.auth.secret=project-test-secret-at-least-32-characters",
            "app.auth.cookie-secure=false",
            "app.auth.allowed-origins=http://localhost:8080"
        })
class ProjectPersistenceIntegrationTest {
    @Autowired
    private ProjectQueryService projectQueryService;

    @LocalServerPort
    private int port;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    private ProjectService projectService;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private WorkspaceFacade workspaceFacade;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private String workspace;
    private CurrentUser actor;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/project-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        jdbcTemplate.execute("DROP TRIGGER IF EXISTS reject_final_column");
        for (String table : List.of(
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
        String user = Ids.newId();
        String credential = Ids.newId();
        workspace = Ids.newId();
        Instant now = Instant.now();
        String time = InstantTextBinding.text(now);
        jdbcTemplate.update(
                "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                user,
                "project@example.test",
                "Project owner",
                time,
                time);
        jdbcTemplate.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES (?,?,?)",
                user,
                "fixture-hash",
                time);
        jdbcTemplate.update(
                "INSERT INTO iam_session(iam_session_id,iam_user_id,token_hash,expires_at,absolute_expires_at,last_seen_at,created_at) VALUES (?,?,?,?,?,?,?)",
                credential,
                user,
                "fixture-session-hash",
                InstantTextBinding.text(now.plusSeconds(3600)),
                InstantTextBinding.text(now.plusSeconds(7200)),
                time,
                time);
        jdbcTemplate.update(
                "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                workspace,
                "Workspace",
                "project-test",
                time,
                user,
                time,
                user);
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                Ids.newId(),
                workspace,
                user,
                "owner",
                time);
        actor = new CurrentUser(user, false, CurrentUser.Method.SESSION, credential, null, false);
    }

    @Test
    void theMakerBelongsToANewProjectAndMembersComeAndGoOnlyFromTheWorkspace() {
        String project = projectService.create(actor, workspace, "Members", "PM", null);
        assertThat(projectService.memberships(actor, workspace).items())
                .extracting(ProjectViews.Membership::projectId, ProjectViews.Membership::userId)
                .contains(org.assertj.core.groups.Tuple.tuple(project, actor.userId()));
        projectService.removeMember(actor, workspace, project, actor.userId());
        assertThat(projectService.memberships(actor, workspace).items())
                .noneMatch(row -> row.projectId().equals(project));
        projectService.addMember(actor, workspace, project, actor.userId());
        projectService.addMember(actor, workspace, project, actor.userId());
        assertThat(projectService.memberships(actor, workspace).items())
                .filteredOn(row -> row.projectId().equals(project))
                .hasSize(1);
        assertThatThrownBy(() -> projectService.addMember(actor, workspace, project, Ids.newId()))
                .hasMessageContaining("워크스페이스 구성원만");
    }

    @Test
    void markIsStoredAndAPatchChangesOnlyThePartItNames() {
        String marked = projectService.create(actor, workspace, "Marked", "MK", null, "rocket", "#5e6ad2");
        assertThat(projectQueryService.get(actor, workspace, marked).icon()).isEqualTo("rocket");
        projectService.revise(
                actor, workspace, marked, 0, null, false, null, false, null, false, null, false, "#26b5ce", true);
        var revised = projectQueryService.get(actor, workspace, marked);
        assertThat(revised.icon()).isEqualTo("rocket");
        assertThat(revised.color()).isEqualTo("#26b5ce");
    }

    @Test
    void realRepositoryRoundTripsAuditAndKeepsAliasesAfterRenameArchiveAndRestore() {
        String id = projectService.create(actor, workspace, "Project", " bit ", "body");
        var created = projectRepository.findById(workspace, id, false).orElseThrow();
        assertThat(created.audit().createdBy()).isEqualTo(actor.userId());
        assertThat(created.audit().createdAt()).isNotNull();
        assertThat(projectService.columns(actor, workspace, id)).hasSize(4);
        assertThat(projectService.columns(actor, workspace, id).stream()
                        .filter(c -> c.finalColumn())
                        .count())
                .isEqualTo(1);
        assertThat(created.icon()).isNull();
        projectService.revise(actor, workspace, id, 0, null, false, "NEW", true, null, false);
        assertThat(projectService.findByKey(actor, workspace, "BIT").id()).isEqualTo(id);
        assertThat(projectService.findByKey(actor, workspace, "NEW").key()).isEqualTo("NEW");
        projectService.revise(actor, workspace, id, 1, null, false, "BIT", true, null, false);
        assertThat(projectRepository.currentKey(id)).isEqualTo("BIT");
        projectService.revise(actor, workspace, id, 2, null, false, "BIT", true, null, false);
        assertThat(projectService.requireAccess(actor, workspace, id, false).version())
                .isEqualTo(2);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM project_key", Integer.class))
                .isEqualTo(2);
        projectService.archive(actor, workspace, id, 2, true);
        assertThatThrownBy(() -> projectService.allocateIssueNumber(actor, workspace, id))
                .hasMessageContaining("보관");
        projectService.delete(actor, workspace, id, 3);
        assertThatThrownBy(() -> projectService.findByKey(actor, workspace, "NEW"))
                .hasMessageContaining("찾을 수");
        projectService.restore(actor, workspace, id, 4);
        assertThat(projectService.requireAccess(actor, workspace, id, false).archived())
                .isTrue();
        assertThatThrownBy(() -> projectService.create(actor, workspace, "Other", "NEW", null))
                .hasMessageContaining("프로젝트 키");
        assertThat(projectRepository.findById(Ids.newId(), id, false)).isEmpty();
    }

    @Test
    void columnFailureRollsBackProjectAndKeyTogether() {
        jdbcTemplate.execute(
                "CREATE TRIGGER reject_final_column BEFORE INSERT ON board_column WHEN NEW.is_final=1 BEGIN SELECT RAISE(ABORT,'forced failure'); END");
        assertThatThrownBy(() -> projectService.create(actor, workspace, "Atomic", "FAIL", null))
                .isInstanceOf(RuntimeException.class);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM project", Integer.class))
                .isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM project_key", Integer.class))
                .isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM board_column", Integer.class))
                .isZero();
    }

    @Test
    void parallelNumberAllocationIsUniqueAndOuterFailureRollsBackTheCounter() throws Exception {
        String id = projectService.create(actor, workspace, "Concurrent", "SEQ", null);
        try (var executor = Executors.newFixedThreadPool(4)) {
            var tasks = java.util.stream.IntStream.range(0, 8)
                    .<java.util.concurrent.Callable<Long>>mapToObj(
                            i -> () -> projectService.allocateIssueNumber(actor, workspace, id))
                    .toList();
            var results = executor.invokeAll(tasks);
            var numbers = new java.util.HashSet<Long>();
            for (var result : results) numbers.add(result.get());
            assertThat(numbers).containsExactlyInAnyOrder(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);
        }
        assertThatThrownBy(() -> new TransactionTemplate(transactionManager).execute(status -> {
                    projectService.allocateIssueNumber(actor, workspace, id);
                    throw new IllegalStateException("forced failure");
                }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(projectService.allocateIssueNumber(actor, workspace, id)).isEqualTo(9);
    }

    @Test
    void currentRoleIsRecheckedForWorkWritesAndSettingsAreSeparate() {
        String id = projectService.create(actor, workspace, "Roles", "ROLE", null);
        jdbcTemplate.update("UPDATE workspace_member SET role='member' WHERE workspace_id=?", workspace);
        assertThat(projectService.allocateIssueNumber(actor, workspace, id)).isEqualTo(1);
        assertThatThrownBy(() -> projectService.create(actor, workspace, "Forbidden", "NO", null))
                .hasMessageContaining("권한");
        jdbcTemplate.update("UPDATE workspace_member SET role='viewer' WHERE workspace_id=?", workspace);
        assertThatThrownBy(() -> projectService.allocateIssueNumber(actor, workspace, id))
                .hasMessageContaining("권한");
        assertThat(workspaceFacade.hasMember(actor, workspace, actor.userId())).isTrue();
        jdbcTemplate.update("DELETE FROM workspace_member WHERE workspace_id=?", workspace);
        assertThatThrownBy(() -> projectService.requireAccess(actor, workspace, id, false))
                .hasMessageContaining("찾을 수");
    }

    @Test
    void actualHttpChecksRolesBeforeBindingAndKeepsSessionAndBearerProjectRightsAligned() throws Exception {
        String password = "project integration test password";
        jdbcTemplate.update("UPDATE iam_password SET password_hash=?", passwordEncoder.encode(password));
        try (var client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build()) {
            assertThat(http(
                                    client,
                                    "POST",
                                    "/api/v1/auth/sessions",
                                    JSON.writeValueAsString(
                                            java.util.Map.of("email", "project@example.test", "password", password)),
                                    null)
                            .statusCode())
                    .isEqualTo(201);
            String projects = "/api/v1/workspaces/" + workspace + "/projects";
            var created = http(client, "POST", projects, "{\"name\":\"HTTP\",\"key\":\"HTTP\"}", null);
            assertThat(created.statusCode()).as(created.body()).isEqualTo(201);
            String path = created.headers().firstValue("location").orElseThrow();
            var detail = http(client, "GET", path, null, null);
            assertThat(detail.statusCode()).isEqualTo(200);
            assertThat(http(client, "POST", path + "/columns/reorder", "{\"expectedVersion\":0,\"order\":null}", null)
                            .statusCode())
                    .isEqualTo(400);
            assertThat(JSON.readTree(detail.body()).path("key").asText()).isEqualTo("HTTP");
            assertThat(http(client, "PATCH", path, "{\"expectedVersion\":0,\"description\":null}", null)
                            .statusCode())
                    .isEqualTo(204);
            assertThat(http(client, "PATCH", path, "{\"expectedVersion\":0,\"name\":\"Stale\"}", null)
                            .statusCode())
                    .isEqualTo(409);
            var keyResponse = http(
                    client,
                    "POST",
                    "/api/v1/me/api-keys",
                    JSON.writeValueAsString(java.util.Map.of(
                            "name", "Project HTTP", "agentName", "project-http", "currentPassword", password)),
                    null);
            assertThat(keyResponse.statusCode()).as(keyResponse.body()).isEqualTo(201);
            String key = JSON.readTree(keyResponse.body()).path("key").asText();
            var agentCreated = http(client, "POST", projects, "{\"name\":\"Agent\",\"key\":\"AGENT\"}", key);
            assertThat(agentCreated.statusCode()).as(agentCreated.body()).isEqualTo(201);
            var agentDetail = http(
                    client, "GET", agentCreated.headers().firstValue("location").orElseThrow(), null, key);
            assertThat(JSON.readTree(agentDetail.body()).path("createdByAgent").asText())
                    .isEqualTo("project-http");
            jdbcTemplate.update("UPDATE workspace_member SET role='viewer' WHERE workspace_id=?", workspace);
            assertThat(http(client, "POST", projects, "invalid JSON", null).statusCode())
                    .isEqualTo(403);
            assertThat(http(client, "POST", projects, "invalid JSON", key).statusCode())
                    .isEqualTo(403);
            assertThat(http(client, "PATCH", path, "invalid JSON", null).statusCode())
                    .isEqualTo(403);
            assertThat(http(client, "GET", projects, null, key).statusCode()).isEqualTo(200);
            assertThat(http(client, "GET", projects + "?status=deleted", null, key)
                            .statusCode())
                    .isEqualTo(403);
            jdbcTemplate.update("DELETE FROM workspace_member WHERE workspace_id=?", workspace);
            assertThat(http(client, "PATCH", path, "invalid JSON", null).statusCode())
                    .isEqualTo(404);
        }
    }

    @Test
    void theWorkspacesProjectOrderIsSetWholeAndReadAPageAtATime() {
        String a = projectService.create(actor, workspace, "Project A", "PA", null);
        String b = projectService.create(actor, workspace, "Project B", "PB", null);
        String c = projectService.create(actor, workspace, "Project C", "PC", null);
        var created = projectQueryService.list(actor, workspace, "active", "", null, 50, "position", "ASC");
        assertThat(created.items()).extracting(ProjectViews.ProjectInfo::id).containsExactly(a, b, c);
        projectService.reorder(actor, workspace, List.of(c, a, b));
        var first = projectQueryService.list(actor, workspace, "active", "", null, 2, "position", "ASC");
        assertThat(first.items()).extracting(ProjectViews.ProjectInfo::id).containsExactly(c, a);
        var rest = projectQueryService.list(actor, workspace, "active", "", first.nextCursor(), 2, "position", "ASC");
        assertThat(rest.items()).extracting(ProjectViews.ProjectInfo::id).containsExactly(b);
        assertThat(rest.nextCursor()).isNull();
        // The order is not an edit: a project's version stays, so nobody's open edit conflicts with it.
        assertThat(projectQueryService.get(actor, workspace, a).version()).isZero();
        assertThatThrownBy(() -> projectService.reorder(actor, workspace, List.of(c, a)))
                .hasMessageContaining("요청");
        assertThatThrownBy(() -> projectService.reorder(actor, workspace, List.of(c, a, a)))
                .hasMessageContaining("요청");
        assertThatThrownBy(() -> projectQueryService.list(
                        actor, workspace, "active", "", first.nextCursor(), 2, "createdAt", "DESC"))
                .hasMessageContaining("요청");
    }

    @Test
    void projectCursorIsBoundToTheSearchAndHidesDeletedRowsByDefault() {
        String first = projectService.create(actor, workspace, "Project A", "PA", null);
        projectService.create(actor, workspace, "Project B", "PB", null);
        var page = projectQueryService.list(actor, workspace, "active", "Project", null, 1, "createdAt", "DESC");
        assertThat(page.items()).hasSize(1);
        assertThat(page.nextCursor()).isNotNull();
        var next = projectQueryService.list(
                actor, workspace, "active", "Project", page.nextCursor(), 1, "createdAt", "DESC");
        assertThat(next.items()).hasSize(1);
        assertThat(next.items().getFirst().id())
                .isNotEqualTo(page.items().getFirst().id());
        assertThat(next.nextCursor()).isNull();
        assertThatThrownBy(() -> projectQueryService.list(
                        actor, workspace, "active", "Other", page.nextCursor(), 1, "createdAt", "DESC"))
                .hasMessageContaining("요청");
        projectService.delete(actor, workspace, first, 0);
        assertThat(projectQueryService
                        .list(actor, workspace, "active", "", null, 50, "createdAt", "DESC")
                        .items())
                .hasSize(1);
        var deleted = projectQueryService.list(actor, workspace, "deleted", "", null, 50, "createdAt", "DESC");
        assertThat(deleted.items()).hasSize(1);
        assertThat(deleted.items().getFirst().deletedAt()).isNotNull();
    }

    private HttpResponse<String> http(HttpClient client, String method, String path, String content, String key)
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
        if (content != null) request.header("Content-Type", "application/json");
        return client.send(
                request.method(
                                method,
                                content == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(content))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }
}
