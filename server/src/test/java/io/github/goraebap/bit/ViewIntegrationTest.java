package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.view.application.ViewRequests;
import io.github.goraebap.bit.module.view.application.ViewService;
import io.github.goraebap.bit.module.view.application.ViewViews;
import io.github.goraebap.bit.module.view.domain.ViewOrder;
import io.github.goraebap.bit.module.view.domain.WorkItemView;
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
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
            "app.secrets.generate=false", "app.auth.secret=view-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false", "app.auth.allowed-origins=http://localhost:8080"
        })
class ViewIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final List<WorkItemView.Column> USUAL =
            List.of(WorkItemView.Column.status, WorkItemView.Column.updated);

    @LocalServerPort
    private int port;

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private ViewService viewService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ProjectService projectService;

    private CurrentUser owner;
    private CurrentUser admin;
    private CurrentUser member;
    private CurrentUser other;
    private CurrentUser viewer;
    private String workspace;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/view-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        for (String table : List.of(
                "notification",
                "work_item_view_order",
                "work_item_view_tweak",
                "work_item_view",
                "board_column",
                "project_member",
                "project_key",
                "project",
                "label",
                "workspace_invitation",
                "work_item_type_parent",
                "work_item_type",
                "workspace_member",
                "workspace",
                "iam_api_key",
                "iam_session",
                "iam_password",
                "iam_user")) jdbcTemplate.update("DELETE FROM " + table);
        owner = identity("owner");
        workspace = workspaceService.create(owner, "Views", "views-" + Ids.newId());
        admin = member("admin");
        member = member("member");
        other = member("member");
        viewer = member("viewer");
    }

    @Test
    void newWorkspacesStartWithTheFourSharedViewsAndOnlyMakersOrAdminsMayEditThem() {
        var views = viewService.list(owner, workspace);
        assertThat(views.stream().map(ViewViews.View::name)).containsExactly("백로그", "진행 보드", "캘린더", "결정기록");
        var backlog = views.getFirst();
        assertThat(backlog.icon()).isEqualTo("rows");
        assertThat(backlog.color()).isEqualTo("#95959f");
        assertThat(backlog.layout()).isEqualTo(WorkItemView.Layout.list);
        assertThat(backlog.filters().status()).isEqualTo("backlog");
        assertThat(backlog.sort())
                .isEqualTo(new ViewViews.Sort(WorkItemView.SortKey.priority, WorkItemView.Direction.asc));
        assertThat(backlog.ownerId()).isEqualTo(owner.userId());
        assertThat(backlog.isPersonal()).isFalse();
        assertThat(views.stream().map(ViewViews.View::grouping)).containsOnly(WorkItemView.Grouping.none);
        var decisions = views.getLast();
        assertThat(decisions.layout()).isEqualTo(WorkItemView.Layout.history);
        assertThat(decisions.filters().label()).isEqualTo("system");
        assertThat(decisions.columns())
                .containsExactly(WorkItemView.Column.assignee, WorkItemView.Column.labels, WorkItemView.Column.updated);
        assertThat(views.get(1).filters()).isEqualTo(new ViewViews.Filters(null, null, null, null));
        assertThat(views.get(1).sort())
                .isEqualTo(new ViewViews.Sort(WorkItemView.SortKey.updated, WorkItemView.Direction.desc));
        assertThat(views.stream().allMatch(ViewViews.View::canEdit)).isTrue();
        assertThat(viewService.list(admin, workspace).stream().allMatch(ViewViews.View::canEdit))
                .isTrue();
        assertThat(viewService.list(member, workspace).stream().noneMatch(ViewViews.View::canEdit))
                .isTrue();
        assertThat(viewService.list(viewer, workspace)).hasSize(4);

        String shared = viewService.create(member, workspace, create("Team bugs", false, Map.of("label", "x")));
        assertThat(viewService.get(member, workspace, shared).canEdit()).isTrue();
        assertThat(viewService.get(other, workspace, shared).canEdit()).isFalse();
        assertThat(viewService.get(admin, workspace, shared).canEdit()).isTrue();
        assertThat(viewService.list(owner, workspace).getLast().id()).isEqualTo(shared);
        assertThat(code(() -> viewService.revise(other, workspace, shared, rename(0, "Taken"))))
                .isEqualTo("AUTH_FORBIDDEN");
        viewService.revise(admin, workspace, shared, rename(0, "Admin rename"));
        viewService.revise(member, workspace, shared, rename(1, "Maker rename"));
        assertThat(code(() -> viewService.revise(member, workspace, shared, rename(1, "Stale"))))
                .isEqualTo("VIEW_VERSION_CONFLICT");
        assertThat(code(() -> viewService.delete(viewer, workspace, shared, 2))).isEqualTo("AUTH_FORBIDDEN");
        assertThat(code(() -> viewService.create(viewer, workspace, create("Shared by viewer", false, Map.of()))))
                .isEqualTo("AUTH_FORBIDDEN");
        viewService.delete(owner, workspace, shared, 2);
        assertThat(code(() -> viewService.get(member, workspace, shared))).isEqualTo("VIEW_NOT_FOUND");
    }

    @Test
    void personalViewsAreInvisibleToEveryoneElseIncludingTheWorkspaceOwner() {
        String mine = viewService.create(viewer, workspace, create("Mine", true, Map.of("assignee", "me")));
        assertThat(viewService.list(viewer, workspace).getLast().id()).isEqualTo(mine);
        assertThat(viewService.get(viewer, workspace, mine).canEdit()).isTrue();
        for (CurrentUser someone : List.of(owner, admin, member)) {
            assertThat(viewService.list(someone, workspace).stream().map(ViewViews.View::id))
                    .doesNotContain(mine);
            assertThat(code(() -> viewService.get(someone, workspace, mine))).isEqualTo("VIEW_NOT_FOUND");
            assertThat(code(() -> viewService.delete(someone, workspace, mine, 0)))
                    .isEqualTo("VIEW_NOT_FOUND");
        }
        var share = new ViewRequests.Update();
        share.setExpectedVersion(0L);
        share.setIsPersonal(false);
        assertThat(code(() -> viewService.revise(viewer, workspace, mine, share)))
                .isEqualTo("AUTH_FORBIDDEN");

        String team = viewService.create(member, workspace, create("Team", false, Map.of()));
        var hide = new ViewRequests.Update();
        hide.setExpectedVersion(0L);
        hide.setIsPersonal(true);
        assertThat(code(() -> viewService.revise(admin, workspace, team, hide))).isEqualTo("AUTH_FORBIDDEN");
        viewService.revise(member, workspace, team, hide);
        assertThat(code(() -> viewService.get(admin, workspace, team))).isEqualTo("VIEW_NOT_FOUND");
        var unhide = new ViewRequests.Update();
        unhide.setExpectedVersion(1L);
        unhide.setIsPersonal(false);
        viewService.revise(member, workspace, team, unhide);
        assertThat(viewService.get(admin, workspace, team).isPersonal()).isFalse();
    }

    @Test
    void definitionsAreValidatedAndPatchesChangeOnlyWhatTheyName() {
        assertThat(code(() -> viewService.create(member, workspace, create("Bad", false, Map.of("project", "x")))))
                .isEqualTo("VIEW_FILTERS_INVALID");
        assertThat(code(() ->
                        viewService.create(member, workspace, create("Long", false, Map.of("label", "x".repeat(901))))))
                .isEqualTo("VIEW_FILTERS_INVALID");
        var twice = new ViewRequests.Create(
                "Twice",
                null,
                "list",
                "#5e6ad2",
                false,
                WorkItemView.Layout.list,
                Map.of(),
                new ViewViews.Sort(WorkItemView.SortKey.title, WorkItemView.Direction.asc),
                List.of(WorkItemView.Column.due, WorkItemView.Column.due),
                null);
        assertThat(code(() -> viewService.create(member, workspace, twice))).isEqualTo("VIEW_COLUMNS_INVALID");
        var noSort = new ViewRequests.Create(
                "No sort",
                null,
                "list",
                "#5e6ad2",
                false,
                WorkItemView.Layout.list,
                Map.of(),
                new ViewViews.Sort(null, WorkItemView.Direction.asc),
                USUAL,
                null);
        assertThat(code(() -> viewService.create(member, workspace, noSort))).isEqualTo("VIEW_INVALID");

        var filters = new java.util.HashMap<String, String>();
        filters.put("status", " todo,none ");
        filters.put("priority", "");
        filters.put("label", null);
        String id = viewService.create(member, workspace, create("  Spaced  ", false, filters));
        var read = viewService.get(member, workspace, id);
        assertThat(read.name()).isEqualTo("Spaced");
        assertThat(read.filters()).isEqualTo(new ViewViews.Filters("todo,none", null, null, null));
        assertThat(read.color()).isEqualTo("#4cb782");
        var patch = new ViewRequests.Update();
        patch.setExpectedVersion(0L);
        patch.setLayout(WorkItemView.Layout.board);
        patch.setDescription("For triage");
        viewService.revise(member, workspace, id, patch);
        var patched = viewService.get(member, workspace, id);
        assertThat(patched.layout()).isEqualTo(WorkItemView.Layout.board);
        assertThat(patched.description()).isEqualTo("For triage");
        assertThat(patched.name()).isEqualTo("Spaced");
        assertThat(patched.filters().status()).isEqualTo("todo,none");
        var clear = new ViewRequests.Update();
        clear.setExpectedVersion(1L);
        clear.setFilters(null);
        clear.setDescription(null);
        viewService.revise(member, workspace, id, clear);
        var cleared = viewService.get(member, workspace, id);
        assertThat(cleared.filters()).isEqualTo(new ViewViews.Filters(null, null, null, null));
        assertThat(cleared.description()).isNull();
        var same = new ViewRequests.Update();
        same.setExpectedVersion(2L);
        same.setName("Spaced");
        viewService.revise(member, workspace, id, same);
        assertThat(viewService.get(member, workspace, id).version()).isEqualTo(2);
        var nullName = new ViewRequests.Update();
        nullName.setExpectedVersion(2L);
        nullName.setName(null);
        assertThat(code(() -> viewService.revise(member, workspace, id, nullName)))
                .isEqualTo("VIEW_INVALID");
    }

    @Test
    void tweaksAreEachMembersOwnAndFollowTheViewsTheyCanSee() {
        String board = viewService.list(owner, workspace).get(1).id();
        String mine = viewService.create(member, workspace, create("Mine", true, Map.of()));
        viewService.putTweak(member, workspace, "all", tweak(WorkItemView.Layout.cards, null, null));
        viewService.putTweak(
                member,
                workspace,
                board,
                tweak(null, new ViewViews.Sort(WorkItemView.SortKey.created, WorkItemView.Direction.asc), USUAL));
        viewService.putTweak(member, workspace, mine, tweak(WorkItemView.Layout.timeline, null, null));
        assertThat(viewService.tweaks(member, workspace).stream().map(ViewViews.Tweak::viewKey))
                .containsExactlyInAnyOrder("all", board, mine);
        var boardTweak = viewService.tweaks(member, workspace).stream()
                .filter(t -> t.viewKey().equals(board))
                .findFirst()
                .orElseThrow();
        assertThat(boardTweak.layout()).isNull();
        assertThat(boardTweak.columns()).isEqualTo(USUAL);
        assertThat(boardTweak.sort().key()).isEqualTo(WorkItemView.SortKey.created);
        viewService.putTweak(member, workspace, board, tweak(WorkItemView.Layout.list, null, null));
        var replaced = viewService.tweaks(member, workspace).stream()
                .filter(t -> t.viewKey().equals(board))
                .findFirst()
                .orElseThrow();
        assertThat(replaced.layout()).isEqualTo(WorkItemView.Layout.list);
        assertThat(replaced.sort()).isNull();
        assertThat(viewService.tweaks(other, workspace)).isEmpty();

        assertThat(code(() ->
                        viewService.putTweak(other, workspace, mine, tweak(WorkItemView.Layout.list, null, null))))
                .isEqualTo("VIEW_NOT_FOUND");
        assertThat(code(() -> viewService.putTweak(
                        other, workspace, "everything", tweak(WorkItemView.Layout.list, null, null))))
                .isEqualTo("VIEW_NOT_FOUND");
        assertThat(code(() -> viewService.putTweak(
                        member,
                        workspace,
                        "all",
                        tweak(null, null, List.of(WorkItemView.Column.due, WorkItemView.Column.due)))))
                .isEqualTo("VIEW_COLUMNS_INVALID");
        viewService.putTweak(viewer, workspace, board, tweak(WorkItemView.Layout.calendar, null, null));

        viewService.putTweak(member, workspace, "all", tweak(null, null, null));
        viewService.deleteTweak(member, workspace, mine);
        assertThat(viewService.tweaks(member, workspace).stream().map(ViewViews.Tweak::viewKey))
                .containsExactly(board);
        viewService.delete(owner, workspace, board, 0);
        assertThat(viewService.tweaks(member, workspace)).isEmpty();
        assertThat(viewService.tweaks(viewer, workspace)).isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM work_item_view_tweak", Integer.class))
                .isZero();
    }

    @Test
    void httpShowsTheClientShapeAndChecksAccessBeforeReadingTheBody() throws Exception {
        String base = "/api/v1/workspaces/" + workspace;
        String starter = viewService.list(owner, workspace).getFirst().id();
        String personal = viewService.create(other, workspace, create("Other's", true, Map.of()));
        CurrentUser outsider = identity("outsider");
        try (var client = login(outsider)) {
            expect(http(client, "GET", base + "/views", null), 404);
            expect(http(client, "POST", base + "/views", "bad JSON"), 404);
            expect(http(client, "GET", base + "/view-tweaks", null), 404);
        }
        try (var client = login(viewer)) {
            var list = JSON.readTree(http(client, "GET", base + "/views", null).body());
            assertThat(list.size()).isEqualTo(4);
            var first = list.get(0);
            assertThat(first.path("name").stringValue()).isEqualTo("백로그");
            assertThat(first.path("filters").toString()).isEqualTo("{\"status\":\"backlog\"}");
            assertThat(list.get(1).path("filters").toString()).isEqualTo("{}");
            assertThat(first.path("sort").toString()).isEqualTo("{\"key\":\"priority\",\"direction\":\"asc\"}");
            assertThat(first.path("isPersonal").booleanValue()).isFalse();
            assertThat(first.path("canEdit").booleanValue()).isFalse();
            assertThat(first.path("description").isNull()).isTrue();
            expect(http(client, "PATCH", base + "/views/" + starter, "bad JSON"), 403);
            expect(http(client, "DELETE", base + "/views/" + starter + "?expectedVersion=0", null), 403);
            expect(http(client, "GET", base + "/views/" + personal, null), 404);
            expect(http(client, "PATCH", base + "/views/" + personal, "bad JSON"), 404);
            expect(http(client, "GET", base + "/views/all", null), 404);
            String body = "{\"name\":\"My list\",\"icon\":\"person\",\"color\":\"#BB87FC\",\"isPersonal\":true,"
                    + "\"layout\":\"list\",\"filters\":{\"assignee\":\"" + viewer.userId() + "\"},"
                    + "\"sort\":{\"key\":\"title\",\"direction\":\"asc\"},\"columns\":[\"status\",\"due\"]}";
            var created = http(client, "POST", base + "/views", body);
            expect(created, 201);
            String location = created.headers().firstValue("location").orElseThrow();
            var read = JSON.readTree(http(client, "GET", location, null).body());
            assertThat(read.path("color").stringValue()).isEqualTo("#bb87fc");
            assertThat(read.path("canEdit").booleanValue()).isTrue();
            assertThat(read.path("columns").toString()).isEqualTo("[\"status\",\"due\"]");
            expect(http(client, "POST", base + "/views", body.replace("\"list\"", "\"gallery\"")), 400);
            var invalid = http(client, "POST", base + "/views", body.replace("assignee", "project"));
            expect(invalid, 400);
            assertThat(JSON.readTree(invalid.body()).path("code").stringValue()).isEqualTo("VIEW_FILTERS_INVALID");
            expect(http(client, "POST", base + "/views", body.replace("true", "false")), 403);
            expect(http(client, "PATCH", location, "{\"expectedVersion\":0,\"filters\":{\"status\":\"done\"}}"), 204);
            expect(http(client, "PATCH", location, "{\"expectedVersion\":1,\"owner\":\"x\"}"), 400);
            expect(
                    http(client, "PUT", base + "/view-tweaks/all", "{\"layout\":\"board\",\"columns\":[\"labels\"]}"),
                    204);
            expect(http(client, "PUT", base + "/view-tweaks/" + personal, "{\"layout\":\"board\"}"), 404);
            var tweaks = JSON.readTree(
                    http(client, "GET", base + "/view-tweaks", null).body());
            assertThat(tweaks.toString())
                    .isEqualTo("[{\"viewKey\":\"all\",\"layout\":\"board\",\"columns\":[\"labels\"]}]");
            expect(http(client, "DELETE", base + "/view-tweaks/all", null), 204);
            expect(http(client, "DELETE", location + "?expectedVersion=1", null), 204);
            expect(http(client, "GET", location, null), 404);
        }
    }

    @Test
    void aViewKeepsItsGroupingAndEachMemberMayGroupItTheirOwnWay() throws Exception {
        String plain = viewService.create(member, workspace, create("Plain", false, Map.of()));
        assertThat(viewService.get(member, workspace, plain).grouping()).isEqualTo(WorkItemView.Grouping.none);
        var byProject = new ViewRequests.Create(
                "By project",
                null,
                "list",
                "#5e6ad2",
                false,
                WorkItemView.Layout.list,
                Map.of(),
                new ViewViews.Sort(WorkItemView.SortKey.updated, WorkItemView.Direction.desc),
                USUAL,
                WorkItemView.Grouping.project);
        String grouped = viewService.create(member, workspace, byProject);
        assertThat(viewService.get(member, workspace, grouped).grouping()).isEqualTo(WorkItemView.Grouping.project);

        // A patch without grouping keeps it; one with grouping changes it; a null one is refused.
        viewService.revise(member, workspace, grouped, rename(0, "Renamed"));
        assertThat(viewService.get(member, workspace, grouped).grouping()).isEqualTo(WorkItemView.Grouping.project);
        var regroup = new ViewRequests.Update();
        regroup.setExpectedVersion(1L);
        regroup.setGrouping(WorkItemView.Grouping.assignee);
        viewService.revise(member, workspace, grouped, regroup);
        var read = viewService.get(member, workspace, grouped);
        assertThat(read.grouping()).isEqualTo(WorkItemView.Grouping.assignee);
        assertThat(read.version()).isEqualTo(2);
        var cleared = new ViewRequests.Update();
        cleared.setExpectedVersion(2L);
        cleared.setGrouping(null);
        assertThat(code(() -> viewService.revise(member, workspace, grouped, cleared)))
                .isEqualTo("VIEW_INVALID");

        // A member's own grouping follows the view while null, and a tweak of only grouping is kept.
        viewService.putTweak(
                other, workspace, grouped, new ViewRequests.PutTweak(null, null, null, WorkItemView.Grouping.label));
        assertThat(viewService.tweaks(other, workspace))
                .containsExactly(new ViewViews.Tweak(grouped, null, null, null, WorkItemView.Grouping.label));
        viewService.putTweak(
                other, workspace, grouped, new ViewRequests.PutTweak(WorkItemView.Layout.board, null, null, null));
        assertThat(viewService.tweaks(other, workspace))
                .containsExactly(new ViewViews.Tweak(grouped, WorkItemView.Layout.board, null, null, null));
        viewService.putTweak(other, workspace, grouped, new ViewRequests.PutTweak(null, null, null, null));
        assertThat(viewService.tweaks(other, workspace)).isEmpty();

        String base = "/api/v1/workspaces/" + workspace;
        try (var client = login(member)) {
            String body = "{\"name\":\"Http\",\"icon\":\"rows\",\"color\":\"#5e6ad2\",\"isPersonal\":true,"
                    + "\"layout\":\"list\",\"sort\":{\"key\":\"title\",\"direction\":\"asc\"},"
                    + "\"columns\":[\"status\"]";
            var none = http(client, "POST", base + "/views", body + "}");
            expect(none, 201);
            String noneAt = none.headers().firstValue("location").orElseThrow();
            assertThat(JSON.readTree(http(client, "GET", noneAt, null).body())
                            .path("grouping")
                            .stringValue())
                    .isEqualTo("none");
            var byStatus = http(client, "POST", base + "/views", body + ",\"grouping\":\"status\"}");
            expect(byStatus, 201);
            String statusAt = byStatus.headers().firstValue("location").orElseThrow();
            assertThat(JSON.readTree(http(client, "GET", statusAt, null).body())
                            .path("grouping")
                            .stringValue())
                    .isEqualTo("status");
            expect(http(client, "POST", base + "/views", body + ",\"grouping\":\"owner\"}"), 400);
            expect(http(client, "PATCH", statusAt, "{\"expectedVersion\":0,\"grouping\":\"owner\"}"), 400);
            expect(http(client, "PATCH", statusAt, "{\"expectedVersion\":0,\"grouping\":null}"), 400);
            expect(http(client, "PATCH", statusAt, "{\"expectedVersion\":0,\"grouping\":\"priority\"}"), 204);
            assertThat(JSON.readTree(http(client, "GET", statusAt, null).body())
                            .path("grouping")
                            .stringValue())
                    .isEqualTo("priority");
            expect(http(client, "PUT", base + "/view-tweaks/all", "{\"grouping\":\"owner\"}"), 400);
            expect(http(client, "PUT", base + "/view-tweaks/all", "{\"grouping\":\"type\"}"), 204);
            assertThat(http(client, "GET", base + "/view-tweaks", null).body())
                    .isEqualTo("[{\"viewKey\":\"all\",\"grouping\":\"type\"}]");
        }
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT tweak FROM work_item_view_tweak WHERE view_key='all'", String.class))
                .isEqualTo("{\"grouping\":\"type\"}");
    }

    @Test
    void theHomeAndEachProjectKeepTheirOwnViewOrderThatOnlyAdminsChange() throws Exception {
        var ids = viewService.list(owner, workspace).stream()
                .map(ViewViews.View::id)
                .toList();
        String board = ids.get(1);
        String decisions = ids.getLast();
        String project = projectService.create(owner, workspace, "Orders", "ORD", null);
        assertThat(viewService.orders(member, workspace)).isEmpty();

        viewService.putOrder(admin, workspace, ViewOrder.HOME, order(board, WorkItemView.ALL));
        viewService.putOrder(owner, workspace, project, order(decisions));
        assertThat(viewService.orders(member, workspace))
                .containsExactlyInAnyOrder(
                        new ViewViews.Order(ViewOrder.HOME, List.of(board, WorkItemView.ALL)),
                        new ViewViews.Order(project, List.of(decisions)));

        // The order is the workspace's to set; a key twice, an unknown view or a stranger's personal one is refused.
        assertThat(code(() -> viewService.putOrder(member, workspace, ViewOrder.HOME, order(WorkItemView.ALL))))
                .isEqualTo("AUTH_FORBIDDEN");
        assertThat(code(() -> viewService.putOrder(member, workspace, project, order(WorkItemView.ALL))))
                .isEqualTo("AUTH_FORBIDDEN");
        assertThat(code(() -> viewService.putOrder(owner, workspace, ViewOrder.HOME, order(board, board))))
                .isEqualTo("VIEW_ORDER_INVALID");
        assertThat(code(() -> viewService.putOrder(owner, workspace, ViewOrder.HOME, order(Ids.newId()))))
                .isEqualTo("VIEW_ORDER_INVALID");
        String mine = viewService.create(member, workspace, create("Mine", true, Map.of()));
        assertThat(code(() -> viewService.putOrder(admin, workspace, ViewOrder.HOME, order(mine))))
                .isEqualTo("VIEW_ORDER_INVALID");
        assertThat(code(() -> viewService.putOrder(owner, workspace, Ids.newId(), order(board))))
                .isEqualTo("PROJECT_NOT_FOUND");

        // Over HTTP too: the admin's session puts the home's order and every member reads it.
        String base = "/api/v1/workspaces/" + workspace + "/view-orders";
        expect(http(login(admin), "PUT", base + "/home", "{\"viewKeys\":[\"" + board + "\",\"all\"]}"), 204);
        var read = http(login(member), "GET", base, null);
        expect(read, 200);
        assertThat(read.body()).contains("\"scope\":\"home\"");
        expect(http(login(member), "PUT", base + "/home", "{\"viewKeys\":[\"all\"]}"), 403);

        // A view removed drops out of every order.
        viewService.delete(
                owner,
                workspace,
                board,
                viewService.get(owner, workspace, board).version());
        assertThat(viewService.orders(owner, workspace))
                .contains(new ViewViews.Order(ViewOrder.HOME, List.of(WorkItemView.ALL)));
    }

    private static ViewRequests.PutOrder order(String... keys) {
        return new ViewRequests.PutOrder(List.of(keys));
    }

    private static ViewRequests.Create create(String name, boolean personal, Map<String, String> filters) {
        return new ViewRequests.Create(
                name,
                null,
                "list",
                "#4CB782",
                personal,
                WorkItemView.Layout.list,
                filters,
                new ViewViews.Sort(WorkItemView.SortKey.updated, WorkItemView.Direction.desc),
                USUAL,
                null);
    }

    private static ViewRequests.Update rename(long version, String name) {
        var update = new ViewRequests.Update();
        update.setExpectedVersion(version);
        update.setName(name);
        return update;
    }

    private static ViewRequests.PutTweak tweak(
            WorkItemView.Layout layout, ViewViews.Sort sort, List<WorkItemView.Column> columns) {
        return new ViewRequests.PutTweak(layout, sort, columns, null);
    }

    private static String code(ThrowingCallable call) {
        return catchThrowableOfType(BusinessException.class, call).errorCode().code();
    }

    private CurrentUser member(String role) {
        var actor = identity(role);
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                Ids.newId(),
                workspace,
                actor.userId(),
                role,
                InstantTextBinding.text(Instant.now()));
        return actor;
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
                passwordEncoder.encode(role + " password phrase for views"),
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

    private HttpClient login(CurrentUser actor) throws Exception {
        var row = jdbcTemplate.queryForMap("SELECT email,name FROM iam_user WHERE iam_user_id=?", actor.userId());
        var client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build();
        expect(
                http(
                        client,
                        "POST",
                        "/api/v1/auth/sessions",
                        JSON.writeValueAsString(Map.of(
                                "email",
                                row.get("email"),
                                "password",
                                row.get("name") + " password phrase for views"))),
                201);
        return client;
    }

    private static void expect(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(status);
    }

    private HttpResponse<String> http(HttpClient client, String method, String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json");
        if (!method.equals("GET")) {
            var csrf = client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/csrf"))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            request.header("Origin", "http://localhost:8080")
                    .header(
                            "X-CSRF-Token",
                            JSON.readTree(csrf.body()).path("token").stringValue());
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
