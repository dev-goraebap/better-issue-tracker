package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.workitem.application.WorkItemQueryService;
import io.github.goraebap.bit.module.workitem.application.WorkItemRequests;
import io.github.goraebap.bit.module.workitem.application.WorkItemService;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
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
import java.util.Map;
import java.util.UUID;
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
            "app.secrets.generate=false", "app.auth.secret=workitem-integration-secret-at-least-32-characters",
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
    private WorkItemRepository workItemRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UUID workspace;
    private UUID project;
    private UUID todo;
    private UUID done;
    private CurrentUser owner;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/workitem-" + UUID.randomUUID() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        for (String trigger : List.of("reject_task", "reject_move", "reject_close"))
            jdbcTemplate.execute("DROP TRIGGER IF EXISTS " + trigger);
        for (String table : List.of(
                "work_item_label",
                "work_item",
                "board_column",
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
        workspace = UUID.randomUUID();
        owner = participant("owner");
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                workspace.toString(),
                "Tasks",
                "workitem-test",
                now,
                owner.userId().toString(),
                now,
                owner.userId().toString());
        membership(owner, "owner");
        project = projectService.create(owner, workspace, "Project", "BIT", null);
        var columns = projectService.columns(owner, workspace, project);
        todo = columns.getFirst().id();
        done = columns.getLast().id();
    }

    @Test
    void referencesSurviveKeyChangesAndCompletionOnlyChangesOnStateTransitions() {
        UUID id = create(owner, "Task", todo, null);
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
                        "SELECT last_work_item_number FROM project WHERE project_id=?", Long.class, project.toString()))
                .isZero();
        UUID other = projectService.create(owner, workspace, "Other", "OT", null);
        UUID otherColumn =
                projectService.columns(owner, workspace, other).getFirst().id();
        assertThatThrownBy(() -> create(owner, "Foreign", otherColumn, null)).hasMessageContaining("컬럼");
        assertThatThrownBy(() -> create(owner, "Unassigned", todo, UUID.randomUUID()))
                .hasMessageContaining("멤버");
        UUID id = create(owner, "Valid", todo, null);
        assertThat(workItemQueryService.get(owner, workspace, project, id).number())
                .isEqualTo(1);
    }

    @Test
    void neighborMovesAreScopedAndRenumberBothSourceAndDestination() {
        UUID a = create(owner, "A", todo, null);
        UUID b = create(owner, "B", todo, null);
        UUID c = create(owner, "C", todo, null);
        workItemService.move(owner, workspace, project, a, 0, todo, c, b);
        assertThat(workItemRepository.findColumnItems(project, todo, false).stream()
                        .map(WorkItem::id))
                .containsExactly(b, a, c);
        assertThat(workItemRepository.findColumnItems(project, todo, false).stream()
                        .map(WorkItem::position))
                .containsExactly(0d, 1d, 2d);
        assertThatThrownBy(() -> workItemService.move(owner, workspace, project, a, 0, done, null, null))
                .hasMessageContaining("다른 변경");
        UUID other = projectService.create(owner, workspace, "Other", "OT", null);
        UUID foreign = workItemService.create(owner, workspace, other, details("Foreign", null), null);
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
        UUID id = create(owner, "State", todo, null);
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
        UUID live = create(owner, "Live", todo, null);
        UUID archived = create(owner, "Archived", todo, null);
        UUID deleted = create(owner, "Deleted", todo, null);
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
        UUID id = create(owner, "Archive", todo, owner.userId());
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
            List<Callable<UUID>> tasks = new ArrayList<>();
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
            UUID id = futures.getFirst().get();
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
        UUID id = create(member, "Member task", todo, member.userId());
        assertThat(workItemQueryService.get(viewer, workspace, project, id).title())
                .isEqualTo("Member task");
        assertThatThrownBy(() -> create(viewer, "Forbidden", todo, null)).hasMessageContaining("권한");
        jdbcTemplate.update(
                "DELETE FROM workspace_member WHERE workspace_id=? AND iam_user_id=?",
                workspace.toString(),
                member.userId().toString());
        assertThatThrownBy(() -> create(owner, "New assignment", todo, member.userId()))
                .hasMessageContaining("멤버");
        assertThat(workItemQueryService.get(owner, workspace, project, id).assigneeId())
                .isEqualTo(member.userId());
        assertThatThrownBy(() -> workItemQueryService.get(member, workspace, project, id))
                .hasMessageContaining("찾을 수");
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle("Kept assignment");
        workItemService.revise(owner, workspace, project, id, update);
        assertThat(workItemQueryService.get(owner, workspace, project, id).assigneeId())
                .isEqualTo(member.userId());
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
        String password = "workitem integration password phrase";
        jdbcTemplate.update(
                "UPDATE iam_password SET password_hash=? WHERE iam_user_id=?",
                passwordEncoder.encode(password),
                owner.userId().toString());
        String email = jdbcTemplate.queryForObject(
                "SELECT email FROM iam_user WHERE iam_user_id=?",
                String.class,
                owner.userId().toString());
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
            jdbcTemplate.update("UPDATE workspace_member SET role='viewer' WHERE workspace_id=?", workspace.toString());
            expect(http(client, "POST", base, "bad JSON", key), 403);
            expect(http(client, "PATCH", path, "bad JSON", null), 403);
            expect(http(client, "GET", base + "?deleted=1&q=" + "x".repeat(201), null, key), 403);
            expect(http(client, "PATCH", base + "/" + UUID.randomUUID(), "bad JSON", key), 403);
            jdbcTemplate.update("UPDATE workspace_member SET role='owner' WHERE workspace_id=?", workspace.toString());
            expect(http(client, "PATCH", base + "/" + UUID.randomUUID(), "bad JSON", key), 404);
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
        UUID archived = create(owner, "Archive", todo, null);
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
        UUID otherWorkspace = UUID.randomUUID();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                otherWorkspace.toString(),
                "Other",
                "other-tasks",
                now,
                owner.userId().toString(),
                now,
                owner.userId().toString());
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                UUID.randomUUID().toString(),
                otherWorkspace.toString(),
                owner.userId().toString(),
                "owner",
                now);
        UUID otherProject = projectService.create(owner, otherWorkspace, "Other", "BIT", null);
        UUID otherTask = workItemService.create(
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
        UUID id = workItemService.create(owner, workspace, project, details, todo);
        var filter = new WorkItemRequests.ListRequest();
        filter.setPriority(List.of("high,low,"));
        filter.setTriggerType(List.of("finding"));
        filter.setAssigneeId(owner.userId());
        filter.setColumn(todo.toString());
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
        update.setAssigneeId(null);
        workItemService.revise(owner, workspace, project, id, update);
        var read = workItemQueryService.get(owner, workspace, project, id);
        assertThat(read.description()).isNull();
        assertThat(read.assigneeId()).isNull();
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
        UUID id = create(owner, "Race", null, null);
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
                                    .isIn("PROJECT_COLUMN_NOT_FOUND", "WORKITEM_VERSION_CONFLICT");
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
        UUID id = create(admin, "Admin task", todo, null);
        assertThat(workItemQueryService.get(admin, workspace, project, id).title())
                .isEqualTo("Admin task");
        CurrentUser outsider = identity("instance-admin", true);
        assertThatThrownBy(() -> workItemQueryService.get(outsider, workspace, project, id))
                .hasMessageContaining("찾을 수");
        assertThatThrownBy(() -> create(outsider, "No implicit access", todo, null))
                .hasMessageContaining("찾을 수");
        jdbcTemplate.update(
                "UPDATE iam_password SET must_change=1 WHERE iam_user_id=?",
                owner.userId().toString());
        assertThatThrownBy(() -> create(owner, "Stale principal", todo, null)).hasMessageContaining("권한");
        assertThatThrownBy(() -> workItemQueryService.get(owner, workspace, project, id))
                .hasMessageContaining("권한");
    }

    @Test
    void deletedListingIncludesArchivedTasksAndDeletedNumbersAreNeverReused() {
        UUID id = create(owner, "Deleted archive", todo, null);
        workItemService.archive(owner, workspace, project, id, 0, true);
        workItemService.delete(owner, workspace, project, id, 1);
        var filter = new WorkItemRequests.ListRequest();
        filter.setDeleted(true);
        var page = workItemQueryService.list(owner, workspace, project, false, filter);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().archivedAt()).isNotNull();
        UUID next = create(owner, "Next number", todo, null);
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
        UUID user = UUID.randomUUID();
        UUID credential = UUID.randomUUID();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                user.toString(),
                role + user + "@example.test",
                role,
                now,
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES (?,?,?)",
                user.toString(),
                "fixture-hash",
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_session(iam_session_id,iam_user_id,token_hash,expires_at,absolute_expires_at,last_seen_at,created_at) VALUES (?,?,?,?,?,?,?)",
                credential.toString(),
                user.toString(),
                credential.toString(),
                InstantTextBinding.text(Instant.now().plusSeconds(3600)),
                InstantTextBinding.text(Instant.now().plusSeconds(7200)),
                now,
                now);
        if (instanceAdmin)
            jdbcTemplate.update("UPDATE iam_user SET is_instance_admin=1 WHERE iam_user_id=?", user.toString());
        return new CurrentUser(user, instanceAdmin, CurrentUser.Method.SESSION, credential, null, false);
    }

    private void membership(CurrentUser actor, String role) {
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                UUID.randomUUID().toString(),
                workspace.toString(),
                actor.userId().toString(),
                role,
                InstantTextBinding.text(Instant.now()));
    }

    private UUID create(CurrentUser actor, String title, UUID column, UUID assignee) {
        return workItemService.create(actor, workspace, project, details(title, assignee), column);
    }

    private static WorkItem.Details details(String title, UUID assignee) {
        return new WorkItem.Details(title, null, null, null, assignee, null, null);
    }

    private boolean edit(UUID id, String title) {
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle(title);
        try {
            workItemService.revise(owner, workspace, project, id, update);
            return true;
        } catch (io.github.goraebap.bit.shared.error.BusinessException conflict) {
            assertThat(conflict.errorCode().code()).isEqualTo("WORKITEM_VERSION_CONFLICT");
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
