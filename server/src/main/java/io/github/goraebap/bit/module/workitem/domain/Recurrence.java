package io.github.goraebap.bit.module.workitem.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.Getter;

/**
 * A work item that repeats (D-092): a pattern of days and a template, its own copy of the work item it was set up on.
 * Each occurrence is a separate work item made from the template on its day, so its notes, comments and links are its
 * own; changing the rule changes only the occurrences it makes from then on. Times are the rule's own time zone.
 */
@Getter
public final class Recurrence {
    public enum Frequency {
        daily,
        weekly,
        monthly
    }

    /** Which of a task's or an all-day event's dates the template has, as offsets from an occurrence's day. */
    public enum DateParts {
        none,
        start,
        due,
        both
    }

    /** Every interval days, weeks (on the weekdays) or months (on the first day's date), from startsOn to untilOn. */
    public record Pattern(
            Frequency frequency, int interval, Set<DayOfWeek> weekdays, LocalDate startsOn, LocalDate untilOn) {
        public Pattern {
            Objects.requireNonNull(frequency, "frequency");
            Objects.requireNonNull(startsOn, "startsOn");
            if (interval < 1 || interval > 52) throw new IllegalArgumentException("Invalid recurrence interval");
            if (untilOn != null && untilOn.isBefore(startsOn))
                throw new IllegalArgumentException("A recurrence ends after it starts");
            weekdays = frequency != Frequency.weekly
                    ? Set.of()
                    : weekdays == null || weekdays.isEmpty()
                            ? Set.of(startsOn.getDayOfWeek())
                            : Set.copyOf(EnumSet.copyOf(weekdays));
        }

        /** The days it falls on after one day and up to another, both of them in its range, in order. */
        public List<LocalDate> between(LocalDate after, LocalDate through) {
            var days = new ArrayList<LocalDate>();
            LocalDate last = untilOn == null || untilOn.isAfter(through) ? through : untilOn;
            switch (frequency) {
                case daily -> {
                    for (var day = startsOn; !day.isAfter(last); day = day.plusDays(interval))
                        if (day.isAfter(after)) days.add(day);
                }
                case weekly -> {
                    var week = startsOn.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                    for (; !week.isAfter(last); week = week.plusWeeks(interval))
                        for (var weekday : EnumSet.copyOf(weekdays)) {
                            var day = week.with(TemporalAdjusters.nextOrSame(weekday));
                            if (!day.isBefore(startsOn) && !day.isAfter(last) && day.isAfter(after)) days.add(day);
                        }
                }
                case monthly -> {
                    for (int month = 0; ; month += interval) {
                        var first = startsOn.withDayOfMonth(1).plusMonths(month);
                        var day = first.withDayOfMonth(Math.min(startsOn.getDayOfMonth(), first.lengthOfMonth()));
                        if (day.isAfter(last)) break;
                        if (day.isAfter(after)) days.add(day);
                    }
                }
                default -> throw new IllegalStateException("Unknown frequency " + frequency);
            }
            return days;
        }

        /** The first day it falls on after a day, or none when it has ended by then. */
        public LocalDate nextAfter(LocalDate after) {
            var limit = untilOn != null ? untilOn : after.plusYears(2);
            return between(after, limit).stream().findFirst().orElse(null);
        }
    }

    /** What each occurrence starts as: the work item's own words, people and labels, and its times on its day. */
    public record Template(
            WorkItem.Kind kind,
            String title,
            String description,
            WorkItem.Priority priority,
            Set<String> peopleIds,
            Set<String> labelIds,
            String columnId,
            DateParts dateParts,
            int spanDays,
            LocalTime startTime,
            Integer durationMinutes,
            boolean allDay) {
        public Template {
            peopleIds = peopleIds == null ? Set.of() : Set.copyOf(peopleIds);
            labelIds = labelIds == null ? Set.of() : Set.copyOf(labelIds);
        }

        /** The template of a work item, its day being the given one (its start, its due day, or its timed start's day). */
        public static Template of(WorkItem item, LocalDate day, ZoneId zone) {
            var d = item.details();
            LocalTime start = null;
            Integer minutes = null;
            if (d.startsAt() != null) {
                start = d.startsAt().atZone(zone).toLocalTime().truncatedTo(ChronoUnit.MINUTES);
                if (d.endsAt() != null) minutes = (int) ChronoUnit.MINUTES.between(d.startsAt(), d.endsAt());
            }
            DateParts parts = d.startDate() != null && d.dueDate() != null
                    ? DateParts.both
                    : d.startDate() != null ? DateParts.start : d.dueDate() != null ? DateParts.due : DateParts.none;
            int span = parts == DateParts.both ? (int) ChronoUnit.DAYS.between(d.startDate(), d.dueDate()) : 0;
            return new Template(
                    item.kind(),
                    d.title(),
                    d.description(),
                    d.priority(),
                    d.peopleIds(),
                    item.labelIds(),
                    item.kind() == WorkItem.Kind.task ? item.columnId() : null,
                    parts,
                    span,
                    start,
                    minutes,
                    d.allDay());
        }

        /** An occurrence's details on its day: the dates moved to it, or its times on it in the rule's time zone. */
        public WorkItem.Details on(LocalDate day, ZoneId zone) {
            Instant startsAt = null;
            Instant endsAt = null;
            if (startTime != null) {
                startsAt = ZonedDateTime.of(day, startTime, zone).toInstant();
                if (durationMinutes != null) endsAt = startsAt.plus(durationMinutes, ChronoUnit.MINUTES);
            }
            LocalDate start = dateParts == DateParts.start || dateParts == DateParts.both ? day : null;
            LocalDate due =
                    dateParts == DateParts.due ? day : dateParts == DateParts.both ? day.plusDays(spanDays) : null;
            return new WorkItem.Details(
                    title, description, priority, null, peopleIds, start, due, startsAt, endsAt, allDay);
        }
    }

    private final String id;
    private final String workspaceId;
    private final String projectId;
    private Pattern pattern;
    private final ZoneId zone;
    private Template template;
    private long version;
    private Audit audit;

    private Recurrence(
            String id,
            String workspaceId,
            String projectId,
            Pattern pattern,
            ZoneId zone,
            Template template,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.projectId = projectId;
        this.pattern = pattern;
        this.zone = zone;
        this.template = template;
        this.version = version;
        this.audit = audit;
    }

    public static Recurrence create(
            String workspaceId,
            String projectId,
            Pattern pattern,
            ZoneId zone,
            Template template,
            String actor,
            String agent,
            Instant now) {
        return new Recurrence(
                Ids.newId(),
                Objects.requireNonNull(workspaceId),
                Objects.requireNonNull(projectId),
                Objects.requireNonNull(pattern),
                Objects.requireNonNull(zone),
                Objects.requireNonNull(template),
                0,
                Audit.create(actor, agent, now));
    }

    public static Recurrence fromPersistence(
            String id,
            String workspaceId,
            String projectId,
            Pattern pattern,
            ZoneId zone,
            Template template,
            long version,
            Audit audit) {
        return new Recurrence(id, workspaceId, projectId, pattern, zone, template, version, audit);
    }

    /** The template from now on; occurrences already made keep what they have. */
    public void revise(Template next, String actor, String agent, Instant now) {
        if (next.equals(template)) return;
        template = Objects.requireNonNull(next);
        touch(actor, agent, now);
    }

    /** Ends it on a day: no occurrence is made after it. */
    public void end(LocalDate lastDay, String actor, String agent, Instant now) {
        var until = lastDay.isBefore(pattern.startsOn()) ? pattern.startsOn() : lastDay;
        if (until.equals(pattern.untilOn())) return;
        pattern = new Pattern(pattern.frequency(), pattern.interval(), pattern.weekdays(), pattern.startsOn(), until);
        touch(actor, agent, now);
    }

    private void touch(String actor, String agent, Instant now) {
        audit = audit.touch(actor, agent, now);
        version++;
    }
}
