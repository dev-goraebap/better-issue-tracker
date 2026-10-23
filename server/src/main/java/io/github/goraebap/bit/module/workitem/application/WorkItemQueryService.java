package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.SecretTokens;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkItemQueryService {
    private final WorkItemRepository workItemRepository;
    private final WorkItemFacade workItemFacade;
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;
    private final IamFacade iamFacade;
    private final SecretTokens secretTokens;

    @Transactional(readOnly = true)
    public WorkItemViews.Item get(CurrentUser actor, UUID workspaceId, UUID projectId, UUID id) {
        var p = projectFacade.requireAccess(actor, workspaceId, projectId, false);
        var w = workItemRepository
                .findById(projectId, id, false)
                .orElseThrow(WorkItemErrorCode.WORKITEM_NOT_FOUND::raise);
        String name = w.details().assigneeId() == null
                ? null
                : iamFacade
                        .user(w.details().assigneeId())
                        .map(IamFacade.User::name)
                        .orElse("탈퇴한 사용자");
        return view(
                workspaceId,
                new WorkItemRepository.Row(
                        w.id(),
                        projectId,
                        p.key(),
                        w.number(),
                        w.details(),
                        w.columnId(),
                        w.position(),
                        w.closedAt(),
                        w.archivedAt(),
                        w.version(),
                        w.audit(),
                        name));
    }

    @Transactional(readOnly = true)
    public WorkItemViews.Item byRef(CurrentUser actor, UUID workspaceId, String reference) {
        var ref = workItemFacade.findByRef(actor, workspaceId, reference);
        return get(actor, workspaceId, ref.projectId(), ref.id());
    }

    @Transactional(readOnly = true)
    public WorkItemViews.WorkItems list(
            CurrentUser actor, UUID workspaceId, UUID projectId, boolean mine, WorkItemRequests.ListRequest request) {
        var q = query(actor, workspaceId, projectId, mine, request);
        String sort = q.sort();
        String canonical = String.join(
                "\n",
                actor.userId().toString(),
                workspaceId.toString(),
                String.valueOf(projectId),
                String.valueOf(q.assigneeId()),
                String.valueOf(q.columnId()),
                Boolean.toString(q.backlog()),
                names(q.priorities()),
                names(q.triggers()),
                Boolean.toString(q.archived()),
                Boolean.toString(q.deleted()),
                String.valueOf(q.closed()),
                String.valueOf(q.from()),
                String.valueOf(q.to()),
                sort,
                q.direction(),
                q.search());
        String scope = secretTokens.hash("workitem-list", canonical);
        var point = decode(request.getCursor(), scope, sort);
        var rows = workItemRepository.findAll(q, point, request.getSize() + 1);
        var page = rows.stream().limit(request.getSize()).toList();
        String next = rows.size() > request.getSize() ? encode(scope, page.getLast(), sort) : null;
        return new WorkItemViews.WorkItems(
                page.stream().map(row -> view(workspaceId, row)).toList(), next);
    }

    private WorkItemRepository.Query query(
            CurrentUser actor, UUID workspaceId, UUID projectId, boolean mine, WorkItemRequests.ListRequest request) {
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
            throw WorkItemErrorCode.WORKITEM_DATE_RANGE_INVALID.raise();
        boolean backlog = "backlog".equals(request.getColumn());
        UUID column = null;
        try {
            if (!backlog && request.getColumn() != null && !request.getColumn().isBlank())
                column = UUID.fromString(request.getColumn());
        } catch (IllegalArgumentException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
        if (column != null && projectId != null) projectFacade.requireColumn(actor, workspaceId, projectId, column);
        var priorities = values(request.getPriority(), WorkItem.Priority.class);
        var triggers = values(request.getTriggerType(), WorkItem.TriggerType.class);
        UUID assignee = mine ? actor.userId() : request.getAssigneeId();
        return new WorkItemRepository.Query(
                workspaceId,
                projectId,
                assignee,
                column,
                backlog,
                priorities,
                triggers,
                search,
                request.isArchived(),
                request.isDeleted(),
                request.getClosed(),
                request.getFrom(),
                request.getTo(),
                sort,
                direction);
    }

    @Transactional(readOnly = true)
    public List<WorkItemViews.ColumnCount> counts(
            CurrentUser actor, UUID workspaceId, UUID projectId, WorkItemRequests.ListRequest request) {
        var q = query(actor, workspaceId, projectId, false, request);
        return workItemRepository.countByColumn(q).stream()
                .map(c -> new WorkItemViews.ColumnCount(c.columnId(), c.count()))
                .toList();
    }

    private WorkItemViews.Item view(UUID workspaceId, WorkItemRepository.Row row) {
        var d = row.details();
        var a = row.audit();
        return new WorkItemViews.Item(
                row.id(),
                workspaceId,
                row.projectId(),
                row.number(),
                row.projectKey() + "-" + row.number(),
                d.title(),
                d.description(),
                row.columnId(),
                row.position(),
                d.priority(),
                d.triggerType(),
                d.assigneeId(),
                row.assigneeName(),
                d.startDate(),
                d.dueDate(),
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

    private static <E extends Enum<E>> Set<E> values(List<String> raw, Class<E> type) {
        try {
            return raw.stream()
                    .flatMap(s -> Arrays.stream(s.split(",")))
                    .map(String::strip)
                    .filter(s -> !s.isEmpty())
                    .map(s -> Enum.valueOf(type, s))
                    .collect(Collectors.toUnmodifiableSet());
        } catch (IllegalArgumentException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }

    private static String names(Set<? extends Enum<?>> values) {
        return values.stream().map(Enum::name).sorted().collect(Collectors.joining(","));
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
                return new WorkItemRepository.Point(null, position, UUID.fromString(parts[2]));
            }
            return new WorkItemRepository.Point(Instant.parse(parts[1]), null, UUID.fromString(parts[2]));
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
