package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.application.LinkService;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.workitem.application.WorkItemHierarchyService;
import io.github.goraebap.bit.module.workitem.application.WorkItemQueryService;
import io.github.goraebap.bit.module.workitem.application.WorkItemRequests;
import io.github.goraebap.bit.module.workitem.application.WorkItemService;
import io.github.goraebap.bit.module.workitem.application.WorkItemTypeRequests;
import io.github.goraebap.bit.module.workitem.application.WorkItemTypeService;
import io.github.goraebap.bit.module.workitem.application.WorkItemTypeViews;
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
import java.util.HashMap;
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

/** Work item types and the parent rules they set (D-104, BIT-89). */
@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false", "app.auth.secret=work-item-type-integration-secret-at-least-32-chars",
            "app.auth.cookie-secure=false", "app.auth.allowed-origins=http://localhost:8080"
        })
class WorkItemTypeIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String PASSWORD = " password phrase for work item types";

    @LocalServerPort
    private int port;

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private WorkItemService workItemService;

    @Autowired
    private WorkItemHierarchyService hierarchyService;

    @Autowired
    private WorkItemQueryService workItemQueryService;

    @Autowired
    private WorkItemTypeService workItemTypeService;

    @Autowired
    private LinkService linkService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private CurrentUser owner;
    private String workspace;
    private String project;
    private Map<String, String> types;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/work-item-type-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        for (String table : List.of(
                "notification",
                "comment",
                "activity",
                "link",
                "work_item_person",
                "work_item_label",
                "work_item",
                "work_item_type_parent",
                "work_item_type",
                "recurrence",
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
        workspace = workspaceService.create(owner, "Types", "types-" + Ids.newId());
        project = projectService.create(owner, workspace, "Project", "BIT", null);
        types = new HashMap<>();
        for (var type : workItemTypeService.list(owner, workspace)) types.put(type.name(), type.id());
    }

    @Test
    void newWorkspacesGetTheFourDefaultTypesWithTheirRules() {
        var listed = workItemTypeService.list(owner, workspace);
        assertThat(listed.stream().map(WorkItemTypeViews.Item::name)).containsExactly("에픽", "스토리", "작업", "버그");
        assertThat(listed.stream().map(WorkItemTypeViews.Item::icon)).containsExactly("epic", "story", "tasks", "bug");
        var epic = type("에픽");
        var story = type("스토리");
        var task = type("작업");
        var bug = type("버그");
        assertThat(epic.allowedParentTypeIds()).isEmpty();
        assertThat(epic.parentRequired()).isFalse();
        assertThat(story.parentRequired()).isTrue();
        assertThat(story.allowedParentTypeIds()).containsExactly(types.get("에픽"));
        assertThat(task.isDefault()).isTrue();
        assertThat(task.parentRequired()).isFalse();
        assertThat(task.allowedParentTypeIds()).containsExactly(types.get("에픽"), types.get("스토리"), types.get("작업"));
        assertThat(bug.allowedParentTypeIds()).containsExactlyElementsOf(task.allowedParentTypeIds());
        assertThat(listed.stream().filter(WorkItemTypeViews.Item::isDefault)).hasSize(1);
        assertThat(listed.stream().map(WorkItemTypeViews.Item::color).distinct())
                .hasSize(4);
    }

    @Test
    void storiesSitUnderEpicsTasksStandAloneOrUnderStoriesAndBugsUnderTasks() {
        String epic = create("Epic", "에픽", null);
        String story = hierarchyService.createChild(owner, workspace, project, epic, "Story", null, types.get("스토리"));
        String alone = create("Alone", null, null);
        String task = hierarchyService.createChild(owner, workspace, project, story, "Task", null, null);
        String bug = create("Bug", "버그", task);

        var storyView = workItemQueryService.get(owner, workspace, project, story);
        assertThat(storyView.type().name()).isEqualTo("스토리");
        assertThat(storyView.type().icon()).isEqualTo("story");
        assertThat(storyView.parentId()).isEqualTo(epic);
        var aloneView = workItemQueryService.get(owner, workspace, project, alone);
        assertThat(aloneView.type().id()).isEqualTo(types.get("작업"));
        assertThat(aloneView.parentId()).isNull();
        assertThat(workItemQueryService.get(owner, workspace, project, task).parentId())
                .isEqualTo(story);
        assertThat(workItemQueryService.get(owner, workspace, project, bug).parentId())
                .isEqualTo(task);

        var request = new WorkItemRequests.ListRequest();
        request.setTypeId(List.of(types.get("버그") + "," + types.get("에픽")));
        assertThat(workItemQueryService.list(owner, workspace, project, false, request).items().stream()
                        .map(WorkItemViews.Item::id))
                .containsExactlyInAnyOrder(bug, epic);
        var all = workItemQueryService
                .list(owner, workspace, project, false, new WorkItemRequests.ListRequest())
                .items();
        assertThat(all).allSatisfy(item -> assertThat(item.type()).isNotNull());
        assertThat(all.stream()
                        .filter(item -> item.id().equals(task))
                        .findFirst()
                        .orElseThrow()
                        .parentId())
                .isEqualTo(story);
        assertThat(type("작업").workItemCount()).isEqualTo(2);

        // An event has no type and sits under anything, as before.
        String event = workItemService.create(
                owner,
                workspace,
                project,
                WorkItem.Kind.event,
                null,
                story,
                new WorkItem.Details("Review", null, null, null, Set.of(), null, null, Instant.now(), null, false),
                null,
                Set.of(),
                null);
        var eventView = workItemQueryService.get(owner, workspace, project, event);
        assertThat(eventView.type()).isNull();
        assertThat(eventView.parentId()).isEqualTo(story);
        assertThat(code(() -> workItemService.create(
                        owner,
                        workspace,
                        project,
                        WorkItem.Kind.event,
                        types.get("작업"),
                        null,
                        new WorkItem.Details(
                                "Typed event", null, null, null, Set.of(), null, null, Instant.now(), null, false),
                        null,
                        Set.of(),
                        null)))
                .isEqualTo("WORK_ITEM_TYPE_INVALID");
    }

    @Test
    void creatingOrLinkingAgainstTheRulesIsRefusedWithWhatToDo() {
        String epic = create("Epic", "에픽", null);
        String task = create("Task", null, null);
        var missing = catchThrowableOfType(BusinessException.class, () -> create("Story", "스토리", null));
        assertThat(missing.errorCode().code()).isEqualTo("WORK_ITEM_PARENT_REQUIRED");
        assertThat(missing.getMessage()).contains("스토리", "에픽", "create_subtask", "parentId");
        assertThat(workItemQueryService
                        .list(owner, workspace, project, false, new WorkItemRequests.ListRequest())
                        .items())
                .hasSize(2);

        var wrong = catchThrowableOfType(
                BusinessException.class,
                () -> hierarchyService.createChild(owner, workspace, project, task, "Story", null, types.get("스토리")));
        assertThat(wrong.errorCode().code()).isEqualTo("WORK_ITEM_PARENT_NOT_ALLOWED");
        assertThat(wrong.getMessage()).contains("'스토리'", "'작업'", "BIT-2", "에픽");

        // An epic is top-level, so it cannot be linked under anything.
        assertThat(code(() -> linkService.connect(
                        owner, workspace, TargetType.work_item, epic, "subtask_of", TargetType.work_item, task)))
                .isEqualTo("WORK_ITEM_PARENT_NOT_ALLOWED");

        // An event cannot be a typed work item's parent.
        String event = workItemService.create(
                owner,
                workspace,
                project,
                WorkItem.Kind.event,
                new WorkItem.Details("Meeting", null, null, null, Set.of(), null, null, Instant.now(), null, false),
                null,
                Set.of());
        var underEvent = catchThrowableOfType(
                BusinessException.class,
                () -> linkService.connect(
                        owner, workspace, TargetType.work_item, task, "subtask_of", TargetType.work_item, event));
        assertThat(underEvent.errorCode().code()).isEqualTo("WORK_ITEM_PARENT_NOT_ALLOWED");
        assertThat(underEvent.getMessage()).contains("일정");

        // A story's only link to its epic cannot be cut, but it can move to another epic in one step.
        String story = hierarchyService.createChild(owner, workspace, project, epic, "Story", null, types.get("스토리"));
        String link = linkService.relations(owner, workspace, TargetType.work_item, story).stream()
                .filter(r -> r.relation().equals("subtask_of") && r.outgoing())
                .findFirst()
                .orElseThrow()
                .linkId();
        var cut = catchThrowableOfType(BusinessException.class, () -> linkService.disconnect(owner, workspace, link));
        assertThat(cut.errorCode().code()).isEqualTo("WORK_ITEM_PARENT_REQUIRED");
        assertThat(cut.getMessage()).contains("BIT-", "에픽");
        String other = create("Other epic", "에픽", null);
        var reparent = update(version(story));
        reparent.setParentId(other);
        workItemService.revise(owner, workspace, project, story, reparent);
        assertThat(workItemQueryService.get(owner, workspace, project, story).parentId())
                .isEqualTo(other);
        var orphan = update(version(story));
        orphan.setParentId(null);
        assertThat(code(() -> workItemService.revise(owner, workspace, project, story, orphan)))
                .isEqualTo("WORK_ITEM_PARENT_REQUIRED");
        var underTask = update(version(story));
        underTask.setParentId(task);
        assertThat(code(() -> workItemService.revise(owner, workspace, project, story, underTask)))
                .isEqualTo("WORK_ITEM_PARENT_NOT_ALLOWED");
        assertThat(workItemQueryService.get(owner, workspace, project, story).parentId())
                .isEqualTo(other);

        // A task's own optional link may be cut.
        String child = hierarchyService.createChild(owner, workspace, project, task, "Child", null, null);
        String childLink = linkService.relations(owner, workspace, TargetType.work_item, child).stream()
                .filter(r -> r.relation().equals("subtask_of") && r.outgoing())
                .findFirst()
                .orElseThrow()
                .linkId();
        linkService.disconnect(owner, workspace, childLink);
        assertThat(workItemQueryService.get(owner, workspace, project, child).parentId())
                .isNull();
    }

    @Test
    void changingTypeIsCheckedAgainstTheParentAndTheChildrenAndKindNeverChanges() {
        String epic = create("Epic", "에픽", null);
        String story = hierarchyService.createChild(owner, workspace, project, epic, "Story", null, types.get("스토리"));
        String task = hierarchyService.createChild(owner, workspace, project, story, "Task", null, null);

        // The task under a story cannot become an epic (top-level) ...
        var toEpic = update(version(task));
        toEpic.setTypeId(types.get("에픽"));
        assertThat(code(() -> workItemService.revise(owner, workspace, project, task, toEpic)))
                .isEqualTo("WORK_ITEM_PARENT_NOT_ALLOWED");
        // ... but may become a bug, which the activity records.
        var toBug = update(version(task));
        toBug.setTypeId(types.get("버그"));
        workItemService.revise(owner, workspace, project, task, toBug);
        assertThat(workItemQueryService
                        .get(owner, workspace, project, task)
                        .type()
                        .name())
                .isEqualTo("버그");
        assertThat(jdbcTemplate.queryForList(
                        "SELECT payload FROM activity WHERE target_type='work_item' AND target_id=? AND type='changed'",
                        String.class,
                        task))
                .anySatisfy(payload ->
                        assertThat(payload).contains("\"field\":\"type\"", types.get("작업"), types.get("버그")));

        // The epic's story child does not allow a bug above it.
        var epicToBug = update(version(epic));
        epicToBug.setTypeId(types.get("버그"));
        var children = catchThrowableOfType(
                BusinessException.class, () -> workItemService.revise(owner, workspace, project, epic, epicToBug));
        assertThat(children.errorCode().code()).isEqualTo("WORK_ITEM_PARENT_NOT_ALLOWED");
        assertThat(children.getMessage()).contains("하위 업무 1개", "스토리", "'버그'");

        // A task never becomes an event (D-108), whatever its place among the types.
        var toEvent = update(version(story));
        toEvent.setKind(WorkItem.Kind.event);
        assertThat(code(() -> workItemService.revise(owner, workspace, project, story, toEvent)))
                .isEqualTo("WORK_ITEM_KIND_FIXED");
        String loose = create("Loose", null, null);

        // Changing the type and the parent together is checked as one change.
        var promote = update(version(loose));
        promote.setTypeId(types.get("스토리"));
        assertThat(code(() -> workItemService.revise(owner, workspace, project, loose, promote)))
                .isEqualTo("WORK_ITEM_PARENT_REQUIRED");
        var promoteUnder = update(version(loose));
        promoteUnder.setTypeId(types.get("스토리"));
        promoteUnder.setParentId(epic);
        workItemService.revise(owner, workspace, project, loose, promoteUnder);
        var promoted = workItemQueryService.get(owner, workspace, project, loose);
        assertThat(promoted.type().name()).isEqualTo("스토리");
        assertThat(promoted.parentId()).isEqualTo(epic);
    }

    @Test
    void deletingAParentKeepsItsChildrensLinksUntilTheNextChange() {
        String epic = create("Epic", "에픽", null);
        String story = hierarchyService.createChild(owner, workspace, project, epic, "Story", null, types.get("스토리"));
        workItemService.delete(owner, workspace, project, epic, version(epic));
        var view = workItemQueryService.get(owner, workspace, project, story);
        assertThat(view.parentId()).isNull();
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM link WHERE from_id=? AND to_id=? AND deleted_at IS NULL",
                        Integer.class,
                        story,
                        epic))
                .isEqualTo(1);
        // Other edits are not checked again.
        var rename = update(view.version());
        rename.setTitle("Renamed story");
        workItemService.revise(owner, workspace, project, story, rename);
        assertThat(workItemQueryService.get(owner, workspace, project, story).title())
                .isEqualTo("Renamed story");
    }

    @Test
    void typeRulesCannotChangeUnderTheItemsThatFollowThem() {
        String epic = create("Epic", "에픽", null);
        String task = create("Task", null, null);
        hierarchyService.createChild(owner, workspace, project, task, "Sub one", null, null);
        hierarchyService.createChild(owner, workspace, project, task, "Sub two", null, null);
        hierarchyService.createChild(owner, workspace, project, epic, "Under epic", null, null);

        // Two 작업 sit under a 작업, so 작업 cannot stop allowing 작업 above it.
        var narrow = typeUpdate(type("작업").version());
        narrow.setAllowedParentTypeIds(List.of(types.get("에픽"), types.get("스토리")));
        var conflict = catchThrowableOfType(
                BusinessException.class, () -> workItemTypeService.revise(owner, workspace, types.get("작업"), narrow));
        assertThat(conflict.errorCode().code()).isEqualTo("WORK_ITEM_TYPE_RULE_CONFLICT");
        assertThat(conflict.getMessage()).contains("2개");

        // Bugs alone would break a required parent.
        create("Bug", "버그", null);
        var required = typeUpdate(type("버그").version());
        required.setParentRequired(true);
        var bugConflict = catchThrowableOfType(
                BusinessException.class, () -> workItemTypeService.revise(owner, workspace, types.get("버그"), required));
        assertThat(bugConflict.errorCode().code()).isEqualTo("WORK_ITEM_TYPE_RULE_CONFLICT");
        assertThat(bugConflict.getMessage()).contains("1개");

        // A rule no item breaks may change: 에픽 may now sit under 에픽.
        var nested = typeUpdate(type("에픽").version());
        nested.setAllowedParentTypeIds(List.of(types.get("에픽")));
        workItemTypeService.revise(owner, workspace, types.get("에픽"), nested);
        assertThat(type("에픽").allowedParentTypeIds()).containsExactly(types.get("에픽"));

        // Required needs at least one allowed parent, and the default type never requires one.
        var empty = typeUpdate(type("스토리").version());
        empty.setAllowedParentTypeIds(List.of());
        assertThat(code(() -> workItemTypeService.revise(owner, workspace, types.get("스토리"), empty)))
                .isEqualTo("WORK_ITEM_TYPE_RULE_INVALID");
        var defaultRequired = typeUpdate(type("작업").version());
        defaultRequired.setParentRequired(true);
        assertThat(code(() -> workItemTypeService.revise(owner, workspace, types.get("작업"), defaultRequired)))
                .isEqualTo("WORK_ITEM_TYPE_RULE_INVALID");
        var foreign = typeUpdate(type("버그").version());
        foreign.setAllowedParentTypeIds(List.of(Ids.newId()));
        assertThat(code(() -> workItemTypeService.revise(owner, workspace, types.get("버그"), foreign)))
                .isEqualTo("WORK_ITEM_TYPE_INVALID");
    }

    @Test
    void typesAreMadeOrderedRenamedAndDeletedOnlyWhileNothingDependsOnThem() {
        String design = workItemTypeService.create(
                owner,
                workspace,
                new WorkItemTypeRequests.Create("디자인", "design", "#F59E0B", false, List.of(types.get("버그")), false));
        var made = workItemTypeService.get(owner, workspace, design);
        assertThat(made.color()).isEqualTo("#f59e0b");
        assertThat(made.position()).isEqualTo(4);
        assertThat(code(() -> workItemTypeService.create(
                        owner, workspace, new WorkItemTypeRequests.Create(" 버그 ", null, "#000000", null, null, null))))
                .isEqualTo("WORK_ITEM_TYPE_NAME_CONFLICT");
        assertThat(code(() -> workItemTypeService.create(
                        owner, workspace, new WorkItemTypeRequests.Create("Needs", null, "#000000", true, null, null))))
                .isEqualTo("WORK_ITEM_TYPE_RULE_INVALID");

        // The default moves whole: one type has it at a time, and the default cannot be unset by itself.
        var unset = typeUpdate(type("작업").version());
        unset.setIsDefault(false);
        assertThat(code(() -> workItemTypeService.revise(owner, workspace, types.get("작업"), unset)))
                .isEqualTo("WORK_ITEM_TYPE_RULE_INVALID");
        var makeDefault = typeUpdate(made.version());
        makeDefault.setIsDefault(true);
        workItemTypeService.revise(owner, workspace, design, makeDefault);
        assertThat(type("디자인").isDefault()).isTrue();
        assertThat(type("작업").isDefault()).isFalse();
        assertThat(workItemQueryService
                        .get(owner, workspace, project, create("Plain", null, null))
                        .type()
                        .name())
                .isEqualTo("디자인");
        var stale = typeUpdate(0L);
        stale.setName("Old");
        assertThat(code(() -> workItemTypeService.revise(owner, workspace, types.get("작업"), stale)))
                .isEqualTo("WORK_ITEM_TYPE_VERSION_CONFLICT");

        // Reordering takes the whole set with each type's version.
        var before = workItemTypeService.list(owner, workspace);
        var reversed = before.reversed().stream()
                .map(t -> new WorkItemTypeRequests.OrderItem(t.id(), t.version()))
                .toList();
        workItemTypeService.reorder(owner, workspace, new WorkItemTypeRequests.Order(reversed));
        assertThat(workItemTypeService.list(owner, workspace).stream().map(WorkItemTypeViews.Item::id))
                .containsExactlyElementsOf(before.reversed().stream()
                        .map(WorkItemTypeViews.Item::id)
                        .toList());
        assertThat(code(() -> workItemTypeService.reorder(
                        owner, workspace, new WorkItemTypeRequests.Order(reversed.subList(1, reversed.size())))))
                .isEqualTo("COMMON_INVALID_REQUEST");

        // In use, default, and the only parent of a type that needs one: none of these can go.
        assertThat(code(() -> workItemTypeService.delete(
                        owner, workspace, design, type("디자인").version())))
                .isEqualTo("WORK_ITEM_TYPE_IN_USE");
        create("Task", "작업", null);
        var used = catchThrowableOfType(
                BusinessException.class,
                () -> workItemTypeService.delete(
                        owner, workspace, types.get("작업"), type("작업").version()));
        assertThat(used.errorCode().code()).isEqualTo("WORK_ITEM_TYPE_IN_USE");
        assertThat(used.getMessage()).contains("1개");
        assertThat(code(() -> workItemTypeService.delete(
                        owner, workspace, types.get("에픽"), type("에픽").version())))
                .isEqualTo("WORK_ITEM_TYPE_RULE_CONFLICT");

        // An unused type goes, and leaves the sets it was in.
        workItemTypeService.delete(owner, workspace, types.get("버그"), type("버그").version());
        assertThat(workItemTypeService.list(owner, workspace).stream().map(WorkItemTypeViews.Item::name))
                .doesNotContain("버그");
        assertThat(type("디자인").allowedParentTypeIds()).isEmpty();
        assertThat(type("작업").allowedParentTypeIds()).doesNotContain(types.get("버그"));
        // Its name is free again.
        workItemTypeService.create(
                owner, workspace, new WorkItemTypeRequests.Create("버그", "bug", "#ef4444", null, null, null));
        assertThat(code(() -> {
                    var request = update(0);
                    request.setTypeId(types.get("버그"));
                    workItemService.revise(owner, workspace, project, create("X", null, null), request);
                }))
                .isEqualTo("WORK_ITEM_TYPE_INVALID");
    }

    @Test
    void membersReadTypesOutsidersSeeNothingAndOnlySettingsEditorsChangeThem() throws Exception {
        CurrentUser member = identity("member");
        membership(member, "member");
        CurrentUser outsider = identity("outsider");
        String path = "/api/v1/workspaces/" + workspace + "/work-item-types";
        String body = JSON.writeValueAsString(Map.of("name", "디자인", "color", "#f59e0b"));
        try (var client = login(member)) {
            var listed = http(client, "GET", path, null);
            expect(listed, 200);
            assertThat(JSON.readTree(listed.body()).size()).isEqualTo(4);
            expect(http(client, "GET", path + "/" + types.get("에픽"), null), 200);
            expect(http(client, "POST", path, body), 403);
            expect(http(client, "DELETE", path + "/" + types.get("버그") + "?expectedVersion=0", null), 403);
        }
        try (var client = login(outsider)) {
            expect(http(client, "GET", path, null), 404);
            expect(http(client, "POST", path, "{\"name\":"), 404);
        }
        try (var client = login(owner)) {
            var created = http(client, "POST", path, body);
            expect(created, 201);
            assertThat(created.headers().firstValue("Location").orElseThrow()).startsWith(path + "/");
            expect(http(client, "GET", path + "/" + Ids.newId(), null), 404);
            expect(http(client, "PATCH", path + "/" + types.get("에픽"), "{\"expectedVersion\":0,\"bogus\":1}"), 400);
            expect(
                    http(
                            client,
                            "PATCH",
                            path + "/" + types.get("에픽"),
                            "{\"expectedVersion\":0,\"icon\":null,\"color\":\"#123456\"}"),
                    204);
            assertThat(type("에픽").icon()).isNull();

            // A story is made from the screen by choosing its epic, in one request.
            String epic = create("Epic", "에픽", null);
            String items = "/api/v1/workspaces/" + workspace + "/projects/" + project + "/work-items";
            var refused = http(
                    client,
                    "POST",
                    items,
                    JSON.writeValueAsString(Map.of("title", "Story", "typeId", types.get("스토리"))));
            expect(refused, 409);
            assertThat(JSON.readTree(refused.body()).path("code").asText()).isEqualTo("WORK_ITEM_PARENT_REQUIRED");
            assertThat(JSON.readTree(refused.body()).path("detail").asText()).contains("에픽");
            var story = http(
                    client,
                    "POST",
                    items,
                    JSON.writeValueAsString(Map.of("title", "Story", "typeId", types.get("스토리"), "parentId", epic)));
            expect(story, 201);
            String storyId =
                    story.headers().firstValue("Location").orElseThrow().replaceFirst(".*/", "");
            var read = JSON.readTree(
                    http(client, "GET", items + "/" + storyId, null).body());
            assertThat(read.path("type").path("name").asText()).isEqualTo("스토리");
            assertThat(read.path("parentId").asText()).isEqualTo(epic);
            var child = http(
                    client,
                    "POST",
                    items + "/" + storyId + "/children",
                    JSON.writeValueAsString(Map.of("title", "Bug", "typeId", types.get("버그"))));
            expect(child, 201);
            var epicChild = http(
                    client,
                    "POST",
                    items + "/" + storyId + "/children",
                    JSON.writeValueAsString(Map.of("title", "Nested epic", "typeId", types.get("에픽"))));
            expect(epicChild, 409);
            assertThat(JSON.readTree(epicChild.body()).path("code").asText()).isEqualTo("WORK_ITEM_PARENT_NOT_ALLOWED");
            var filtered = JSON.readTree(http(client, "GET", items + "?typeId=" + types.get("버그"), null)
                    .body());
            assertThat(filtered.path("items").size()).isEqualTo(1);
            var relation = http(
                    client,
                    "POST",
                    "/api/v1/workspaces/" + workspace + "/relations",
                    JSON.writeValueAsString(Map.of(
                            "fromType",
                            "work_item",
                            "fromId",
                            epic,
                            "relation",
                            "subtask_of",
                            "toType",
                            "work_item",
                            "toId",
                            storyId)));
            expect(relation, 409);
        }
    }

    @Test
    void anAgentListsTypesAndMakesWorkItemsByTypeName() throws Exception {
        String password = "owner" + PASSWORD;
        String email = jdbcTemplate.queryForObject(
                "SELECT email FROM iam_user WHERE iam_user_id=?", String.class, owner.userId());
        try (var client = login(owner, password)) {
            var keyResponse = http(
                    client,
                    "POST",
                    "/api/v1/me/api-keys",
                    JSON.writeValueAsString(
                            Map.of("name", "Agent", "agentName", "type-agent", "currentPassword", password)));
            expect(keyResponse, 201);
            String key = JSON.readTree(keyResponse.body()).path("key").asText();
            assertThat(email).isNotBlank();

            var listed = JSON.readTree(text(call(client, key, "list_work_item_types", Map.of())));
            assertThat(listed.size()).isEqualTo(4);
            assertThat(listed.get(1).path("name").asText()).isEqualTo("스토리");
            assertThat(listed.get(1).path("parentRequired").asBoolean()).isTrue();
            assertThat(listed.get(1).path("allowedParents").get(0).asText()).isEqualTo("에픽");
            assertThat(listed.get(2).path("isDefault").asBoolean()).isTrue();

            var epic = JSON.readTree(text(
                    call(client, key, "create_work_item", Map.of("project", "BIT", "title", "Epic", "type", "에픽"))));
            assertThat(epic.path("type").asText()).isEqualTo("에픽");
            var refused =
                    call(client, key, "create_work_item", Map.of("project", "BIT", "title", "Story", "type", "스토리"));
            assertThat(refused.path("isError").asBoolean()).isTrue();
            assertThat(text(refused)).contains("WORK_ITEM_PARENT_REQUIRED", "create_subtask");
            var unknown =
                    call(client, key, "create_work_item", Map.of("project", "BIT", "title", "Story", "type", "에픽2"));
            assertThat(text(unknown)).contains("에픽, 스토리, 작업, 버그");

            var story = JSON.readTree(text(call(
                    client,
                    key,
                    "create_subtask",
                    Map.of("parent", epic.path("ref").asText(), "title", "Story", "type", "스토리"))));
            assertThat(story.path("type").asText()).isEqualTo("스토리");
            assertThat(story.path("parent").asText()).isEqualTo(epic.path("ref").asText());

            var task = JSON.readTree(
                    text(call(client, key, "create_work_item", Map.of("project", "BIT", "title", "Task"))));
            assertThat(task.path("type").asText()).isEqualTo("작업");
            var moved = JSON.readTree(text(call(
                    client,
                    key,
                    "update_work_item",
                    Map.of(
                            "ref",
                            task.path("ref").asText(),
                            "parent",
                            story.path("ref").asText(),
                            "type",
                            "버그"))));
            assertThat(moved.path("type").asText()).isEqualTo("버그");
            assertThat(moved.path("parent").asText())
                    .isEqualTo(story.path("ref").asText());

            var bugs = JSON.readTree(text(call(client, key, "list_work_items", Map.of("type", "버그"))));
            assertThat(bugs.path("items").size()).isEqualTo(1);
            assertThat(bugs.path("items").get(0).path("parent").asText())
                    .isEqualTo(story.path("ref").asText());
            var context = JSON.readTree(text(call(
                    client,
                    key,
                    "get_work_item_context",
                    Map.of("ref", task.path("ref").asText()))));
            assertThat(context.path("timeline").toString()).contains("유형: 작업 → 버그");
        }
    }

    private String create(String title, String typeName, String parentId) {
        return workItemService.create(
                owner,
                workspace,
                project,
                WorkItem.Kind.task,
                typeName == null ? null : types.get(typeName),
                parentId,
                new WorkItem.Details(title, null, null, null, (String) null, null, null),
                null,
                Set.of(),
                null);
    }

    private WorkItemTypeViews.Item type(String name) {
        return workItemTypeService.list(owner, workspace).stream()
                .filter(t -> t.name().equals(name))
                .findFirst()
                .orElseThrow();
    }

    private long version(String item) {
        return workItemQueryService.get(owner, workspace, project, item).version();
    }

    private static WorkItemRequests.Update update(long version) {
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(version);
        return update;
    }

    private static WorkItemTypeRequests.Update typeUpdate(long version) {
        var update = new WorkItemTypeRequests.Update();
        update.setExpectedVersion(version);
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
                passwordEncoder.encode(role + PASSWORD),
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
        return login(actor, role + PASSWORD);
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
                        JSON.writeValueAsString(Map.of("email", email, "password", password))),
                201);
        return client;
    }

    private tools.jackson.databind.JsonNode call(HttpClient client, String key, String tool, Map<String, Object> args)
            throws Exception {
        var response = client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/mcp"))
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json, text/event-stream")
                        .header("Authorization", "Bearer " + key)
                        .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(Map.of(
                                "jsonrpc",
                                "2.0",
                                "id",
                                1,
                                "method",
                                "tools/call",
                                "params",
                                Map.of("name", tool, "arguments", args)))))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        expect(response, 200);
        return JSON.readTree(response.body()).path("result");
    }

    private static String text(tools.jackson.databind.JsonNode result) {
        return result.path("content").get(0).path("text").asText();
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
