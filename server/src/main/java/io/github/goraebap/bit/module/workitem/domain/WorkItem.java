package io.github.goraebap.bit.module.workitem.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;

@Getter
public final class WorkItem {
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

    public record Details(
            String title,
            String description,
            Priority priority,
            TriggerType triggerType,
            UUID assigneeId,
            LocalDate startDate,
            LocalDate dueDate) {
        public static Details of(
                String title,
                String description,
                Priority priority,
                TriggerType triggerType,
                UUID assigneeId,
                LocalDate startDate,
                LocalDate dueDate) {
            if (title == null || title.strip().isEmpty() || title.strip().length() > 200)
                throw new IllegalArgumentException("Invalid work item title");
            if (description != null && description.length() > 20000)
                throw new IllegalArgumentException("Work item description too long");
            if (startDate != null && dueDate != null && startDate.isAfter(dueDate))
                throw new IllegalArgumentException("Invalid date range");
            return new Details(title.strip(), description, priority, triggerType, assigneeId, startDate, dueDate);
        }
    }

    private final UUID id;
    private final UUID projectId;
    private final long number;
    private Details details;
    private Set<UUID> labelIds;
    private UUID columnId;
    private double position;
    private Instant closedAt;
    private Instant archivedAt;
    private long version;
    private Audit audit;

    private WorkItem(
            UUID id,
            UUID projectId,
            long number,
            Details details,
            Set<UUID> labelIds,
            UUID columnId,
            double position,
            Instant closedAt,
            Instant archivedAt,
            long version,
            Audit audit) {
        this.id = id;
        this.projectId = projectId;
        this.number = number;
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
            UUID projectId,
            long number,
            Details details,
            Set<UUID> labelIds,
            UUID columnId,
            boolean finalColumn,
            double position,
            UUID actor,
            String agent,
            Instant now) {
        if (number < 1 || !Double.isFinite(position) || position < 0 || columnId == null && finalColumn)
            throw new IllegalArgumentException("Invalid work item position or number");
        Details valid = validate(details);
        return new WorkItem(
                UUID.randomUUID(),
                projectId,
                number,
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
            UUID id,
            UUID projectId,
            long number,
            Details details,
            Set<UUID> labelIds,
            UUID columnId,
            double position,
            Instant closedAt,
            Instant archivedAt,
            long version,
            Audit audit) {
        return new WorkItem(
                id, projectId, number, details, labelIds, columnId, position, closedAt, archivedAt, version, audit);
    }

    public void revise(Details next, UUID actor, String agent, Instant now) {
        revise(next, labelIds, actor, agent, now);
    }

    /** One revision for the fields and the label set together, so a combined edit is one version. */
    public void revise(Details next, Set<UUID> nextLabelIds, UUID actor, String agent, Instant now) {
        Details valid = validate(next);
        Set<UUID> labels = Set.copyOf(Objects.requireNonNull(nextLabelIds, "labelIds"));
        if (valid.equals(details) && labels.equals(labelIds)) return;
        this.details = valid;
        this.labelIds = labels;
        touch(actor, agent, now);
    }

    public void move(UUID columnId, boolean finalColumn, double position, UUID actor, String agent, Instant now) {
        if (!Double.isFinite(position) || position < 0 || columnId == null && finalColumn)
            throw new IllegalArgumentException("Invalid work item move");
        Instant nextClosedAt = finalColumn ? (closedAt == null ? now : closedAt) : null;
        if (Objects.equals(this.columnId, columnId)
                && Double.compare(this.position, position) == 0
                && Objects.equals(this.closedAt, nextClosedAt)) return;
        this.columnId = columnId;
        this.position = position;
        this.closedAt = nextClosedAt;
        touch(actor, agent, now);
    }

    public void archive(boolean archived, UUID actor, String agent, Instant now) {
        if (archived == (archivedAt != null)) return;
        archivedAt = archived ? now : null;
        touch(actor, agent, now);
    }

    public void delete(UUID actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    public void restore(boolean columnStillExists, UUID actor, String agent, Instant now) {
        if (audit.deletedAt() == null) return;
        if (!columnStillExists) {
            columnId = null;
            closedAt = null;
        }
        audit = audit.restore(actor, agent, now);
        version++;
    }

    private void touch(UUID actor, String agent, Instant now) {
        audit = audit.touch(actor, agent, now);
        version++;
    }

    private static Details validate(Details details) {
        Objects.requireNonNull(details, "details");
        return Details.of(
                details.title(),
                details.description(),
                details.priority(),
                details.triggerType(),
                details.assigneeId(),
                details.startDate(),
                details.dueDate());
    }
}
