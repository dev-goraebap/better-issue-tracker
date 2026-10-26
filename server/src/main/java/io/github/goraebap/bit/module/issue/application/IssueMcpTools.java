package io.github.goraebap.bit.module.issue.application;

import io.github.goraebap.bit.module.issue.IssueFacade;
import io.github.goraebap.bit.module.issue.domain.Issue;
import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.link.CommentFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.TimelineFacade;
import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * An agent's work on issues over MCP (D-081): reading one in full (its description, comments and activity in one
 * call, the context D-022 puts first), listing, creating, changing, moving and commenting. Issues are named by their
 * key (ORM-14), projects by their key, columns, people and labels by name, so an agent never handles ids. Each tool
 * runs the same Service as the HTTP API, so the same roles and checks hold, and its writes carry the key's agent name.
 */
@Component
@RequiredArgsConstructor
class IssueMcpTools implements McpToolProvider {
    private static final String WORKSPACE = "워크스페이스 이름이나 슬러그. 속한 워크스페이스가 하나면 생략합니다.";
    private static final String STATUS =
            "칸 이름(예: 진행 중), 분류(todo·doing·done), 또는 backlog(상태 없음). 프로젝트마다 칸이 다르니 list_projects로 확인합니다.";
    private static final Map<String, Issue.Priority> PRIORITIES = Map.of(
            "low", Issue.Priority.low,
            "낮음", Issue.Priority.low,
            "medium", Issue.Priority.medium,
            "보통", Issue.Priority.medium,
            "high", Issue.Priority.high,
            "높음", Issue.Priority.high,
            "urgent", Issue.Priority.urgent,
            "긴급", Issue.Priority.urgent);

    private final IssueService issueService;
    private final IssueQueryService issueQueryService;
    private final IssueFacade issueFacade;
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;
    private final LabelFacade labelFacade;
    private final CommentFacade commentFacade;
    private final TimelineFacade timelineFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(
                new McpTool(
                        "get_issue_context",
                        "이슈 맥락 읽기",
                        "이슈 하나를 통째로 읽습니다: 제목, 상태, 우선순위, 담당자, 라벨, 날짜, 마크다운 설명, 그리고 댓글과 활동을 오래된 순으로. 작업을 시작하기 전에 먼저 부르세요.",
                        McpTool.input()
                                .string("ref", "이슈 참조. 예: ORM-14", true)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        true,
                        this::context),
                new McpTool(
                        "list_issues",
                        "이슈 목록",
                        "이슈를 찾습니다. 프로젝트를 주면 그 프로젝트, 없으면 워크스페이스 전체에서 최근 만든 순으로. 완료한 이슈는 include_closed를 줄 때만 나옵니다.",
                        McpTool.input()
                                .string("project", "프로젝트 키. 예: ORM", false)
                                .string("query", "제목에서 찾을 말", false)
                                .choice("category", "상태 분류로 거르기", List.of("todo", "doing", "done", "none"), false)
                                .string("assignee", "담당자: me, 이메일, 또는 이름", false)
                                .string("label", "라벨 이름. 예: 결정기록", false)
                                .bool("include_closed", "완료한 이슈도 넣을지. 결정기록은 대부분 완료 상태라 찾을 때 true를 주세요.")
                                .integer("limit", "가져올 개수 (기본 30)", 1, 100)
                                .string("cursor", "앞 응답의 nextCursor로 다음 쪽을 읽습니다", false)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        true,
                        this::list),
                new McpTool(
                        "create_issue",
                        "이슈 만들기",
                        "새 이슈를 만들고 참조(예: ORM-20)를 돌려줍니다. 설명은 마크다운입니다. 의미 있는 판단은 labels에 '결정기록'을 넣고 설명을 ## 배경 / ## 선택지 / ## 결정 / ## 이유 / ## 기각한 대안 / ## 후속 작업 으로 쓰세요.",
                        McpTool.input()
                                .string("project", "프로젝트 키. 예: ORM", true)
                                .string("title", "제목", true)
                                .string("description", "마크다운 설명", false)
                                .string("status", STATUS + " 생략하면 첫 '할 일' 칸입니다.", false)
                                .choice(
                                        "priority",
                                        "우선순위 (기본 medium)",
                                        List.of("low", "medium", "high", "urgent"),
                                        false)
                                .string("assignee", "담당자: me, 이메일, 또는 이름", false)
                                .strings("labels", "라벨 이름들. 예: [\"버그\"]", false)
                                .string("start_date", "시작일 YYYY-MM-DD", false)
                                .string("due_date", "기한 YYYY-MM-DD", false)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::create),
                new McpTool(
                        "update_issue",
                        "이슈 고치기",
                        "이슈의 준 값만 바꿉니다. 값을 지우려면 assignee·priority·start_date·due_date에 none을 주세요. labels는 준 목록으로 통째로 바꿉니다. 상태는 move_issue으로 옮깁니다.",
                        McpTool.input()
                                .string("ref", "이슈 참조. 예: ORM-14", true)
                                .string("title", "새 제목", false)
                                .string("description", "새 마크다운 설명 (통째로 바뀝니다)", false)
                                .choice("priority", "우선순위", List.of("low", "medium", "high", "urgent", "none"), false)
                                .string("assignee", "담당자: me, 이메일, 이름, 또는 none", false)
                                .strings("labels", "라벨 이름들 (이 목록으로 바뀝니다)", false)
                                .string("start_date", "시작일 YYYY-MM-DD 또는 none", false)
                                .string("due_date", "기한 YYYY-MM-DD 또는 none", false)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::update),
                new McpTool(
                        "move_issue",
                        "이슈 상태 옮기기",
                        "이슈를 다른 칸으로 옮기거나(완료 칸이면 완료로 기록) 보관·보관 해제합니다.",
                        McpTool.input()
                                .string("ref", "이슈 참조. 예: ORM-14", true)
                                .string("status", STATUS, false)
                                .bool("archive", "true면 보관, false면 보관 해제")
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::move),
                new McpTool(
                        "add_comment",
                        "댓글 남기기",
                        "이슈에 마크다운 댓글을 남깁니다. 작업 진행, 결과, 막힌 점을 사람이 읽을 수 있게 남기세요.",
                        McpTool.input()
                                .string("ref", "이슈 참조. 예: ORM-14", true)
                                .string("body", "마크다운 본문", true)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::comment));
    }

    private Object context(CurrentUser actor, McpArguments args) {
        var at = locate(actor, args);
        var item = issueQueryService.get(actor, at.workspaceId(), at.projectId(), at.id());
        var columns = columns(actor, at);
        var people = workspaceFacade.members(actor, at.workspaceId()).stream()
                .collect(Collectors.toMap(WorkspaceFacade.MemberRef::userId, WorkspaceFacade.MemberRef::name));
        var labels = labelFacade.findAll(actor, at.workspaceId()).stream()
                .collect(Collectors.toMap(LabelFacade.LabelRef::id, LabelFacade.LabelRef::name));
        var view = summary(item, columns);
        view.put("description", item.description());
        view.put("createdAt", item.createdAt());
        view.put("createdByAgent", item.createdByAgent());
        view.put("updatedAt", item.updatedAt());
        var timeline = timelineFacade.lines(actor, at.workspaceId(), TargetType.issue, at.id(), 200).stream()
                .map(line -> line(line, columns, people, labels))
                .toList();
        view.put("timeline", timeline);
        return view;
    }

    private Object list(CurrentUser actor, McpArguments args) {
        String workspace =
                workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
        var project = args.optionalString("project").map(key -> projectFacade.findByKey(actor, workspace, key));
        var filters = project.isPresent() ? new IssueRequests.ListRequest() : new IssueRequests.WorkspaceListRequest();
        args.optionalString("query").ifPresent(filters::setQ);
        args.optionalString("category").ifPresent(category -> filters.setCategory(List.of(category)));
        args.optionalString("assignee").ifPresent(name -> filters.setAssigneeId(person(actor, workspace, name)));
        args.optionalString("label")
                .ifPresent(name -> filters.setLabelId(List.copyOf(labelIds(actor, workspace, List.of(name)))));
        if (!args.bool("include_closed").orElse(false)) filters.setClosed(false);
        filters.setSize(Math.clamp(args.integer("limit", 30), 1, 100));
        args.optionalString("cursor").ifPresent(filters::setCursor);
        var page = filters instanceof IssueRequests.ListRequest inProject
                ? issueQueryService.list(actor, workspace, project.orElseThrow().id(), false, inProject)
                : issueQueryService.listWorkspace(actor, workspace, (IssueRequests.WorkspaceListRequest) filters);
        // Each project's columns read once, so every issue says its column by name.
        var boards = new java.util.HashMap<String, List<ProjectFacade.ColumnInfo>>();
        var result = new LinkedHashMap<String, Object>();
        result.put(
                "items",
                page.items().stream()
                        .map(item -> summary(
                                item,
                                boards.computeIfAbsent(
                                        item.projectId(), id -> projectFacade.boardColumns(actor, workspace, id))))
                        .toList());
        result.put("nextCursor", page.nextCursor());
        return result;
    }

    private Object create(CurrentUser actor, McpArguments args) {
        String workspace =
                workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
        var project = projectFacade.findByKey(actor, workspace, args.string("project"));
        var columns = projectFacade.boardColumns(actor, workspace, project.id());
        String column = args.optionalString("status")
                .map(status -> column(columns, status))
                .orElseGet(() -> columns.stream()
                        .filter(c -> c.category() != null
                                && "todo".equals(c.category().name()))
                        .findFirst()
                        .or(() -> columns.stream().findFirst())
                        .map(ProjectFacade.ColumnInfo::id)
                        .orElse(null));
        var details = new Issue.Details(
                args.string("title"),
                args.optionalString("description").orElse(null),
                args.optionalString("priority").map(this::priority).orElse(Issue.Priority.medium),
                null,
                args.optionalString("assignee")
                        .map(name -> person(actor, workspace, name))
                        .orElse(null),
                args.date("start_date").orElse(null),
                args.date("due_date").orElse(null));
        Set<String> labels = args.strings("labels")
                .map(names -> labelIds(actor, workspace, names))
                .orElse(Set.of());
        String id = issueService.create(actor, workspace, project.id(), details, column, labels);
        var item = issueQueryService.get(actor, workspace, project.id(), id);
        return summary(item, columns);
    }

    private Object update(CurrentUser actor, McpArguments args) {
        var at = locate(actor, args);
        var current = issueQueryService.get(actor, at.workspaceId(), at.projectId(), at.id());
        var request = new IssueRequests.Update();
        request.setExpectedVersion(current.version());
        args.optionalString("title").ifPresent(request::setTitle);
        args.optionalString("description").ifPresent(request::setDescription);
        args.optionalString("priority").ifPresent(value -> request.setPriority(isNone(value) ? null : priority(value)));
        args.optionalString("assignee")
                .ifPresent(
                        value -> request.setAssigneeId(isNone(value) ? null : person(actor, at.workspaceId(), value)));
        args.strings("labels")
                .ifPresent(names -> request.setLabelIds(List.copyOf(labelIds(actor, at.workspaceId(), names))));
        if (args.has("start_date"))
            request.setStartDate(
                    isNone(args.optionalString("start_date").orElse("none"))
                            ? null
                            : args.date("start_date").orElseThrow());
        if (args.has("due_date"))
            request.setDueDate(
                    isNone(args.optionalString("due_date").orElse("none"))
                            ? null
                            : args.date("due_date").orElseThrow());
        issueService.revise(actor, at.workspaceId(), at.projectId(), at.id(), request);
        var item = issueQueryService.get(actor, at.workspaceId(), at.projectId(), at.id());
        return summary(item, columns(actor, at));
    }

    private Object move(CurrentUser actor, McpArguments args) {
        var at = locate(actor, args);
        var status = args.optionalString("status");
        var archive = args.bool("archive");
        if (status.isEmpty() && archive.isEmpty()) throw new IllegalArgumentException("status 또는 archive 중 하나가 필요합니다.");
        var columns = columns(actor, at);
        if (status.isPresent()) {
            var item = issueQueryService.get(actor, at.workspaceId(), at.projectId(), at.id());
            issueService.move(
                    actor,
                    at.workspaceId(),
                    at.projectId(),
                    at.id(),
                    item.version(),
                    column(columns, status.get()),
                    null,
                    null);
        }
        if (archive.isPresent()) {
            var item = issueQueryService.get(actor, at.workspaceId(), at.projectId(), at.id());
            issueService.archive(actor, at.workspaceId(), at.projectId(), at.id(), item.version(), archive.get());
        }
        return summary(issueQueryService.get(actor, at.workspaceId(), at.projectId(), at.id()), columns);
    }

    private Object comment(CurrentUser actor, McpArguments args) {
        var at = locate(actor, args);
        commentFacade.create(actor, at.workspaceId(), TargetType.issue, at.id(), args.string("body"));
        var result = new LinkedHashMap<String, Object>();
        result.put("ref", at.reference());
        result.put("commented", true);
        return result;
    }

    /** An issue the agent named, with its workspace: the one given, else whichever of the actor's workspaces has it. */
    private Located locate(CurrentUser actor, McpArguments args) {
        String ref = args.string("ref");
        var hint = args.optionalString("workspace");
        if (hint.isPresent()) {
            String workspace = workspaceFacade.resolve(actor, hint.get());
            return located(workspace, issueFacade.findByRef(actor, workspace, ref));
        }
        var found = new ArrayList<Located>();
        for (var space : workspaceFacade.mine(actor)) {
            try {
                found.add(located(space.id(), issueFacade.findByRef(actor, space.id(), ref)));
            } catch (BusinessException missing) {
                // Not in this workspace; the others may have it.
            }
        }
        if (found.size() == 1) return found.getFirst();
        if (found.isEmpty()) throw new IllegalArgumentException(ref + " 이슈를 찾을 수 없습니다. 참조(예: ORM-14)를 확인하세요.");
        throw new IllegalArgumentException(ref + "가 여러 워크스페이스에 있습니다. workspace 인자로 고르세요.");
    }

    private static Located located(String workspace, IssueFacade.Ref ref) {
        return new Located(workspace, ref.projectId(), ref.id(), ref.reference());
    }

    private List<ProjectFacade.ColumnInfo> columns(CurrentUser actor, Located at) {
        return projectFacade.boardColumns(actor, at.workspaceId(), at.projectId());
    }

    /** A column by its name, else the first of a category, or backlog for none. */
    private static String column(List<ProjectFacade.ColumnInfo> columns, String status) {
        String wanted = status.strip();
        if (Set.of("backlog", "none", "상태 없음").contains(wanted.toLowerCase(Locale.ROOT))) return null;
        return columns.stream()
                .filter(c -> c.name().equalsIgnoreCase(wanted))
                .findFirst()
                .or(() -> columns.stream()
                        .filter(c -> c.category() != null && c.category().name().equalsIgnoreCase(wanted))
                        .findFirst())
                .map(ProjectFacade.ColumnInfo::id)
                .orElseThrow(() -> new IllegalArgumentException("'" + wanted + "' 칸이 없습니다. 이 프로젝트의 칸: "
                        + columns.stream().map(ProjectFacade.ColumnInfo::name).collect(Collectors.joining(", "))
                        + ", backlog"));
    }

    /** A member by me, their email or their name. */
    private String person(CurrentUser actor, String workspace, String who) {
        if ("me".equalsIgnoreCase(who) || "나".equals(who)) return actor.userId();
        var members = workspaceFacade.members(actor, workspace);
        return members.stream()
                .filter(m -> m.email().equalsIgnoreCase(who) || m.name().equals(who))
                .map(WorkspaceFacade.MemberRef::userId)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("'" + who + "' 구성원이 없습니다. 구성원: "
                        + members.stream().map(WorkspaceFacade.MemberRef::name).collect(Collectors.joining(", "))));
    }

    private Set<String> labelIds(CurrentUser actor, String workspace, List<String> names) {
        var labels = labelFacade.findAll(actor, workspace);
        Map<String, String> byName = labels.stream()
                .collect(Collectors.toMap(
                        label -> label.name().toLowerCase(Locale.ROOT), LabelFacade.LabelRef::id, (a, b) -> a));
        var ids = new java.util.LinkedHashSet<String>();
        for (String name : names) {
            String id = byName.get(name.toLowerCase(Locale.ROOT));
            if (id == null)
                throw new IllegalArgumentException("'" + name + "' 라벨이 없습니다. 라벨: "
                        + labels.stream().map(LabelFacade.LabelRef::name).collect(Collectors.joining(", ")));
            ids.add(id);
        }
        return ids;
    }

    private Issue.Priority priority(String value) {
        var priority = PRIORITIES.get(value.toLowerCase(Locale.ROOT));
        if (priority == null) throw new IllegalArgumentException("priority는 low, medium, high, urgent 중 하나입니다.");
        return priority;
    }

    private static boolean isNone(String value) {
        return "none".equalsIgnoreCase(value) || "없음".equals(value);
    }

    /** An issue as an agent reads it in a list: its key, title, status, priority, assignee, labels and dates. */
    private static LinkedHashMap<String, Object> summary(IssueViews.Item item, List<ProjectFacade.ColumnInfo> columns) {
        var view = new LinkedHashMap<String, Object>();
        view.put("ref", item.key());
        view.put("title", item.title());
        String column = columns.stream()
                .filter(c -> c.id().equals(item.columnId()))
                .map(ProjectFacade.ColumnInfo::name)
                .findFirst()
                .orElse(item.columnId() == null ? "상태 없음" : null);
        if (column != null) view.put("status", column);
        view.put(
                "category",
                item.columnCategory() == null ? "none" : item.columnCategory().name());
        view.put("priority", item.priority());
        view.put("assignee", item.assigneeName());
        view.put("labels", item.labels().stream().map(IssueViews.Label::name).toList());
        view.put("startDate", item.startDate());
        view.put("dueDate", item.dueDate());
        view.put("closed", item.closedAt() != null);
        view.put("archived", item.archivedAt() != null);
        return view;
    }

    /** A timeline line with its ids named: who, when, and the comment or what changed. */
    private static Map<String, Object> line(
            TimelineFacade.Line line,
            List<ProjectFacade.ColumnInfo> columns,
            Map<String, String> people,
            Map<String, String> labels) {
        var view = new LinkedHashMap<String, Object>();
        view.put("at", line.at());
        view.put("who", line.actorName());
        if (line.actorAgent() != null) view.put("agent", line.actorAgent());
        if ("comment".equals(line.kind())) {
            view.put("comment", line.body());
            if (line.editedAt() != null) view.put("edited", true);
            return view;
        }
        Function<String, String> column = id -> id == null
                ? "상태 없음"
                : columns.stream()
                        .filter(c -> c.id().equals(id))
                        .map(ProjectFacade.ColumnInfo::name)
                        .findFirst()
                        .orElse("지워진 칸");
        Function<String, String> names = ids -> ids == null
                ? "없음"
                : java.util.Arrays.stream(ids.split(","))
                        .map(id -> labels.getOrDefault(id, "지워진 라벨"))
                        .collect(Collectors.joining(", "));
        Function<String, String> person = id -> id == null ? "없음" : people.getOrDefault(id, "지워진 구성원");
        String text =
                switch (Objects.requireNonNullElse(line.action(), "")) {
                    case "created" -> "이슈를 만듦";
                    case "deleted" -> "이슈를 삭제함";
                    case "restored" -> "이슈를 되살림";
                    default ->
                        switch (Objects.requireNonNullElse(line.field(), "")) {
                            case "column" -> "상태: " + column.apply(line.before()) + " → " + column.apply(line.after());
                            case "title" -> "제목: '" + line.before() + "' → '" + line.after() + "'";
                            case "description" -> "설명을 고침";
                            case "assignee" -> "담당자: " + person.apply(line.after());
                            case "labels" -> "라벨: " + names.apply(line.before()) + " → " + names.apply(line.after());
                            case "priority" -> "우선순위: " + Objects.requireNonNullElse(line.after(), "없음");
                            case "startDate" -> "시작일: " + Objects.requireNonNullElse(line.after(), "없음");
                            case "dueDate" -> "기한: " + Objects.requireNonNullElse(line.after(), "없음");
                            case "archived" -> "true".equals(line.after()) ? "보관함" : "보관을 풂";
                            default -> "이슈를 고침";
                        };
                };
        view.put("activity", text);
        return view;
    }

    private record Located(String workspaceId, String projectId, String id, String reference) {}
}
