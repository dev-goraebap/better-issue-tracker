package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.module.workitem.domain.Recurrence;
import io.github.goraebap.bit.module.workitem.domain.RecurrenceRepository;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.SecretTokens;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkItemQueryService {
    private static final String NO_CATEGORY = "none";
    private final WorkItemRepository workItemRepository;
    private final RecurrenceRepository recurrenceRepository;
    private final WorkItemFacade workItemFacade;
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;
    private final LabelFacade labelFacade;
    private final IamFacade iamFacade;
    private final SecretTokens secretTokens;

    @Transactional(readOnly = true)
    public WorkItemViews.Item get(CurrentUser actor, String workspaceId, String projectId, String id) {
        var p = projectFacade.requireAccess(actor, workspaceId, projectId, false);
        var w = workItemRepository
                .findById(projectId, id, false)
                .orElseThrow(WorkItemErrorCode.WORK_ITEM_NOT_FOUND::raise);
        var people = w.details().peopleIds().stream()
                .map(person -> new WorkItemRepository.Person(
                        person, iamFacade.user(person).map(IamFacade.User::name).orElse("탈퇴한 사용자")))
                .sorted(java.util.Comparator.comparing(WorkItemRepository.Person::name)
                        .thenComparing(WorkItemRepository.Person::id))
                .toList();
        var category = projectFacade
                .findColumn(actor, workspaceId, projectId, w.columnId())
                .map(ProjectFacade.ColumnRef::category)
                .orElse(null);
        var row = new WorkItemRepository.Row(
                w.id(),
                projectId,
                p.key(),
                w.number(),
                w.kind(),
                w.details(),
                w.labelIds(),
                w.columnId(),
                category == null ? null : category.name(),
                w.position(),
                w.closedAt(),
                w.archivedAt(),
                w.recurrenceId(),
                w.occurrenceOn(),
                w.version(),
                w.audit(),
                people);
        return view(workspaceId, row, labels(actor, workspaceId, List.of(row)), rules(List.of(row)));
    }

    @Transactional(readOnly = true)
    public WorkItemViews.Item byRef(CurrentUser actor, String workspaceId, String reference) {
        var ref = workItemFacade.findByRef(actor, workspaceId, reference);
        return get(actor, workspaceId, ref.projectId(), ref.id());
    }

    /** The project list ({@code projectId} set) or My Tasks ({@code mine}). */
    @Transactional(readOnly = true)
    public WorkItemViews.WorkItems list(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            boolean mine,
            WorkItemRequests.ListRequest request) {
        var q = query(actor, workspaceId, projectId, mine, request);
        return page(actor, workspaceId, "work-item-list", q, request);
    }

    /** Every project of the workspace that is neither archived nor deleted, with the same paging as a project list. */
    @Transactional(readOnly = true)
    public WorkItemViews.WorkItems listWorkspace(
            CurrentUser actor, String workspaceId, WorkItemRequests.WorkspaceListRequest request) {
        var q = query(
                actor,
                workspaceId,
                null,
                false,
                request,
                null,
                false,
                Set.copyOf(request.getProjectId()),
                Set.copyOf(request.getColumnId()));
        return page(actor, workspaceId, "work-item-workspace-list", q, request);
    }

    @Transactional(readOnly = true)
    public List<WorkItemViews.ColumnCount> counts(
            CurrentUser actor, String workspaceId, String projectId, WorkItemRequests.ListRequest request) {
        var q = query(actor, workspaceId, projectId, false, request);
        return workItemRepository.countByColumn(q).stream()
                .map(c -> new WorkItemViews.ColumnCount(c.columnId(), c.count()))
                .toList();
    }

    private WorkItemViews.WorkItems page(
            CurrentUser actor,
            String workspaceId,
            String purpose,
            WorkItemRepository.Query q,
            WorkItemRequests.Filters request) {
        String sort = q.sort();
        String canonical = String.join(
                "\n",
                actor.userId(),
                workspaceId,
                String.valueOf(q.projectId()),
                ids(q.projectIds()),
                String.valueOf(q.personId()),
                names(q.kinds()),
                String.valueOf(q.columnId()),
                Boolean.toString(q.backlog()),
                ids(q.columnIds()),
                ids(q.labelIds()),
                String.join(",", q.categories().stream().sorted().toList()),
                Boolean.toString(q.noCategory()),
                names(q.priorities()),
                names(q.triggers()),
                Boolean.toString(q.archived()),
                Boolean.toString(q.deleted()),
                String.valueOf(q.closed()),
                String.valueOf(q.hasDates()),
                String.valueOf(q.from()),
                String.valueOf(q.to()),
                sort,
                q.direction(),
                q.search());
        String scope = secretTokens.hash(purpose, canonical);
        var point = decode(request.getCursor(), scope, sort);
        var rows = workItemRepository.findAll(q, point, request.getSize() + 1);
        var page = rows.stream().limit(request.getSize()).toList();
        String next = rows.size() > request.getSize() ? encode(scope, page.getLast(), sort) : null;
        var labels = labels(actor, workspaceId, page);
        var rules = rules(page);
        return new WorkItemViews.WorkItems(
                page.stream().map(row -> view(workspaceId, row, labels, rules)).toList(), next);
    }

    private WorkItemRepository.Query query(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            boolean mine,
            WorkItemRequests.ListRequest request) {
        boolean backlog = "backlog".equals(request.getColumn());
        String column = null;
        try {
            if (!backlog && request.getColumn() != null && !request.getColumn().isBlank())
                column = Ids.parse(request.getColumn());
        } catch (IllegalArgumentException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
        return query(actor, workspaceId, projectId, mine, request, column, backlog, Set.of(), Set.of());
    }

    private WorkItemRepository.Query query(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            boolean mine,
            WorkItemRequests.Filters request,
            String column,
            boolean backlog,
            Set<String> projectIds,
            Set<String> columnIds) {
        workspaceFacade.requireAccess(
                actor,
                workspaceId,
                request.isDeleted() ? WorkspaceFacade.Action.WRITE_WORK : WorkspaceFacade.Action.READ);
        if (projectId != null) projectFacade.requireAccess(actor, workspaceId, projectId, false);
        String sort = request.getSort();
        String direction = request.getDirection();
        if (!Set.of("createdAt", "position").contains(sort)
                || !Set.of("ASC", "DESC").contains(direction)
                || mine && !sort.equals("createdAt")
                || request.getSize() < 1
                || request.getSize() > 100) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        String search = request.getQ() == null ? "" : request.getQ().strip();
        if (search.length() > 200) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        if (request.getFrom() != null
                && request.getTo() != null
                && request.getFrom().isAfter(request.getTo()))
            throw WorkItemErrorCode.WORK_ITEM_DATE_RANGE_INVALID.raise();
        if (column != null && projectId != null) projectFacade.requireColumn(actor, workspaceId, projectId, column);
        var priorities = values(request.getPriority(), WorkItem.Priority.class);
        var triggers = values(request.getTriggerType(), WorkItem.TriggerType.class);
        var categories = new HashSet<>(split(request.getCategory()));
        boolean noCategory = categories.remove(NO_CATEGORY);
        var categoryNames = values(List.copyOf(categories), ColumnCategory.class).stream()
                .map(Enum::name)
                .collect(Collectors.toUnmodifiableSet());
        if (projectIds.size() > 100
                || columnIds.size() > 100
                || request.getLabelId().size() > 100) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        String person = mine ? actor.userId() : request.getPersonId();
        var kinds = values(request.getKind(), WorkItem.Kind.class);
        return new WorkItemRepository.Query(
                workspaceId,
                projectId,
                projectIds,
                person,
                kinds,
                column,
                backlog,
                columnIds,
                Set.copyOf(request.getLabelId()),
                categoryNames,
                noCategory,
                priorities,
                triggers,
                search,
                request.isArchived(),
                request.isDeleted(),
                request.getClosed(),
                request.getHasDates(),
                request.getFrom(),
                request.getTo(),
                sort,
                direction);
    }

    /** One label lookup for every row shown together; deleted labels are absent and so disappear from the rows. */
    private Map<String, LabelFacade.LabelRef> labels(
            CurrentUser actor, String workspaceId, Collection<WorkItemRepository.Row> rows) {
        var ids = rows.stream().flatMap(r -> r.labelIds().stream()).collect(Collectors.toSet());
        return ids.isEmpty() ? Map.of() : labelFacade.findAllById(actor, workspaceId, ids);
    }

    /** One lookup for the rules of every repeating row shown together. */
    private Map<String, WorkItemViews.Repeat> rules(Collection<WorkItemRepository.Row> rows) {
        var ids = rows.stream()
                .map(WorkItemRepository.Row::recurrenceId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        return recurrenceRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Recurrence::id, WorkItemViews.Repeat::of));
    }

    private WorkItemViews.Item view(
            String workspaceId,
            WorkItemRepository.Row row,
            Map<String, LabelFacade.LabelRef> labels,
            Map<String, WorkItemViews.Repeat> rules) {
        var d = row.details();
        var a = row.audit();
        return new WorkItemViews.Item(
                row.id(),
                workspaceId,
                row.projectId(),
                row.number(),
                row.projectKey() + "-" + row.number(),
                row.kind(),
                d.title(),
                d.description(),
                row.columnId(),
                row.columnCategory() == null ? null : ColumnCategory.valueOf(row.columnCategory()),
                row.labelIds().stream()
                        .map(labels::get)
                        .filter(java.util.Objects::nonNull)
                        .sorted(LabelFacade.LabelRef.ORDER)
                        .map(l -> new WorkItemViews.Label(l.id(), l.name(), l.color(), l.system()))
                        .toList(),
                row.position(),
                d.priority(),
                d.triggerType(),
                row.people().stream()
                        .map(person -> new WorkItemViews.Person(person.id(), person.name()))
                        .toList(),
                d.startDate(),
                d.dueDate(),
                d.startsAt(),
                d.endsAt(),
                d.allDay(),
                row.recurrenceId() == null ? null : rules.get(row.recurrenceId()),
                row.recurrenceId() == null ? null : row.occurrenceOn(),
                row.closedAt(),
                row.archivedAt(),
                a.deletedAt(),
                row.version(),
                a.createdAt(),
                a.createdBy(),
                a.createdByAgent(),
                a.updatedAt(),
                a.updatedBy(),
                a.updatedByAgent());
    }

    private static List<String> split(List<String> raw) {
        return raw.stream()
                .flatMap(s -> Arrays.stream(s.split(",")))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private static <E extends Enum<E>> Set<E> values(List<String> raw, Class<E> type) {
        try {
            return split(raw).stream().map(s -> Enum.valueOf(type, s)).collect(Collectors.toUnmodifiableSet());
        } catch (IllegalArgumentException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }

    private static String names(Set<? extends Enum<?>> values) {
        return values.stream().map(Enum::name).sorted().collect(Collectors.joining(","));
    }

    private static String ids(Set<String> values) {
        return values.stream().sorted().collect(Collectors.joining(","));
    }

    private static WorkItemRepository.Point decode(String raw, String scope, String sort) {
        if (raw == null) return new WorkItemRepository.Point(null, null, null);
        if (raw.length() > 1024) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(raw), StandardCharsets.UTF_8).split("\\|", -1);
            if (parts.length != 3 || !parts[0].equals(scope)) throw new IllegalArgumentException("cursor");
            if (sort.equals("position")) {
                double position = Double.parseDouble(parts[1]);
                if (!Double.isFinite(position) || position < 0) throw new IllegalArgumentException("cursor");
                return new WorkItemRepository.Point(null, position, Ids.parse(parts[2]));
            }
            return new WorkItemRepository.Point(Instant.parse(parts[1]), null, Ids.parse(parts[2]));
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }

    private static String encode(String scope, WorkItemRepository.Row last, String sort) {
        String value = sort.equals("position")
                ? Double.toString(last.position())
                : last.audit().createdAt().toString();
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((scope + "|" + value + "|" + last.id()).getBytes(StandardCharsets.UTF_8));
    }
}
