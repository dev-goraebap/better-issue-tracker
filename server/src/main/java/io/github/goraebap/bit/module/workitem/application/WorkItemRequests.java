package io.github.goraebap.bit.module.workitem.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;

public final class WorkItemRequests {
    private WorkItemRequests() {}

    @Schema(name = "CreateWorkItem")
    public record Create(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 20000) @Schema(nullable = true) String description,
            @Schema(nullable = true) WorkItem.Priority priority,
            @Schema(nullable = true) WorkItem.TriggerType triggerType,
            @Schema(nullable = true) UUID assigneeId,
            @Schema(nullable = true) LocalDate startDate,
            @Schema(nullable = true) LocalDate dueDate,
            @Schema(nullable = true) UUID columnId) {
        WorkItem.Details details() {
            return new WorkItem.Details(title, description, priority, triggerType, assigneeId, startDate, dueDate);
        }
    }

    @Schema(name = "WorkItemVersion")
    public record Version(@NotNull @Min(0) Long expectedVersion) {}

    @Schema(name = "UpdateWorkItem")
    public static final class Update {
        @NotNull @Min(0) private Long expectedVersion;

        private String title;
        private @Schema(nullable = true) String description;
        private @Schema(nullable = true) WorkItem.Priority priority;
        private @Schema(nullable = true) WorkItem.TriggerType triggerType;
        private @Schema(nullable = true) UUID assigneeId;
        private @Schema(nullable = true) LocalDate startDate;
        private @Schema(nullable = true) LocalDate dueDate;
        private boolean hasTitle, hasDescription, hasPriority, hasTriggerType, hasAssigneeId, hasStartDate, hasDueDate;

        public Long getExpectedVersion() {
            return expectedVersion;
        }

        public void setExpectedVersion(Long value) {
            expectedVersion = value;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String value) {
            title = value;
            hasTitle = true;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String value) {
            description = value;
            hasDescription = true;
        }

        public WorkItem.Priority getPriority() {
            return priority;
        }

        public void setPriority(WorkItem.Priority value) {
            priority = value;
            hasPriority = true;
        }

        public WorkItem.TriggerType getTriggerType() {
            return triggerType;
        }

        public void setTriggerType(WorkItem.TriggerType value) {
            triggerType = value;
            hasTriggerType = true;
        }

        public UUID getAssigneeId() {
            return assigneeId;
        }

        public void setAssigneeId(UUID value) {
            assigneeId = value;
            hasAssigneeId = true;
        }

        public LocalDate getStartDate() {
            return startDate;
        }

        public void setStartDate(LocalDate value) {
            startDate = value;
            hasStartDate = true;
        }

        public LocalDate getDueDate() {
            return dueDate;
        }

        public void setDueDate(LocalDate value) {
            dueDate = value;
            hasDueDate = true;
        }

        public boolean hasTitle() {
            return hasTitle;
        }

        public boolean hasDescription() {
            return hasDescription;
        }

        public boolean hasPriority() {
            return hasPriority;
        }

        public boolean hasTriggerType() {
            return hasTriggerType;
        }

        public boolean hasAssigneeId() {
            return hasAssigneeId;
        }

        public boolean hasStartDate() {
            return hasStartDate;
        }

        public boolean hasDueDate() {
            return hasDueDate;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported work item field");
        }
    }

    @Schema(name = "MoveWorkItem")
    public static final class Move {
        @NotNull @Min(0) private Long expectedVersion;

        private UUID targetColumnId;
        private @Schema(nullable = true) UUID beforeItemId;
        private @Schema(nullable = true) UUID afterItemId;
        private boolean hasTarget;

        public Long getExpectedVersion() {
            return expectedVersion;
        }

        public void setExpectedVersion(Long value) {
            expectedVersion = value;
        }

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true)
        public UUID getTargetColumnId() {
            return targetColumnId;
        }

        public void setTargetColumnId(UUID value) {
            targetColumnId = value;
            hasTarget = true;
        }

        public UUID getBeforeItemId() {
            return beforeItemId;
        }

        public void setBeforeItemId(UUID value) {
            beforeItemId = value;
        }

        public UUID getAfterItemId() {
            return afterItemId;
        }

        public void setAfterItemId(UUID value) {
            afterItemId = value;
        }

        public boolean hasTarget() {
            return hasTarget;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported move field");
        }
    }

    public static final class ListRequest {
        private @Schema(nullable = true) UUID assigneeId;
        private String column;
        private List<String> priority = List.of();
        private List<String> triggerType = List.of();

        @Size(max = 200) private String q = "";

        private boolean archived;
        private boolean deleted;
        private Boolean closed;

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate from;

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate to;

        @Min(1) @Max(100) private int size = 50;

        private String cursor;
        private String sort = "createdAt";
        private String direction = "DESC";

        public UUID getAssigneeId() {
            return assigneeId;
        }

        public void setAssigneeId(UUID value) {
            assigneeId = value;
        }

        public String getColumn() {
            return column;
        }

        public void setColumn(String value) {
            column = value;
        }

        public List<String> getPriority() {
            return List.copyOf(priority);
        }

        public void setPriority(List<String> value) {
            priority = value == null ? List.of() : List.copyOf(value);
        }

        public List<String> getTriggerType() {
            return List.copyOf(triggerType);
        }

        public void setTriggerType(List<String> value) {
            triggerType = value == null ? List.of() : List.copyOf(value);
        }

        public String getQ() {
            return q;
        }

        public void setQ(String value) {
            q = value;
        }

        public boolean isArchived() {
            return archived;
        }

        public void setArchived(boolean value) {
            archived = value;
        }

        public boolean isDeleted() {
            return deleted;
        }

        public void setDeleted(boolean value) {
            deleted = value;
        }

        public Boolean getClosed() {
            return closed;
        }

        public void setClosed(Boolean value) {
            closed = value;
        }

        public LocalDate getFrom() {
            return from;
        }

        public void setFrom(LocalDate value) {
            from = value;
        }

        public LocalDate getTo() {
            return to;
        }

        public void setTo(LocalDate value) {
            to = value;
        }

        public int getSize() {
            return size;
        }

        public void setSize(int value) {
            size = value;
        }

        public String getCursor() {
            return cursor;
        }

        public void setCursor(String value) {
            cursor = value;
        }

        public String getSort() {
            return sort;
        }

        public void setSort(String value) {
            sort = value;
        }

        public String getDirection() {
            return direction;
        }

        public void setDirection(String value) {
            direction = value;
        }
    }
}
