package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ColumnWorkItemSpi;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.module.workitem.domain.Recurrence;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.time.LocalDate;
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
    private final io.github.goraebap.bit.module.file.FileFacade fileFacade;
    private final WorkItemTypeService workItemTypeService;
    private final io.github.goraebap.bit.module.link.LinkFacade linkFacade;

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
        var frozen = workItemRepository.findByReference(
                workspaceId, reference.strip().toUpperCase(Locale.ROOT));
        if (frozen.isPresent()) {
            var item = frozen.get();
            access(actor, workspaceId, item.projectId(), item.id(), false, false);
            return new Ref(item.id(), item.projectId(), item.publicRef());
        }
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
    public String createWithFiles(
            CurrentUser actor, String workspaceId, String projectId, WorkItemRequests.Create request) {
        for (var upload : request.uploadIds()) {
            if (request.description() == null || !request.description().contains("attachment:" + upload))
                throw io.github.goraebap.bit.shared.error.CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
        String id = create(
                actor,
                workspaceId,
                projectId,
                request.kindOrTask(),
                request.typeId(),
                request.parentId(),
                request.details(),
                request.columnId(),
                request.labels(),
                request.reminderMinutes());
        fileFacade.attach(actor, request.uploadIds(), io.github.goraebap.bit.module.file.FileOwner.WORK_ITEM, id);
        return id;
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
        return create(actor, workspaceId, projectId, kind, details, requestedColumnId, labelIds, null);
    }

    /** As above, an event with its reminder, minutes before it starts (BIT-39). */
    @Transactional
    public String create(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            WorkItem.Kind kind,
            WorkItem.Details details,
            String requestedColumnId,
            Set<String> labelIds,
            Integer reminderMinutes) {
        return create(
                actor, workspaceId, projectId, kind, null, null, details, requestedColumnId, labelIds, reminderMinutes);
    }

    /**
     * As above, a task of a type (null: the workspace's default) and, when given, made the subtask of a parent in the
     * same step (D-104), so a type that requires a parent can be made at all.
     */
    @Transactional
    public String create(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            WorkItem.Kind kind,
            String typeId,
            String parentId,
            WorkItem.Details details,
            String requestedColumnId,
            Set<String> labelIds,
            Integer reminderMinutes) {
        String id = create(
                actor,
                workspaceId,
                projectId,
                kind,
                typeId,
                parentId,
                details,
                requestedColumnId,
                labelIds,
                reminderMinutes,
                null,
                null);
        if (parentId != null)
            linkFacade.connect(
                    actor, workspaceId, TargetType.work_item, id, "subtask_of", TargetType.work_item, parentId);
        return id;
    }

    /**
     * An occurrence a recurrence makes on a day (D-092), from its template: people who have since left and labels since
     * deleted are left out, and a task whose column has gone or is final starts in the backlog.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    String createOccurrence(CurrentUser actor, Recurrence rule, LocalDate day) {
        var t = rule.template();
        String workspaceId = rule.workspaceId();
        var details = t.on(day, rule.zone());
        var people = details.peopleIds().stream()
                .filter(person -> workspaceFacade.hasMember(actor, workspaceId, person))
                .collect(Collectors.toSet());
        details = new WorkItem.Details(
                details.title(),
                details.description(),
                details.priority(),
                details.triggerType(),
                people,
                details.startDate(),
                details.dueDate(),
                details.startsAt(),
                details.endsAt(),
                details.allDay());
        var labelIds = t.labelIds().isEmpty()
                ? Set.<String>of()
                : labelFacade.findAllById(actor, workspaceId, t.labelIds()).keySet();
        String columnId = t.columnId() == null
                ? null
                : projectFacade
                        .findColumn(actor, workspaceId, rule.projectId(), t.columnId())
                        .filter(column -> !column.finalColumn())
                        .map(ProjectFacade.ColumnRef::id)
                        .orElse(null);
        // An occurrence is the type of the one before it, unless that type needs a parent it cannot get here.
        String typeId = t.kind() != WorkItem.Kind.task
                ? null
                : workItemRepository.findOccurrencesAfter(rule.id(), LocalDate.MIN).stream()
                        .reduce((first, second) -> second)
                        .map(WorkItem::typeId)
                        .flatMap(id -> java.util.Optional.ofNullable(workItemTypeService
                                .findAllById(workspaceId, Set.of(id))
                                .get(id)))
                        .filter(type -> !type.deleted() && !type.parentRequired())
                        .map(io.github.goraebap.bit.module.workitem.domain.WorkItemType::id)
                        .orElse(null);
        return create(
                actor,
                workspaceId,
                rule.projectId(),
                t.kind(),
                typeId,
                null,
                details,
                columnId,
                labelIds,
                t.reminderMinutes(),
                rule.id(),
                day);
    }

    private String create(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            WorkItem.Kind kind,
            String typeId,
            String parentId,
            WorkItem.Details details,
            String requestedColumnId,
            Set<String> labelIds,
            Integer reminderMinutes,
            String recurrenceId,
            LocalDate occurrenceOn) {
        projectFacade.requireAccess(actor, workspaceId, projectId, true);
        validateDates(details);
        WorkItem.Details valid = shape(kind, details);
        people(actor, workspaceId, valid.peopleIds());
        labels(actor, workspaceId, labelIds);
        if (kind == WorkItem.Kind.event && typeId != null) throw eventHasNoType();
        var type = kind == WorkItem.Kind.task ? workItemTypeService.resolve(workspaceId, typeId) : null;
        if (type != null) workItemTypeService.requireParent(workspaceId, type, parent(workspaceId, parentId), null);
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
                type == null ? null : type.id(),
                valid,
                labelIds,
                columnId,
                column.finalColumn(),
                position,
                actor.userId(),
                agent(actor),
                clock.instant());
        try {
            w.remind(reminderMinutes);
        } catch (IllegalArgumentException invalid) {
            throw WorkItemErrorCode.WORK_ITEM_KIND_SHAPE_INVALID.raise();
        }
        w.locate(workspaceId, null, null);
        if (recurrenceId != null) w.occur(recurrenceId, occurrenceOn);
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
        String previousType = w.typeId();
        String typeId = hierarchy(workspaceId, w, kind, request);
        long before = w.version();
        var previousKind = w.kind();
        var previousLabels = w.labelIds();
        String previousColumn = w.columnId();
        Integer previousReminder = w.reminderMinutes();
        // A new event reminds as asked, else as before; a task has no reminder.
        Integer reminder = request.hasReminderMinutes() ? request.getReminderMinutes() : w.reminderMinutes();
        for (var upload : request.getUploadIds()) {
            if (next.description() == null || !next.description().contains("attachment:" + upload))
                throw io.github.goraebap.bit.shared.error.CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
        fileFacade.attach(actor, request.getUploadIds(), io.github.goraebap.bit.module.file.FileOwner.WORK_ITEM, id);
        w.revise(kind, typeId, next, labelIds, reminder, actor.userId(), agent(actor), clock.instant());
        if (w.version() != before) workItemRepository.save(w);
        // The parent moves after the item is saved, so the link module's own rule check reads its new type.
        if (request.hasParentId()) linkFacade.setParent(actor, workspaceId, id, request.getParentId());
        if (w.version() == before) return;
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
        field(changes, "type", previousType, w.typeId());
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
        field(changes, "reminder", text(previousReminder), text(w.reminderMinutes()));
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
        if (projectId == null) {
            w.restore(true, actor.userId(), agent(actor), clock.instant());
            workItemRepository.save(w);
            changed(actor, workspaceId, w, "restored", List.of());
            return;
        }
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
        var w = access(actor, workspaceId, projectId, workItemId, false, false);
        var d = w.details();
        return new Snapshot(
                w.id(),
                w.projectId(),
                w.number(),
                workItemRepository.reference(w),
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

    @Override
    @Transactional(readOnly = true)
    public java.util.Optional<Notice> notice(String workItemId) {
        return workItemRepository.findLocated(workItemId).map(WorkItemService::notice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Notice> remindable(java.time.Instant after, java.time.Instant through) {
        return workItemRepository.findRemindable(after, through).stream()
                .map(WorkItemService::notice)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Notice> dueOn(LocalDate day) {
        return workItemRepository.findDueOn(day).stream()
                .map(WorkItemService::notice)
                .toList();
    }

    private static Notice notice(WorkItemRepository.Located located) {
        var row = located.row();
        return new Notice(
                row.id(),
                located.workspaceId(),
                row.projectId(),
                row.projectKey() + "-" + row.number(),
                row.details().title(),
                row.kind().name(),
                row.details().peopleIds(),
                row.audit().createdBy(),
                row.details().startsAt(),
                row.reminderMinutes(),
                row.recurrenceId());
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
        if (projectId == null)
            workspaceFacade.requireAccess(
                    actor, workspaceId, writing ? WorkspaceFacade.Action.WRITE_WORK : WorkspaceFacade.Action.READ);
        else projectFacade.requireAccess(actor, workspaceId, projectId, writing);
        if (deleted) workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        var item = workItemRepository
                .findById(projectId, id, deleted)
                .orElseThrow(WorkItemErrorCode.WORK_ITEM_NOT_FOUND::raise);
        if (!workspaceId.equals(item.workspaceId())) throw WorkItemErrorCode.WORK_ITEM_NOT_FOUND.raise();
        return item;
    }

    @Transactional
    public void changeProject(
            CurrentUser actor, String workspaceId, String id, String nextProject, long expectedVersion) {
        var item = workItemRepository
                .findTarget(workspaceId, id)
                .orElseThrow(WorkItemErrorCode.WORK_ITEM_NOT_FOUND::raise);
        item = access(actor, workspaceId, item.projectId(), id, true, false);
        version(item, expectedVersion);
        if (Objects.equals(item.projectId(), nextProject)) return;
        if (nextProject != null) projectFacade.requireAccess(actor, workspaceId, nextProject, true);
        String category = item.projectId() == null
                ? item.workspaceStatus()
                : projectFacade
                        .findColumn(actor, workspaceId, item.projectId(), item.columnId())
                        .map(ProjectFacade.ColumnRef::category)
                        .map(Enum::name)
                        .orElse(null);
        String columnId = null;
        boolean closed = "done".equals(category);
        if (nextProject != null && item.kind() == WorkItem.Kind.task) {
            var choices = projectFacade.boardColumns(actor, workspaceId, nextProject);
            var target = choices.stream()
                    .filter(column -> column.category() != null
                            && column.category().name().equals(category))
                    .findFirst()
                    .orElse(null);
            if (target != null) {
                columnId = target.id();
                closed = target.finalColumn();
            } else closed = false;
        }
        String previous = item.projectId();
        item.relocate(
                nextProject,
                workItemRepository.reference(item),
                columnId,
                item.kind() == WorkItem.Kind.task && closed,
                item.kind() == WorkItem.Kind.task ? category : null,
                actor.userId(),
                actor.agent(),
                clock.instant());
        workItemRepository.save(item);
        changed(actor, workspaceId, item, "changed", List.of(new FieldChange("project", previous, nextProject)));
    }

    @Transactional
    public void changeWorkspaceStatus(
            CurrentUser actor, String workspaceId, String id, String category, long expectedVersion) {
        var item = access(actor, workspaceId, null, id, true, false);
        version(item, expectedVersion);
        String before = item.workspaceStatus();
        item.setWorkspaceStatus(category, actor.userId(), actor.agent(), clock.instant());
        workItemRepository.save(item);
        changed(actor, workspaceId, item, "changed", List.of(new FieldChange("column", before, category)));
    }

    private void applyOrder(CurrentUser actor, List<WorkItem> ordered, String columnId, boolean finalColumn) {
        for (int i = 0; i < ordered.size(); i++) {
            var item = ordered.get(i);
            long before = item.version();
            item.move(columnId, finalColumn, i, actor.userId(), agent(actor), clock.instant());
            if (item.version() != before) workItemRepository.save(item);
        }
    }

    /**
     * The type a revision leaves a work item with (D-104), refused when its parent or its children would break the
     * rules: a task keeps its type unless one is given, an event has none, and an event becoming a task gets the given
     * type or the default. Checked only when the type, the kind or the parent changes.
     */
    private String hierarchy(String workspaceId, WorkItem w, WorkItem.Kind kind, WorkItemRequests.Update request) {
        if (kind == WorkItem.Kind.event && request.hasTypeId() && request.getTypeId() != null) throw eventHasNoType();
        boolean retype = request.hasTypeId() || kind != w.kind();
        if (!retype && !request.hasParentId()) return w.typeId();
        if (request.hasParentId() && w.id().equals(request.getParentId()))
            throw WorkItemErrorCode.WORK_ITEM_MOVE_INVALID.raise();
        var type = kind == WorkItem.Kind.event
                ? null
                : request.hasTypeId() || w.typeId() == null
                        ? workItemTypeService.resolve(workspaceId, request.hasTypeId() ? request.getTypeId() : null)
                        : workItemTypeService
                                .findAllById(workspaceId, Set.of(w.typeId()))
                                .get(w.typeId());
        String item = workItemRepository.reference(w);
        if (type != null) {
            String parentId = request.hasParentId()
                    ? request.getParentId()
                    : linkFacade.parents(workspaceId, Set.of(w.id())).get(w.id());
            WorkItem parent = parentId == null
                    ? null
                    : request.hasParentId() ? parent(workspaceId, parentId) : current(workspaceId, parentId);
            workItemTypeService.requireParent(workspaceId, type, parent, item);
        }
        if (retype && !Objects.equals(type == null ? null : type.id(), w.typeId()))
            workItemTypeService.requireChildren(
                    workspaceId,
                    item,
                    type,
                    workItemRepository.findAllById(workspaceId, linkFacade.children(workspaceId, w.id())));
        return type == null ? null : type.id();
    }

    /** A live parent to put a work item under; one that is missing or deleted is not found. */
    private WorkItem parent(String workspaceId, String parentId) {
        if (parentId == null) return null;
        return workItemRepository.findAllById(workspaceId, Set.of(parentId)).stream()
                .findFirst()
                .orElseThrow(() -> WorkItemErrorCode.WORK_ITEM_NOT_FOUND.raise("상위 업무를 찾을 수 없습니다"));
    }

    /** The parent a work item already sits under, deleted or not, since its link stays (D-104). */
    private WorkItem current(String workspaceId, String parentId) {
        return workItemRepository.findAllById(workspaceId, Set.of(parentId)).stream()
                .findFirst()
                .or(() -> workItemRepository.findAnyById(workspaceId, parentId))
                .orElse(null);
    }

    private static io.github.goraebap.bit.shared.error.BusinessException eventHasNoType() {
        return WorkItemTypeErrorCode.WORK_ITEM_TYPE_INVALID.raise("일정에는 업무 유형이 없습니다. kind를 task로 주거나 typeId를 빼세요");
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
