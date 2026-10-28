package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.workitem.domain.Recurrence;
import io.github.goraebap.bit.module.workitem.domain.RecurrenceRepository;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Repeating work items (D-092). A rule keeps its own copy of the work item it was set up on and makes each occurrence as
 * a separate work item: events eight weeks ahead, so a calendar shows them, and a task's next one when the day of its
 * latest comes, so a board holds one at a time. An edit for "this and later" changes the rule and the later occurrences
 * already made; "cancel later" deletes those and ends the rule.
 */
@Service
@RequiredArgsConstructor
public class RecurrenceService {
    static final int EVENT_WEEKS_AHEAD = 8;
    /** The agent occurrences are recorded under (D-021), as the member who last set the rule. */
    static final String AGENT = "반복";

    private final RecurrenceRepository recurrenceRepository;
    private final WorkItemRepository workItemRepository;
    private final WorkItemService workItemService;
    private final Clock clock;

    /**
     * Repeats a work item by a rule from its day. On an occurrence of another rule, that rule ends the day before and
     * its later occurrences are deleted, so the new rule takes over from here.
     */
    @Transactional
    public void repeat(
            CurrentUser actor, String workspaceId, String projectId, String id, WorkItemRequests.Repeat request) {
        var w = item(actor, workspaceId, projectId, id);
        if (w.version() != request.expectedVersion()) throw WorkItemErrorCode.WORK_ITEM_VERSION_CONFLICT.raise();
        ZoneId zone = zone(request.timeZone());
        LocalDate day = w.occurrenceOn() != null ? w.occurrenceOn() : dayOf(w, zone);
        Recurrence.Pattern pattern;
        try {
            pattern = new Recurrence.Pattern(
                    request.frequency(), request.intervalOrOne(), request.days(), day, request.untilOn());
        } catch (IllegalArgumentException invalid) {
            throw WorkItemErrorCode.WORK_ITEM_RECURRENCE_INVALID.raise();
        }
        if (w.recurrenceId() != null)
            recurrenceRepository
                    .findById(w.recurrenceId())
                    .ifPresent(old -> stopAfter(actor, workspaceId, projectId, old, day, day.minusDays(1)));
        var rule = Recurrence.create(
                workspaceId,
                projectId,
                pattern,
                zone,
                Recurrence.Template.of(w, day, zone),
                actor.userId(),
                actor.agent(),
                clock.instant());
        recurrenceRepository.save(rule);
        w.occur(rule.id(), day);
        workItemRepository.save(w);
        materialize(rule);
    }

    /** Cancels the occurrences after this one and ends the rule on its day; this one stays. */
    @Transactional
    public void stop(CurrentUser actor, String workspaceId, String projectId, String id, long expectedVersion) {
        var w = item(actor, workspaceId, projectId, id);
        if (w.version() != expectedVersion) throw WorkItemErrorCode.WORK_ITEM_VERSION_CONFLICT.raise();
        var rule = rule(w);
        stopAfter(actor, workspaceId, projectId, rule, w.occurrenceOn(), w.occurrenceOn());
    }

    /**
     * Edits this occurrence, then carries what the request changed to the rule and to the later occurrences already
     * made, each on its own day. The description goes to the rule only: an occurrence's notes are its own.
     */
    @Transactional
    public void reviseFollowing(
            CurrentUser actor, String workspaceId, String projectId, String id, WorkItemRequests.Update request) {
        workItemService.revise(actor, workspaceId, projectId, id, request);
        var w = item(actor, workspaceId, projectId, id);
        if (w.recurrenceId() == null) return;
        var rule = recurrenceRepository.findById(w.recurrenceId()).orElse(null);
        if (rule == null) return;
        boolean shape = request.hasKind()
                || request.hasStartDate()
                || request.hasDueDate()
                || request.hasStartsAt()
                || request.hasEndsAt()
                || request.hasAllDay();
        var now = Recurrence.Template.of(w, w.occurrenceOn(), rule.zone());
        var was = rule.template();
        var next = new Recurrence.Template(
                shape ? now.kind() : was.kind(),
                request.hasTitle() ? now.title() : was.title(),
                request.hasDescription() ? now.description() : was.description(),
                request.hasPriority() ? now.priority() : was.priority(),
                request.hasPeopleIds() ? now.peopleIds() : was.peopleIds(),
                request.hasLabelIds() ? now.labelIds() : was.labelIds(),
                shape && now.kind() == WorkItem.Kind.event ? null : was.columnId(),
                shape ? now.dateParts() : was.dateParts(),
                shape ? now.spanDays() : was.spanDays(),
                shape ? now.startTime() : was.startTime(),
                shape ? now.durationMinutes() : was.durationMinutes(),
                shape ? now.allDay() : was.allDay(),
                request.hasReminderMinutes() ? now.reminderMinutes() : was.reminderMinutes());
        rule.revise(next, actor.userId(), actor.agent(), clock.instant());
        recurrenceRepository.save(rule);
        for (var later : workItemRepository.findOccurrencesAfter(rule.id(), w.occurrenceOn())) {
            var u = new WorkItemRequests.Update();
            u.setExpectedVersion(later.version());
            if (request.hasTitle()) u.setTitle(request.getTitle());
            if (request.hasPriority()) u.setPriority(request.getPriority());
            if (request.hasTriggerType()) u.setTriggerType(request.getTriggerType());
            if (request.hasPeopleIds()) u.setPeopleIds(request.getPeopleIds());
            if (request.hasLabelIds()) u.setLabelIds(request.getLabelIds());
            if (request.hasTypeId()) u.setTypeId(request.getTypeId());
            if (request.hasReminderMinutes()) u.setReminderMinutes(request.getReminderMinutes());
            if (shape) {
                var on = next.on(later.occurrenceOn(), rule.zone());
                u.setKind(next.kind());
                u.setStartDate(on.startDate());
                u.setDueDate(on.dueDate());
                u.setStartsAt(on.startsAt());
                u.setEndsAt(on.endsAt());
                u.setAllDay(on.allDay());
            }
            workItemService.revise(actor, workspaceId, later.projectId(), later.id(), u);
        }
    }

    /** The rules that may still make an occurrence, for the hourly job. */
    @Transactional(readOnly = true)
    public List<String> runningIds() {
        return recurrenceRepository.findRunningIds(
                clock.instant().atZone(ZoneOffset.UTC).toLocalDate().minusDays(1));
    }

    /** Makes the occurrences a rule is due to have by now; each rule is its own transaction. */
    @Transactional
    public void materialize(String recurrenceId) {
        recurrenceRepository.findById(recurrenceId).ifPresent(this::materialize);
    }

    private void materialize(Recurrence rule) {
        var pattern = rule.pattern();
        LocalDate today = clock.instant().atZone(rule.zone()).toLocalDate();
        LocalDate latest = workItemRepository
                .findLatestOccurrence(rule.id())
                .orElse(pattern.startsOn().minusDays(1));
        // Days missed while the server was down are not made late; the series picks up from today.
        LocalDate after = latest.isBefore(today.minusDays(1)) ? today.minusDays(1) : latest;
        List<LocalDate> days;
        if (rule.template().kind() == WorkItem.Kind.event)
            days = pattern.between(after, today.plusWeeks(EVENT_WEEKS_AHEAD));
        else if (latest.isAfter(today)) days = List.of();
        else {
            var next = pattern.nextAfter(after);
            days = next == null ? List.of() : List.of(next);
        }
        if (days.isEmpty()) return;
        var actor = actor(rule);
        for (var day : days) workItemService.createOccurrence(actor, rule, day);
    }

    private void stopAfter(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            Recurrence rule,
            LocalDate day,
            LocalDate lastDay) {
        for (var later : workItemRepository.findOccurrencesAfter(rule.id(), day))
            workItemService.delete(actor, workspaceId, later.projectId(), later.id(), later.version());
        rule.end(lastDay, actor.userId(), actor.agent(), clock.instant());
        recurrenceRepository.save(rule);
    }

    private WorkItem item(CurrentUser actor, String workspaceId, String projectId, String id) {
        workItemService.requireAccess(actor, workspaceId, projectId, id, true, false);
        return workItemRepository
                .findById(projectId, id, false)
                .orElseThrow(WorkItemErrorCode.WORK_ITEM_NOT_FOUND::raise);
    }

    private Recurrence rule(WorkItem w) {
        if (w.recurrenceId() == null) throw WorkItemErrorCode.WORK_ITEM_NOT_RECURRING.raise();
        return recurrenceRepository
                .findById(w.recurrenceId())
                .orElseThrow(WorkItemErrorCode.WORK_ITEM_NOT_RECURRING::raise);
    }

    /** An item's day: its start, else its due day, else its timed start's day where it repeats, else today. */
    private LocalDate dayOf(WorkItem w, ZoneId zone) {
        var d = w.details();
        if (d.startDate() != null) return d.startDate();
        if (d.dueDate() != null) return d.dueDate();
        if (d.startsAt() != null) return d.startsAt().atZone(zone).toLocalDate();
        return clock.instant().atZone(zone).toLocalDate();
    }

    private static ZoneId zone(String id) {
        try {
            return ZoneId.of(id.strip());
        } catch (DateTimeException invalid) {
            throw WorkItemErrorCode.WORK_ITEM_RECURRENCE_INVALID.raise();
        }
    }

    /** Occurrences are made as the member who last set the rule, with the agent 반복 (D-021), as a webhook is. */
    private static CurrentUser actor(Recurrence rule) {
        return new CurrentUser(rule.audit().updatedBy(), false, CurrentUser.Method.INTEGRATION, null, AGENT, false);
    }
}
