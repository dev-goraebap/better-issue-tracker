package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import io.github.goraebap.bit.module.label.application.LabelRequests;
import io.github.goraebap.bit.module.label.application.LabelService;
import io.github.goraebap.bit.module.label.application.LabelViews;
import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.project.application.ProjectRequests;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.workitem.application.WorkItemQueryService;
import io.github.goraebap.bit.module.workitem.application.WorkItemRequests;
import io.github.goraebap.bit.module.workitem.application.WorkItemService;
import io.github.goraebap.bit.module.workitem.application.WorkItemViews;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workspace.application.WorkspaceService;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.BusinessException;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
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
            "app.secrets.generate=false", "app.auth.secret=label-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false", "app.auth.allowed-origins=http://localhost:8080"
        })
class LabelIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @LocalServerPort
    private int port;

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private LabelService labelService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private WorkItemService workItemService;

    @Autowired
    private WorkItemQueryService workItemQueryService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private CurrentUser owner;
    private String workspace;
    private String decision;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/label-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        for (String table : List.of(
                "activity",
                "work_item_label",
                "work_item",
                "board_column",
                "project_member",
                "project_key",
                "project",
                "work_item_view_tweak",
                "work_item_view",
                "label",
                "workspace_invitation",
                "workspace_member",
                "workspace",
                "iam_api_key",
                "iam_session",
                "iam_password",
                "iam_user")) jdbcTemplate.update("DELETE FROM " + table);
        owner = identity("owner");
        workspace = workspaceService.create(owner, "Labels", "labels-" + Ids.newId());
        decision = labelService.list(owner, workspace).getFirst().id();
    }

    @Test
    void newWorkspacesGetTheDecisionLabelFirstAndItKeepsItsNameAndExistence() {
        var labels = labelService.list(owner, workspace);
        assertThat(labels).hasSize(1);
        var system = labels.getFirst();
        assertThat(system.name()).isEqualTo("결정기록");
        assertThat(system.system()).isTrue();
        assertThat(system.systemKey()).isEqualTo("decision");
        String zebra = labelService.create(owner, workspace, "zebra", "#112233");
        String alpha = labelService.create(owner, workspace, " Alpha ", "#AABBCC");
        assertThat(labelService.list(owner, workspace).stream().map(LabelViews.Item::id))
                .containsExactly(decision, alpha, zebra);
        var read = labelService.get(owner, workspace, alpha);
        assertThat(read.name()).isEqualTo("Alpha");
        assertThat(read.color()).isEqualTo("#aabbcc");
        assertThat(code(() -> labelService.create(owner, workspace, "ALPHA", "#000000")))
                .isEqualTo("LABEL_NAME_CONFLICT");
        assertThat(code(() -> labelService.create(owner, workspace, "결정기록", "#000000")))
                .isEqualTo("LABEL_NAME_CONFLICT");
        assertThat(code(() -> labelService.revise(owner, workspace, decision, update(0, "결정", null))))
                .isEqualTo("LABEL_SYSTEM_LOCKED");
        assertThat(code(() -> labelService.delete(owner, workspace, decision, 0)))
                .isEqualTo("LABEL_SYSTEM_LOCKED");
        labelService.revise(owner, workspace, decision, update(0, "결정기록", "#ff0000"));
        assertThat(labelService.get(owner, workspace, decision).color()).isEqualTo("#ff0000");
        assertThat(code(() -> labelService.revise(owner, workspace, zebra, update(0, "alpha", null))))
                .isEqualTo("LABEL_NAME_CONFLICT");
        assertThat(code(() -> labelService.revise(owner, workspace, zebra, update(5, "Zed", null))))
                .isEqualTo("LABEL_VERSION_CONFLICT");
        labelService.delete(owner, workspace, alpha, 0);
        assertThat(code(() -> labelService.get(owner, workspace, alpha))).isEqualTo("LABEL_NOT_FOUND");
        // A deleted label's name is free again.
        labelService.create(owner, workspace, "Alpha", "#010203");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM label WHERE workspace_id=? AND system_key='decision'",
                        Integer.class,
                        workspace))
                .isEqualTo(1);
    }

    @Test
    void membersWriteViewersReadAndOutsidersSeeNothingOverHttp() throws Exception {
        CurrentUser member = identity("member");
        membership(member, "member");
        CurrentUser viewer = identity("viewer");
        membership(viewer, "viewer");
        CurrentUser outsider = identity("outsider");
        String label = labelService.create(member, workspace, "Bug", "#cc0000");
        assertThat(labelService.list(viewer, workspace)).hasSize(2);
        assertThat(code(() -> labelService.create(viewer, workspace, "No", "#000000")))
                .isEqualTo("AUTH_FORBIDDEN");
        assertThat(code(() -> labelService.list(outsider, workspace))).isEqualTo("WORKSPACE_NOT_FOUND");
        String base = "/api/v1/workspaces/" + workspace + "/labels";
        try (var client = login(viewer)) {
            expect(http(client, "GET", base, null), 200);
            expect(http(client, "POST", base, "bad JSON", null), 403);
            expect(http(client, "PATCH", base + "/" + label, "bad JSON", null), 403);
            expect(http(client, "DELETE", base + "/" + label + "?expectedVersion=0", null), 403);
        }
        try (var client = login(outsider)) {
            expect(http(client, "GET", base, null), 404);
            expect(http(client, "POST", base, "bad JSON", null), 404);
        }
        try (var client = login(member)) {
            var created = http(client, "POST", base, "{\"name\":\"Feature\",\"color\":\"#00aa00\"}", null);
            expect(created, 201);
            String location = created.headers().firstValue("location").orElseThrow();
            var read = JSON.readTree(http(client, "GET", location, null).body());
            assertThat(read.path("name").asText()).isEqualTo("Feature");
            assertThat(read.path("system").asBoolean()).isFalse();
            expect(http(client, "PATCH", location, "{\"expectedVersion\":0,\"color\":\"#00bb00\"}", null), 204);
            expect(http(client, "PATCH", location, "{\"expectedVersion\":1,\"color\":null}", null), 400);
            expect(http(client, "POST", base, "{\"name\":\"Bad\",\"color\":\"red\"}", null), 400);
            var locked = http(client, "PATCH", base + "/" + decision, "{\"expectedVersion\":0,\"name\":\"X\"}", null);
            expect(locked, 409);
            assertThat(JSON.readTree(locked.body()).path("code").asText()).isEqualTo("LABEL_SYSTEM_LOCKED");
            expect(http(client, "DELETE", base + "/" + decision + "?expectedVersion=0", null), 409);
            expect(http(client, "DELETE", location + "?expectedVersion=1", null), 204);
            expect(http(client, "GET", location, null), 404);
            expect(http(client, "PATCH", base + "/" + Ids.newId(), "bad JSON", null), 404);
        }
    }

    @Test
    void workItemLabelsAreValidatedReplacedClearedAndHideDeletedLabels() throws Exception {
        String project = projectService.create(owner, workspace, "Project", "LB", null);
        String bug = labelService.create(owner, workspace, "bug", "#cc0000");
        String api = labelService.create(owner, workspace, "API", "#0000cc");
        String other = workspaceService.create(owner, "Other", "other-" + Ids.newId());
        String foreign = labelService.create(owner, other, "Foreign", "#123456");
        String id = workItemService.create(
                owner, workspace, project, details("Labelled"), null, Set.of(bug, decision, api));
        assertThat(labels(workItemQueryService.get(owner, workspace, project, id)))
                .containsExactly(decision, api, bug);
        assertThat(workItemQueryService
                        .get(owner, workspace, project, id)
                        .labels()
                        .getFirst()
                        .system())
                .isTrue();
        assertThat(code(() -> workItemService.create(owner, workspace, project, details("X"), null, Set.of(foreign))))
                .isEqualTo("WORK_ITEM_LABEL_INVALID");
        assertThat(code(() ->
                        workItemService.create(owner, workspace, project, details("X"), null, Set.of(Ids.newId()))))
                .isEqualTo("WORK_ITEM_LABEL_INVALID");

        var keep = new WorkItemRequests.Update();
        keep.setExpectedVersion(0L);
        keep.setTitle("Renamed");
        workItemService.revise(owner, workspace, project, id, keep);
        var kept = workItemQueryService.get(owner, workspace, project, id);
        assertThat(labels(kept)).containsExactly(decision, api, bug);
        var replace = new WorkItemRequests.Update();
        replace.setExpectedVersion(kept.version());
        replace.setLabelIds(List.of(bug));
        workItemService.revise(owner, workspace, project, id, replace);
        var replaced = workItemQueryService.get(owner, workspace, project, id);
        assertThat(labels(replaced)).containsExactly(bug);
        assertThat(replaced.version()).isEqualTo(kept.version() + 1);
        var same = new WorkItemRequests.Update();
        same.setExpectedVersion(replaced.version());
        same.setLabelIds(List.of(bug, bug));
        workItemService.revise(owner, workspace, project, id, same);
        assertThat(workItemQueryService.get(owner, workspace, project, id).version())
                .isEqualTo(replaced.version());
        var cross = new WorkItemRequests.Update();
        cross.setExpectedVersion(replaced.version());
        cross.setLabelIds(List.of(bug, foreign));
        assertThat(code(() -> workItemService.revise(owner, workspace, project, id, cross)))
                .isEqualTo("WORK_ITEM_LABEL_INVALID");
        var clear = new WorkItemRequests.Update();
        clear.setExpectedVersion(replaced.version());
        clear.setLabelIds(List.of());
        workItemService.revise(owner, workspace, project, id, clear);
        assertThat(workItemQueryService.get(owner, workspace, project, id).labels())
                .isEmpty();
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM work_item_label WHERE work_item_id=?", Integer.class, id))
                .isZero();

        String shown = workItemService.create(owner, workspace, project, details("Shown"), null, Set.of(bug, api));
        labelService.delete(owner, workspace, api, 0);
        assertThat(labels(workItemQueryService.get(owner, workspace, project, shown)))
                .containsExactly(bug);
        var list = new WorkItemRequests.ListRequest();
        list.setLabelId(List.of(api));
        assertThat(workItemQueryService
                        .list(owner, workspace, project, false, list)
                        .items())
                .isEmpty();
        list.setLabelId(List.of(bug));
        assertThat(workItemQueryService.list(owner, workspace, project, false, list).items().stream()
                        .map(WorkItemViews.Item::id))
                .containsExactly(shown);
        assertThat(code(() -> workItemService.create(owner, workspace, project, details("X"), null, Set.of(api))))
                .isEqualTo("WORK_ITEM_LABEL_INVALID");

        String password = "label integration password phrase";
        jdbcTemplate.update(
                "UPDATE iam_password SET password_hash=? WHERE iam_user_id=?",
                passwordEncoder.encode(password),
                owner.userId());
        try (var client = login(owner, password)) {
            String base = "/api/v1/workspaces/" + workspace + "/projects/" + project + "/work-items";
            var created = http(
                    client,
                    "POST",
                    base,
                    "{\"title\":\"HTTP\",\"labelIds\":[\"" + bug + "\",\"" + decision + "\"]}",
                    null);
            expect(created, 201);
            String path = created.headers().firstValue("location").orElseThrow();
            var read = JSON.readTree(http(client, "GET", path, null).body());
            assertThat(read.path("labels").get(0).path("name").asText()).isEqualTo("결정기록");
            assertThat(read.path("labels").size()).isEqualTo(2);
            assertThat(read.path("columnCategory").isNull()).isTrue();
            expect(http(client, "PATCH", path, "{\"expectedVersion\":0,\"labelIds\":null}", null), 204);
            assertThat(JSON.readTree(http(client, "GET", path, null).body())
                            .path("labels")
                            .size())
                    .isZero();
            expect(
                    http(client, "PATCH", path, "{\"expectedVersion\":1,\"labelIds\":[\"" + foreign + "\"]}", null),
                    400);
        }
    }

    @Test
    void workspaceListFiltersAcrossProjectsByProjectLabelCategoryAndDates() throws Exception {
        String p1 = projectService.create(owner, workspace, "One", "ONE", null);
        String p2 = projectService.create(owner, workspace, "Two", "TWO", null);
        String archivedProject = projectService.create(owner, workspace, "Archived", "ARC", null);
        String deletedProject = projectService.create(owner, workspace, "Deleted", "DEL", null);
        var c1 = projectService.columns(owner, workspace, p1);
        var c2 = projectService.columns(owner, workspace, p2);
        String bug = labelService.create(owner, workspace, "bug", "#cc0000");
        var day = LocalDate.of(2026, 11, 10);
        String todo = workItemService.create(
                owner, workspace, p1, details("Todo one"), c1.getFirst().id(), Set.of(bug));
        String doing = workItemService.create(
                owner,
                workspace,
                p2,
                dated("Doing two", day, day.plusDays(5)),
                c2.get(1).id());
        String done = workItemService.create(
                owner, workspace, p2, dated("Done two", null, day), c2.getLast().id());
        String backlog = workItemService.create(
                owner, workspace, p1, dated("Backlog one", day.plusDays(20), null), null, Set.of(bug));
        workItemService.create(owner, workspace, archivedProject, details("Hidden archived"), null);
        workItemService.create(owner, workspace, deletedProject, details("Hidden deleted"), null);
        projectService.archive(owner, workspace, archivedProject, 0, true);
        projectService.delete(owner, workspace, deletedProject, 0);

        assertThat(ids(new WorkItemRequests.WorkspaceListRequest()))
                .containsExactlyInAnyOrder(todo, doing, done, backlog);
        var byProject = new WorkItemRequests.WorkspaceListRequest();
        byProject.setProjectId(List.of(p2));
        assertThat(ids(byProject)).containsExactlyInAnyOrder(doing, done);
        byProject.setProjectId(List.of(archivedProject));
        assertThat(ids(byProject)).isEmpty();
        var byLabel = new WorkItemRequests.WorkspaceListRequest();
        byLabel.setLabelId(List.of(bug));
        assertThat(ids(byLabel)).containsExactlyInAnyOrder(todo, backlog);
        var byCategory = new WorkItemRequests.WorkspaceListRequest();
        byCategory.setCategory(List.of("todo,doing"));
        assertThat(ids(byCategory)).containsExactlyInAnyOrder(todo, doing);
        byCategory.setCategory(List.of("none"));
        assertThat(ids(byCategory)).containsExactly(backlog);
        byCategory.setCategory(List.of("done", "none"));
        assertThat(ids(byCategory)).containsExactlyInAnyOrder(done, backlog);
        byCategory.setCategory(List.of("finished"));
        assertThat(code(() -> ids(byCategory))).isEqualTo("COMMON_INVALID_REQUEST");
        var byColumn = new WorkItemRequests.WorkspaceListRequest();
        byColumn.setColumnId(List.of(c1.getFirst().id(), c2.getLast().id()));
        assertThat(ids(byColumn)).containsExactlyInAnyOrder(todo, done);
        var dates = new WorkItemRequests.WorkspaceListRequest();
        dates.setHasDates(true);
        assertThat(ids(dates)).containsExactlyInAnyOrder(doing, done, backlog);
        dates.setHasDates(false);
        assertThat(ids(dates)).containsExactly(todo);
        var range = new WorkItemRequests.WorkspaceListRequest();
        range.setFrom(day.plusDays(3));
        range.setTo(day.plusDays(4));
        assertThat(ids(range)).containsExactly(doing);
        range.setFrom(day);
        range.setTo(day);
        assertThat(ids(range)).containsExactlyInAnyOrder(doing, done);

        var page = new WorkItemRequests.WorkspaceListRequest();
        page.setSize(3);
        var first = workItemQueryService.listWorkspace(owner, workspace, page);
        page.setCursor(first.nextCursor());
        var second = workItemQueryService.listWorkspace(owner, workspace, page);
        assertThat(first.items()).hasSize(3);
        assertThat(second.items()).hasSize(1);
        assertThat(second.nextCursor()).isNull();
        var doingItem = first.items().stream()
                .filter(i -> i.id().equals(doing))
                .findFirst()
                .orElseThrow();
        assertThat(doingItem.columnCategory()).isEqualTo(ColumnCategory.doing);
        assertThat(doingItem.key()).isEqualTo("TWO-1");

        var projectList = new WorkItemRequests.ListRequest();
        projectList.setCategory(List.of("none"));
        assertThat(workItemQueryService.list(owner, workspace, p1, false, projectList).items().stream()
                        .map(WorkItemViews.Item::id))
                .containsExactly(backlog);

        CurrentUser viewer = identity("viewer");
        membership(viewer, "viewer");
        assertThat(workItemQueryService
                        .listWorkspace(viewer, workspace, new WorkItemRequests.WorkspaceListRequest())
                        .items())
                .hasSize(4);
        CurrentUser outsider = identity("outsider");
        String path = "/api/v1/workspaces/" + workspace + "/work-items";
        try (var client = login(viewer)) {
            var response = http(client, "GET", path + "?projectId=" + p1 + "&labelId=" + bug + "&category=none", null);
            expect(response, 200);
            assertThat(JSON.readTree(response.body())
                            .path("items")
                            .get(0)
                            .path("id")
                            .asText())
                    .isEqualTo(backlog);
            expect(http(client, "GET", path + "?deleted=true", null), 403);
            expect(http(client, "GET", path + "?category=bogus", null), 400);
        }
        try (var client = login(outsider)) {
            expect(http(client, "GET", path, null), 404);
        }
    }

    @Test
    void columnCategoriesDefaultFollowFinalityAndRejectAFinalColumnOutsideDone() {
        String project = projectService.create(owner, workspace, "Board", "BRD", null);
        var columns = projectService.columns(owner, workspace, project);
        assertThat(columns.stream().map(c -> c.category()))
                .containsExactly(ColumnCategory.todo, ColumnCategory.doing, ColumnCategory.doing, ColumnCategory.done);
        assertThat(code(() -> projectService.addColumn(
                        owner, workspace, project, 0, "Shipped", null, true, ColumnCategory.todo)))
                .isEqualTo("PROJECT_COLUMN_CATEGORY_INVALID");
        String shipped = projectService.addColumn(owner, workspace, project, 0, "Shipped", null, true, null);
        String waiting = projectService.addColumn(owner, workspace, project, 1, "Waiting", null, false, null);
        String later =
                projectService.addColumn(owner, workspace, project, 2, "Later", null, false, ColumnCategory.todo);
        assertThat(category(project, shipped)).isEqualTo(ColumnCategory.done);
        assertThat(category(project, waiting)).isEqualTo(ColumnCategory.doing);
        assertThat(category(project, later)).isEqualTo(ColumnCategory.todo);
        projectService.reviseColumn(owner, workspace, project, shipped, 0, "Shipped", null, false);
        assertThat(category(project, shipped)).isEqualTo(ColumnCategory.doing);
        projectService.reviseColumn(owner, workspace, project, later, 0, "Later", null, true);
        assertThat(category(project, later)).isEqualTo(ColumnCategory.done);
        var invalid = new ProjectRequests.ReviseColumn();
        invalid.setExpectedVersion(1L);
        invalid.setCategory(ColumnCategory.doing);
        assertThat(code(() -> projectService.reviseColumn(owner, workspace, project, later, invalid)))
                .isEqualTo("PROJECT_COLUMN_CATEGORY_INVALID");
        var retag = new ProjectRequests.ReviseColumn();
        retag.setExpectedVersion(0L);
        retag.setCategory(ColumnCategory.todo);
        projectService.reviseColumn(owner, workspace, project, waiting, retag);
        assertThat(category(project, waiting)).isEqualTo(ColumnCategory.todo);
        var nameOnly = new ProjectRequests.ReviseColumn();
        nameOnly.setExpectedVersion(1L);
        nameOnly.setName("On hold");
        projectService.reviseColumn(owner, workspace, project, waiting, nameOnly);
        assertThat(category(project, waiting)).isEqualTo(ColumnCategory.todo);
        var cleared = new ProjectRequests.ReviseColumn();
        cleared.setExpectedVersion(2L);
        cleared.setCategory(null);
        assertThat(code(() -> projectService.reviseColumn(owner, workspace, project, waiting, cleared)))
                .isEqualTo("COMMON_INVALID_REQUEST");
        String item = workItemService.create(owner, workspace, project, details("Moved"), waiting);
        assertThat(workItemQueryService.get(owner, workspace, project, item).columnCategory())
                .isEqualTo(ColumnCategory.todo);
    }

    private ColumnCategory category(String project, String column) {
        return projectService.columns(owner, workspace, project).stream()
                .filter(c -> c.id().equals(column))
                .findFirst()
                .orElseThrow()
                .category();
    }

    private List<String> ids(WorkItemRequests.WorkspaceListRequest request) {
        return workItemQueryService.listWorkspace(owner, workspace, request).items().stream()
                .map(WorkItemViews.Item::id)
                .toList();
    }

    private static List<String> labels(WorkItemViews.Item item) {
        return item.labels().stream().map(WorkItemViews.Label::id).toList();
    }

    private static WorkItem.Details details(String title) {
        return new WorkItem.Details(title, null, null, null, null, null, null);
    }

    private static WorkItem.Details dated(String title, LocalDate start, LocalDate due) {
        return new WorkItem.Details(title, null, null, null, null, start, due);
    }

    private static LabelRequests.Update update(long version, String name, String color) {
        var update = new LabelRequests.Update();
        update.setExpectedVersion(version);
        if (name != null) update.setName(name);
        if (color != null) update.setColor(color);
        return update;
    }

    private static String code(ThrowingCallable call) {
        return catchThrowableOfType(BusinessException.class, call).errorCode().code();
    }

    private CurrentUser identity(String role) {
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
                passwordEncoder.encode(role + " password phrase for labels"),
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
        return new CurrentUser(user, false, CurrentUser.Method.SESSION, credential, null, false);
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

    private HttpClient login(CurrentUser actor) throws Exception {
        String role = jdbcTemplate.queryForObject(
                "SELECT name FROM iam_user WHERE iam_user_id=?", String.class, actor.userId());
        return login(actor, role + " password phrase for labels");
    }

    private HttpClient login(CurrentUser actor, String password) throws Exception {
        String email = jdbcTemplate.queryForObject(
                "SELECT email FROM iam_user WHERE iam_user_id=?", String.class, actor.userId());
        var client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build();
        expect(
                http(
                        client,
                        "POST",
                        "/api/v1/auth/sessions",
                        JSON.writeValueAsString(Map.of("email", email, "password", password)),
                        null),
                201);
        return client;
    }

    private static void expect(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(status);
    }

    private HttpResponse<String> http(HttpClient client, String method, String path, String body) throws Exception {
        return http(client, method, path, body, null);
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
