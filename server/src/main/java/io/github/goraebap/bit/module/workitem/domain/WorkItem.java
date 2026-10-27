package io.github.goraebap.bit.module.workitem.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Set;
import lombok.Getter;

@Getter
public final class WorkItem {
    public static final int MAX_PEOPLE = 20;

    /** A task has a column, people who do it and dates; an event has no column, people who attend and times (D-092). */
    public enum Kind {
        task,
        event
    }

    public enum Priority {
        low,
        medium,
        high,
        urgent
    }

    public enum TriggerType {
        request,
        finding,
        external,
        improvement,
        planned
    }

    /**
     * What a work item says. peopleIds are who does a task or attends an event. A task and an all-day event use the
     * dates (start..due, both days included); a timed event uses startsAt..endsAt instead.
     */
    public record Details(
            String title,
            String description,
            Priority priority,
            TriggerType triggerType,
            Set<String> peopleIds,
            LocalDate startDate,
            LocalDate dueDate,
            Instant startsAt,
            Instant endsAt,
            boolean allDay) {
        public Details {
            peopleIds = peopleIds == null ? Set.of() : Set.copyOf(peopleIds);
        }

        /** A task's details: one person or none, and dates. */
        public Details(
                String title,
                String description,
                Priority priority,
                TriggerType triggerType,
                String personId,
                LocalDate startDate,
                LocalDate dueDate) {
            this(
                    title,
                    description,
                    priority,
                    triggerType,
                    personId == null ? Set.of() : Set.of(personId),
                    startDate,
                    dueDate,
                    null,
                    null,
                    false);
        }

        /** The details checked for a kind, the title trimmed. */
        public static Details of(Kind kind, Details d) {
            if (d.title() == null
                    || d.title().strip().isEmpty()
                    || d.title().strip().length() > 200) throw new IllegalArgumentException("Invalid work item title");
            if (d.description() != null && d.description().length() > 20000)
                throw new IllegalArgumentException("Work item description too long");
            if (d.peopleIds().size() > MAX_PEOPLE) throw new IllegalArgumentException("Too many people");
            if (d.startDate() != null && d.dueDate() != null && d.startDate().isAfter(d.dueDate()))
                throw new IllegalArgumentException("Invalid date range");
            if (d.startsAt() != null && d.endsAt() != null && d.startsAt().isAfter(d.endsAt()))
                throw new IllegalArgumentException("Invalid time range");
            boolean timed = d.startsAt() != null || d.endsAt() != null;
            if (kind == Kind.task && (timed || d.allDay()))
                throw new IllegalArgumentException("A task has dates, not times");
            if (kind == Kind.event && d.allDay() && timed)
                throw new IllegalArgumentException("An all-day event has dates, not times");
            if (kind == Kind.event && !d.allDay() && (d.startDate() != null || d.dueDate() != null))
                throw new IllegalArgumentException("A timed event has times, not dates");
            if (kind == Kind.event && d.endsAt() != null && d.startsAt() == null)
                throw new IllegalArgumentException("A timed event starts before it ends");
            return new Details(
                    d.title().strip(),
                    d.description(),
                    d.priority(),
                    d.triggerType(),
                    d.peopleIds(),
                    d.startDate(),
                    d.dueDate(),
                    d.startsAt(),
                    d.endsAt(),
                    d.allDay());
        }

        /**
         * These details as the other kind keeps them (D-092): a task keeps its dates, and an event made from a task
         * with dates lasts those whole days; a timed event loses its times when it becomes a task.
         */
        public Details as(Kind kind) {
            if (kind == Kind.task)
                return new Details(
                        title, description, priority, triggerType, peopleIds, startDate, dueDate, null, null, false);
            if (startsAt != null || endsAt != null || allDay) return this;
            return new Details(
                    title,
                    description,
                    priority,
                    triggerType,
                    peopleIds,
                    startDate,
                    dueDate,
                    null,
                    null,
                    startDate != null || dueDate != null);
        }
    }

    private final String id;
    private final String projectId;
    private final long number;
    private Kind kind;
    private Details details;
    private Set<String> labelIds;
    private String columnId;
    private double position;
    private Instant closedAt;
    private Instant archivedAt;
    private long version;
    private Audit audit;

    private WorkItem(
            String id,
            String projectId,
            long number,
            Kind kind,
            Details details,
            Set<String> labelIds,
            String columnId,
            double position,
            Instant closedAt,
            Instant archivedAt,
            long version,
            Audit audit) {
        this.id = id;
        this.projectId = projectId;
        this.number = number;
        this.kind = kind;
        this.details = details;
        this.labelIds = Set.copyOf(labelIds);
        this.columnId = columnId;
        this.position = position;
        this.closedAt = closedAt;
        this.archivedAt = archivedAt;
        this.version = version;
        this.audit = audit;
    }

    public static WorkItem create(
            String projectId,
            long number,
            Kind kind,
            Details details,
            Set<String> labelIds,
            String columnId,
            boolean finalColumn,
            double position,
            String actor,
            String agent,
            Instant now) {
        if (number < 1 || !Double.isFinite(position) || position < 0 || columnId == null && finalColumn)
            throw new IllegalArgumentException("Invalid work item position or number");
        Objects.requireNonNull(kind, "kind");
        if (kind == Kind.event && columnId != null) throw new IllegalArgumentException("An event has no column");
        Details valid = Details.of(kind, Objects.requireNonNull(details, "details"));
        return new WorkItem(
                Ids.newId(),
                projectId,
                number,
                kind,
                valid,
                Objects.requireNonNull(labelIds, "labelIds"),
                columnId,
                position,
                finalColumn ? now : null,
                null,
                0,
                Audit.create(actor, agent, now));
    }

    public static WorkItem fromPersistence(
            String id,
            String projectId,
            long number,
            Kind kind,
            Details details,
            Set<String> labelIds,
            String columnId,
            double position,
            Instant closedAt,
            Instant archivedAt,
            long version,
            Audit audit) {
        return new WorkItem(
                id,
                projectId,
                number,
                kind,
                details,
                labelIds,
                columnId,
                position,
                closedAt,
                archivedAt,
                version,
                audit);
    }

    public void revise(Details next, String actor, String agent, Instant now) {
        revise(kind, next, labelIds, actor, agent, now);
    }

    /** One revision for the fields and the label set together, so a combined edit is one version. */
    public void revise(Details next, Set<String> nextLabelIds, String actor, String agent, Instant now) {
        revise(kind, next, nextLabelIds, actor, agent, now);
    }

    /**
     * One revision that may also change the kind. An event leaves the board, so its column and close are cleared and
     * the caller reorders the column it left.
     */
    public void revise(Kind nextKind, Details next, Set<String> nextLabelIds, String actor, String agent, Instant now) {
        Objects.requireNonNull(nextKind, "kind");
        Details valid = Details.of(nextKind, Objects.requireNonNull(next, "details"));
        Set<String> labels = Set.copyOf(Objects.requireNonNull(nextLabelIds, "labelIds"));
        if (nextKind == kind && valid.equals(details) && labels.equals(labelIds)) return;
        if (nextKind == Kind.event) {
            columnId = null;
            closedAt = null;
        }
        this.kind = nextKind;
        this.details = valid;
        this.labelIds = labels;
        touch(actor, agent, now);
    }

    public void move(String columnId, boolean finalColumn, double position, String actor, String agent, Instant now) {
        if (!Double.isFinite(position) || position < 0 || columnId == null && finalColumn)
            throw new IllegalArgumentException("Invalid work item move");
        if (kind == Kind.event && columnId != null) throw new IllegalArgumentException("An event has no column");
        Instant nextClosedAt = finalColumn ? (closedAt == null ? now : closedAt) : null;
        if (Objects.equals(this.columnId, columnId)
                && Double.compare(this.position, position) == 0
                && Objects.equals(this.closedAt, nextClosedAt)) return;
        this.columnId = columnId;
        this.position = position;
        this.closedAt = nextClosedAt;
        touch(actor, agent, now);
    }

    public void archive(boolean archived, String actor, String agent, Instant now) {
        if (archived == (archivedAt != null)) return;
        archivedAt = archived ? now : null;
        touch(actor, agent, now);
    }

    public void delete(String actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    public void restore(boolean columnStillExists, String actor, String agent, Instant now) {
        if (audit.deletedAt() == null) return;
        if (!columnStillExists) {
            columnId = null;
            closedAt = null;
        }
        audit = audit.restore(actor, agent, now);
        version++;
    }

    private void touch(String actor, String agent, Instant now) {
        audit = audit.touch(actor, agent, now);
        version++;
    }
}
