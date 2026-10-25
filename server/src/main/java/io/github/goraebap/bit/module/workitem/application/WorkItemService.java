package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ColumnWorkItemSpi;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkItemService implements WorkItemFacade, ColumnWorkItemSpi {
    private static final Pattern REFERENCE = Pattern.compile("([A-Z0-9]{2,10})-([1-9][0-9]{0,18})");
    private final WorkItemRepository workItemRepository;
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;
    private final LabelFacade labelFacade;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public void requireAccess(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            UUID workItemId,
            boolean writing,
            boolean includeDeleted) {
        access(actor, workspaceId, projectId, workItemId, writing, includeDeleted);
    }

    @Override
    @Transactional(readOnly = true)
    public Ref findByRef(CurrentUser actor, UUID workspaceId, String reference) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var match = REFERENCE.matcher(reference == null ? "" : reference.strip().toUpperCase(Locale.ROOT));
        if (!match.matches()) throw WorkItemErrorCode.WORKITEM_NOT_FOUND.raise();
        long number;
        try {
            number = Long.parseLong(match.group(2));
        } catch (NumberFormatException invalid) {
            throw WorkItemErrorCode.WORKITEM_NOT_FOUND.raise();
        }
        var project = projectFacade.findByKey(actor, workspaceId, match.group(1));
        var w = workItemRepository
                .findByNumber(project.id(), number)
                .orElseThrow(WorkItemErrorCode.WORKITEM_NOT_FOUND::raise);
        return new Ref(w.id(), w.projectId(), project.key() + "-" + w.number());
    }

    @Transactional
    public UUID create(CurrentUser actor, UUID workspaceId, UUID projectId, WorkItem.Details details, UUID columnId) {
        return create(actor, workspaceId, projectId, details, columnId, Set.of());
    }

    @Transactional
    public UUID create(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            WorkItem.Details details,
            UUID columnId,
            Set<UUID> labelIds) {
        projectFacade.requireAccess(actor, workspaceId, projectId, true);
        validateDates(details);
        assignee(actor, workspaceId, details.assigneeId());
        labels(actor, workspaceId, labelIds);
        var column = projectFacade.requireColumn(actor, workspaceId, projectId, columnId);
        long number = projectFacade.allocateWorkItemNumber(actor, workspaceId, projectId);
        double position = workItemRepository.findColumnItems(projectId, columnId, false).stream()
                        .mapToDouble(WorkItem::position)
                        .max()
                        .orElse(-1)
                + 1;
        var w = WorkItem.create(
                projectId,
                number,
                details,
                labelIds,
                columnId,
                column.finalColumn(),
                position,
                actor.userId(),
                agent(actor),
                clock.instant());
        workItemRepository.save(w);
        changed(actor, workspaceId, w, "created", List.of());
        return w.id();
    }

    @Transactional
    public void revise(CurrentUser actor, UUID workspaceId, UUID projectId, UUID id, WorkItemRequests.Update request) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, request.getExpectedVersion());
        var d = w.details();
        var next = new WorkItem.Details(
                request.hasTitle() ? request.getTitle() : d.title(),
                request.hasDescription() ? request.getDescription() : d.description(),
                request.hasPriority() ? request.getPriority() : d.priority(),
                request.hasTriggerType() ? request.getTriggerType() : d.triggerType(),
                request.hasAssigneeId() ? request.getAssigneeId() : d.assigneeId(),
                request.hasStartDate() ? request.getStartDate() : d.startDate(),
                request.hasDueDate() ? request.getDueDate() : d.dueDate());
        validateDates(next);
        if (!Objects.equals(next.assigneeId(), d.assigneeId())) assignee(actor, workspaceId, next.assigneeId());
        var labelIds = request.hasLabelIds() ? request.labels() : w.labelIds();
        if (!labelIds.equals(w.labelIds())) labels(actor, workspaceId, labelIds);
        long before = w.version();
        var previousLabels = w.labelIds();
        w.revise(next, labelIds, actor.userId(), agent(actor), clock.instant());
        if (w.version() == before) return;
        workItemRepository.save(w);
        var changes = new ArrayList<FieldChange>();
        field(changes, "title", d.title(), next.title());
        // A description is written in place and saved as it is typed: the activity says it changed, not what it said.
        if (!Objects.equals(d.description(), next.description()))
            changes.add(new FieldChange("description", null, null));
        field(changes, "priority", text(d.priority()), text(next.priority()));
        field(changes, "assignee", text(d.assigneeId()), text(next.assigneeId()));
        field(changes, "startDate", text(d.startDate()), text(next.startDate()));
        field(changes, "dueDate", text(d.dueDate()), text(next.dueDate()));
        field(changes, "labels", ids(previousLabels), ids(labelIds));
        if (!changes.isEmpty()) changed(actor, workspaceId, w, "changed", changes);
    }

    @Transactional
    public void move(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            UUID id,
            long expectedVersion,
            UUID targetColumnId,
            UUID beforeItemId,
            UUID afterItemId) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, expectedVersion);
        var target = projectFacade.requireColumn(actor, workspaceId, projectId, targetColumnId);
        if (id.equals(beforeItemId) || id.equals(afterItemId)) throw WorkItemErrorCode.WORKITEM_MOVE_INVALID.raise();
        if (Objects.equals(w.columnId(), targetColumnId) && beforeItemId == null && afterItemId == null) return;
        UUID previous = w.columnId();
        var ordered = new ArrayList<>(workItemRepository.findColumnItems(projectId, targetColumnId, false));
        ordered.removeIf(item -> item.id().equals(id));
        int before = index(ordered, beforeItemId);
        int after = index(ordered, afterItemId);
        if (beforeItemId != null && before < 0
                || afterItemId != null && after < 0
                || beforeItemId != null && afterItemId != null && after + 1 != before)
            throw WorkItemErrorCode.WORKITEM_MOVE_INVALID.raise();
        int at = beforeItemId != null ? before : afterItemId != null ? after + 1 : ordered.size();
        ordered.add(at, w);
        applyOrder(actor, ordered, targetColumnId, target.finalColumn());
        if (!Objects.equals(previous, targetColumnId)) {
            var old = projectFacade.requireColumn(actor, workspaceId, projectId, previous);
            applyOrder(
                    actor, workItemRepository.findColumnItems(projectId, previous, false), previous, old.finalColumn());
            changed(
                    actor,
                    workspaceId,
                    w,
                    "changed",
                    List.of(new FieldChange("column", text(previous), text(targetColumnId))));
        }
    }

    @Transactional
    public void archive(
            CurrentUser actor, UUID workspaceId, UUID projectId, UUID id, long expectedVersion, boolean archived) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, expectedVersion);
        boolean was = w.archivedAt() != null;
        w.archive(archived, actor.userId(), agent(actor), clock.instant());
        workItemRepository.save(w);
        if (was != archived)
            changed(actor, workspaceId, w, "changed", List.of(new FieldChange("archived", text(was), text(archived))));
    }

    @Transactional
    public void delete(CurrentUser actor, UUID workspaceId, UUID projectId, UUID id, long expectedVersion) {
        var w = access(actor, workspaceId, projectId, id, true, true);
        version(w, expectedVersion);
        w.delete(actor.userId(), agent(actor), clock.instant());
        workItemRepository.save(w);
        changed(actor, workspaceId, w, "deleted", List.of());
    }

    @Transactional
    public void restore(CurrentUser actor, UUID workspaceId, UUID projectId, UUID id, long expectedVersion) {
        var w = access(actor, workspaceId, projectId, id, true, true);
        version(w, expectedVersion);
        var existing = projectFacade.findColumn(actor, workspaceId, projectId, w.columnId());
        var column = existing.orElse(new ProjectFacade.ColumnRef(null, false, null));
        w.restore(existing.isPresent(), actor.userId(), agent(actor), clock.instant());
        w.move(column.id(), column.finalColumn(), w.position(), actor.userId(), agent(actor), clock.instant());
        workItemRepository.save(w);
        changed(actor, workspaceId, w, "restored", List.of());
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void reclassify(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId, boolean finalColumn) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        applyOrder(actor, workItemRepository.findColumnItems(projectId, columnId, true), columnId, finalColumn);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void transfer(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            UUID sourceColumnId,
            UUID targetColumnId,
            boolean targetFinal) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        var ordered = new ArrayList<>(workItemRepository.findColumnItems(projectId, targetColumnId, false));
        ordered.addAll(workItemRepository.findColumnItems(projectId, sourceColumnId, false));
        applyOrder(actor, ordered, targetColumnId, targetFinal);
    }

    private WorkItem access(
            CurrentUser actor, UUID workspaceId, UUID projectId, UUID id, boolean writing, boolean deleted) {
        projectFacade.requireAccess(actor, workspaceId, projectId, writing);
        if (deleted) workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        return workItemRepository
                .findById(projectId, id, deleted)
                .orElseThrow(WorkItemErrorCode.WORKITEM_NOT_FOUND::raise);
    }

    private void applyOrder(CurrentUser actor, List<WorkItem> ordered, UUID columnId, boolean finalColumn) {
        for (int i = 0; i < ordered.size(); i++) {
            var item = ordered.get(i);
            long before = item.version();
            item.move(columnId, finalColumn, i, actor.userId(), agent(actor), clock.instant());
            if (item.version() != before) workItemRepository.save(item);
        }
    }

    private static int index(List<WorkItem> items, UUID id) {
        if (id == null) return -1;
        for (int i = 0; i < items.size(); i++) if (items.get(i).id().equals(id)) return i;
        return -1;
    }

    private void assignee(CurrentUser actor, UUID workspaceId, UUID userId) {
        if (userId != null && !workspaceFacade.hasMember(actor, workspaceId, userId))
            throw WorkItemErrorCode.WORKITEM_ASSIGNEE_NOT_MEMBER.raise();
    }

    /** Every label must be a live label of this workspace; deleted or foreign ids are rejected as one error. */
    private void labels(CurrentUser actor, UUID workspaceId, Set<UUID> labelIds) {
        if (!labelIds.isEmpty()
                && labelFacade.findAllById(actor, workspaceId, labelIds).size() != labelIds.size())
            throw WorkItemErrorCode.WORKITEM_LABEL_INVALID.raise();
    }

    private static void validateDates(WorkItem.Details details) {
        if (details.startDate() != null
                && details.dueDate() != null
                && details.startDate().isAfter(details.dueDate()))
            throw WorkItemErrorCode.WORKITEM_DATE_RANGE_INVALID.raise();
    }

    /** Records what happened to an issue in its activity (D-078): safe values only, ids for people, columns and labels. */
    private void changed(CurrentUser actor, UUID workspaceId, WorkItem item, String action, List<FieldChange> changes) {
        applicationEventPublisher.publishEvent(new TargetChangedEvent(
                workspaceId,
                item.projectId(),
                TargetType.work_item,
                item.id(),
                action,
                item.version(),
                actor.userId(),
                agent(actor),
                item.audit().updatedAt(),
                changes));
    }

    private static void field(List<FieldChange> changes, String field, String before, String after) {
        if (!Objects.equals(before, after)) changes.add(new FieldChange(field, before, after));
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    /** Label ids in a stable order, joined by commas; null for none. */
    private static String ids(Set<UUID> ids) {
        return ids.isEmpty() ? null : ids.stream().map(UUID::toString).sorted().collect(Collectors.joining(","));
    }

    private static void version(WorkItem item, long expected) {
        if (item.version() != expected) throw WorkItemErrorCode.WORKITEM_VERSION_CONFLICT.raise();
    }

    private static String agent(CurrentUser actor) {
        return actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null;
    }
}
