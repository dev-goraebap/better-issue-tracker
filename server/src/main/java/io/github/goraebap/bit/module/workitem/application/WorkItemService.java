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
            String workspaceId,
            String projectId,
            String workItemId,
            boolean writing,
            boolean includeDeleted) {
        access(actor, workspaceId, projectId, workItemId, writing, includeDeleted);
    }

    @Override
    @Transactional(readOnly = true)
    public Ref findByRef(CurrentUser actor, String workspaceId, String reference) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var match = REFERENCE.matcher(reference == null ? "" : reference.strip().toUpperCase(Locale.ROOT));
        if (!match.matches()) throw WorkItemErrorCode.WORK_ITEM_NOT_FOUND.raise();
        long number;
        try {
            number = Long.parseLong(match.group(2));
        } catch (NumberFormatException invalid) {
            throw WorkItemErrorCode.WORK_ITEM_NOT_FOUND.raise();
        }
        var project = projectFacade.findByKey(actor, workspaceId, match.group(1));
        var w = workItemRepository
                .findByNumber(project.id(), number)
                .orElseThrow(WorkItemErrorCode.WORK_ITEM_NOT_FOUND::raise);
        return new Ref(w.id(), w.projectId(), project.key() + "-" + w.number());
    }

    @Transactional
    public String create(
            CurrentUser actor, String workspaceId, String projectId, WorkItem.Details details, String columnId) {
        return create(actor, workspaceId, projectId, WorkItem.Kind.task, details, columnId, Set.of());
    }

    @Transactional
    public String create(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            WorkItem.Details details,
            String columnId,
            Set<String> labelIds) {
        return create(actor, workspaceId, projectId, WorkItem.Kind.task, details, columnId, labelIds);
    }

    /** A task in a column (null is the backlog), or an event, which has no column (D-092). */
    @Transactional
    public String create(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            WorkItem.Kind kind,
            WorkItem.Details details,
            String requestedColumnId,
            Set<String> labelIds) {
        projectFacade.requireAccess(actor, workspaceId, projectId, true);
        validateDates(details);
        WorkItem.Details valid = shape(kind, details);
        people(actor, workspaceId, valid.peopleIds());
        labels(actor, workspaceId, labelIds);
        String columnId = kind == WorkItem.Kind.event ? null : requestedColumnId;
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
                kind,
                valid,
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
    public void revise(
            CurrentUser actor, String workspaceId, String projectId, String id, WorkItemRequests.Update request) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, request.getExpectedVersion());
        var d = w.details();
        var kind = request.hasKind() ? request.getKind() : w.kind();
        // A new kind keeps what fits it (D-092); what the request gives still wins.
        var base = kind == w.kind() ? d : d.as(kind);
        var next = new WorkItem.Details(
                request.hasTitle() ? request.getTitle() : d.title(),
                request.hasDescription() ? request.getDescription() : d.description(),
                request.hasPriority() ? request.getPriority() : d.priority(),
                request.hasTriggerType() ? request.getTriggerType() : d.triggerType(),
                request.hasPeopleIds() ? request.people() : d.peopleIds(),
                request.hasStartDate() ? request.getStartDate() : base.startDate(),
                request.hasDueDate() ? request.getDueDate() : base.dueDate(),
                request.hasStartsAt() ? request.getStartsAt() : base.startsAt(),
                request.hasEndsAt() ? request.getEndsAt() : base.endsAt(),
                request.hasAllDay() ? request.getAllDay() : base.allDay());
        validateDates(next);
        next = shape(kind, next);
        if (!next.peopleIds().equals(d.peopleIds())) people(actor, workspaceId, next.peopleIds());
        var labelIds = request.hasLabelIds() ? request.labels() : w.labelIds();
        if (!labelIds.equals(w.labelIds())) labels(actor, workspaceId, labelIds);
        long before = w.version();
        var previousKind = w.kind();
        var previousLabels = w.labelIds();
        String previousColumn = w.columnId();
        w.revise(kind, next, labelIds, actor.userId(), agent(actor), clock.instant());
        if (w.version() == before) return;
        workItemRepository.save(w);
        if (previousColumn != null && w.columnId() == null) {
            // An item that became an event left the board: the column it left closes its gap.
            var old = projectFacade.requireColumn(actor, workspaceId, projectId, previousColumn);
            applyOrder(
                    actor,
                    workItemRepository.findColumnItems(projectId, previousColumn, false),
                    previousColumn,
                    old.finalColumn());
        }
        var changes = new ArrayList<FieldChange>();
        field(changes, "kind", text(previousKind), text(kind));
        field(changes, "title", d.title(), next.title());
        // A description is written in place and saved as it is typed: the activity says it changed, not what it said.
        if (!Objects.equals(d.description(), next.description()))
            changes.add(new FieldChange("description", null, null));
        field(changes, "priority", text(d.priority()), text(next.priority()));
        field(changes, "people", ids(d.peopleIds()), ids(next.peopleIds()));
        field(changes, "startDate", text(d.startDate()), text(next.startDate()));
        field(changes, "dueDate", text(d.dueDate()), text(next.dueDate()));
        field(changes, "startsAt", text(d.startsAt()), text(next.startsAt()));
        field(changes, "endsAt", text(d.endsAt()), text(next.endsAt()));
        field(changes, "allDay", text(d.allDay()), text(next.allDay()));
        field(changes, "column", text(previousColumn), text(w.columnId()));
        field(changes, "labels", ids(previousLabels), ids(labelIds));
        if (!changes.isEmpty()) changed(actor, workspaceId, w, "changed", changes);
    }

    @Transactional
    public void move(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String id,
            long expectedVersion,
            String targetColumnId,
            String beforeItemId,
            String afterItemId) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, expectedVersion);
        var target = projectFacade.requireColumn(actor, workspaceId, projectId, targetColumnId);
        if (id.equals(beforeItemId) || id.equals(afterItemId)) throw WorkItemErrorCode.WORK_ITEM_MOVE_INVALID.raise();
        if (Objects.equals(w.columnId(), targetColumnId) && beforeItemId == null && afterItemId == null) return;
        String previous = w.columnId();
        var ordered = new ArrayList<>(workItemRepository.findColumnItems(projectId, targetColumnId, false));
        ordered.removeIf(item -> item.id().equals(id));
        int before = index(ordered, beforeItemId);
        int after = index(ordered, afterItemId);
        if (beforeItemId != null && before < 0
                || afterItemId != null && after < 0
                || beforeItemId != null && afterItemId != null && after + 1 != before)
            throw WorkItemErrorCode.WORK_ITEM_MOVE_INVALID.raise();
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
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String id,
            long expectedVersion,
            boolean archived) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, expectedVersion);
        boolean was = w.archivedAt() != null;
        w.archive(archived, actor.userId(), agent(actor), clock.instant());
        workItemRepository.save(w);
        if (was != archived)
            changed(actor, workspaceId, w, "changed", List.of(new FieldChange("archived", text(was), text(archived))));
    }

    @Transactional
    public void delete(CurrentUser actor, String workspaceId, String projectId, String id, long expectedVersion) {
        var w = access(actor, workspaceId, projectId, id, true, true);
        version(w, expectedVersion);
        w.delete(actor.userId(), agent(actor), clock.instant());
        workItemRepository.save(w);
        changed(actor, workspaceId, w, "deleted", List.of());
    }

    @Transactional
    public void restore(CurrentUser actor, String workspaceId, String projectId, String id, long expectedVersion) {
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
    public void reclassify(
            CurrentUser actor, String workspaceId, String projectId, String columnId, boolean finalColumn) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        applyOrder(actor, workItemRepository.findColumnItems(projectId, columnId, true), columnId, finalColumn);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void transfer(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String sourceColumnId,
            String targetColumnId,
            boolean targetFinal) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        var ordered = new ArrayList<>(workItemRepository.findColumnItems(projectId, targetColumnId, false));
        ordered.addAll(workItemRepository.findColumnItems(projectId, sourceColumnId, false));
        applyOrder(actor, ordered, targetColumnId, targetFinal);
    }

    @Override
    @Transactional(readOnly = true)
    public Snapshot get(CurrentUser actor, String workspaceId, String projectId, String workItemId) {
        var project = projectFacade.requireAccess(actor, workspaceId, projectId, false);
        var w = workItemRepository
                .findById(projectId, workItemId, false)
                .orElseThrow(WorkItemErrorCode.WORK_ITEM_NOT_FOUND::raise);
        var d = w.details();
        return new Snapshot(
                w.id(),
                w.projectId(),
                w.number(),
                project.key() + "-" + w.number(),
                d.title(),
                d.description(),
                text(d.priority()),
                w.columnId(),
                w.labelIds(),
                w.version());
    }

    @Override
    @Transactional
    public String create(CurrentUser actor, String workspaceId, String projectId, NewWorkItem workItem) {
        var details = new WorkItem.Details(
                workItem.title(), workItem.description(), priority(workItem.priority()), null, null, null, null);
        return create(actor, workspaceId, projectId, details, workItem.columnId(), workItem.labelIds());
    }

    @Override
    @Transactional
    public void revise(CurrentUser actor, String workspaceId, String projectId, String workItemId, Revision revision) {
        var w = access(actor, workspaceId, projectId, workItemId, true, false);
        var request = new WorkItemRequests.Update();
        request.setExpectedVersion(w.version());
        if (revision.title() != null) request.setTitle(revision.title());
        if (revision.description() != null) request.setDescription(revision.description());
        if (revision.priority() != null) request.setPriority(priority(revision.priority()));
        if (revision.labelIds() != null) request.setLabelIds(List.copyOf(revision.labelIds()));
        revise(actor, workspaceId, projectId, workItemId, request);
    }

    @Override
    @Transactional
    public void moveTo(CurrentUser actor, String workspaceId, String projectId, String workItemId, String columnId) {
        var w = access(actor, workspaceId, projectId, workItemId, true, false);
        if (Objects.equals(w.columnId(), columnId)) return;
        move(actor, workspaceId, projectId, workItemId, w.version(), columnId, null, null);
    }

    private static WorkItem.Priority priority(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return WorkItem.Priority.valueOf(value.strip().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            return null;
        }
    }

    private WorkItem access(
            CurrentUser actor, String workspaceId, String projectId, String id, boolean writing, boolean deleted) {
        projectFacade.requireAccess(actor, workspaceId, projectId, writing);
        if (deleted) workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        return workItemRepository
                .findById(projectId, id, deleted)
                .orElseThrow(WorkItemErrorCode.WORK_ITEM_NOT_FOUND::raise);
    }

    private void applyOrder(CurrentUser actor, List<WorkItem> ordered, String columnId, boolean finalColumn) {
        for (int i = 0; i < ordered.size(); i++) {
            var item = ordered.get(i);
            long before = item.version();
            item.move(columnId, finalColumn, i, actor.userId(), agent(actor), clock.instant());
            if (item.version() != before) workItemRepository.save(item);
        }
    }

    private static int index(List<WorkItem> items, String id) {
        if (id == null) return -1;
        for (int i = 0; i < items.size(); i++) if (items.get(i).id().equals(id)) return i;
        return -1;
    }

    /** Every person must be a current member of the workspace. */
    private void people(CurrentUser actor, String workspaceId, Set<String> userIds) {
        if (userIds.size() > WorkItem.MAX_PEOPLE) throw WorkItemErrorCode.WORK_ITEM_PERSON_NOT_MEMBER.raise();
        for (String userId : userIds)
            if (!workspaceFacade.hasMember(actor, workspaceId, userId))
                throw WorkItemErrorCode.WORK_ITEM_PERSON_NOT_MEMBER.raise();
    }

    /** The details as the kind takes them: a task with times, or a timed event with dates, is refused. */
    private static WorkItem.Details shape(WorkItem.Kind kind, WorkItem.Details details) {
        try {
            return WorkItem.Details.of(kind, details);
        } catch (IllegalArgumentException wrong) {
            throw WorkItemErrorCode.WORK_ITEM_KIND_SHAPE_INVALID.raise();
        }
    }

    /** Every label must be a live label of this workspace; deleted or foreign ids are rejected as one error. */
    private void labels(CurrentUser actor, String workspaceId, Set<String> labelIds) {
        if (!labelIds.isEmpty()
                && labelFacade.findAllById(actor, workspaceId, labelIds).size() != labelIds.size())
            throw WorkItemErrorCode.WORK_ITEM_LABEL_INVALID.raise();
    }

    private static void validateDates(WorkItem.Details details) {
        if (details.startDate() != null
                        && details.dueDate() != null
                        && details.startDate().isAfter(details.dueDate())
                || details.startsAt() != null
                        && details.endsAt() != null
                        && details.startsAt().isAfter(details.endsAt()))
            throw WorkItemErrorCode.WORK_ITEM_DATE_RANGE_INVALID.raise();
    }

    /** Records what happened to a work item in its activity (D-078): safe values only, ids for people, columns and labels. */
    private void changed(
            CurrentUser actor, String workspaceId, WorkItem item, String action, List<FieldChange> changes) {
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
    private static String ids(Set<String> ids) {
        return ids.isEmpty() ? null : ids.stream().sorted().collect(Collectors.joining(","));
    }

    private static void version(WorkItem item, long expected) {
        if (item.version() != expected) throw WorkItemErrorCode.WORK_ITEM_VERSION_CONFLICT.raise();
    }

    private static String agent(CurrentUser actor) {
        return actor.agent();
    }
}
