package io.github.goraebap.bit.module.workitem.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.github.goraebap.bit.module.workitem.domain.Recurrence;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.format.annotation.DateTimeFormat;

public final class WorkItemRequests {
    static final int MAX_LABELS = 50;

    private WorkItemRequests() {}

    @Schema(name = "CreateWorkItem")
    public record Create(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 20000) @Schema(nullable = true) String description,
            @Schema(nullable = true) WorkItem.Priority priority,
            @Schema(nullable = true) WorkItem.TriggerType triggerType,

            @Size(max = WorkItem.MAX_PEOPLE) @Schema(nullable = true, description = "Who does a task or attends an event")
            List<@NotNull String> peopleIds,

            @Schema(nullable = true) LocalDate startDate,
            @Schema(nullable = true) LocalDate dueDate,

            @Schema(nullable = true, description = "task (the default) or event (D-092)")
            WorkItem.Kind kind,

            @Schema(nullable = true, description = "A timed event's start")
            Instant startsAt,

            @Schema(nullable = true, description = "A timed event's end")
            Instant endsAt,

            @Schema(nullable = true, description = "An event that lasts whole days, from startDate to dueDate")
            Boolean allDay,

            @Schema(nullable = true, description = "A task's column; an event has none")
            String columnId,

            @Min(0) @Max(WorkItem.MAX_REMINDER_MINUTES) @Schema(nullable = true, description = "An event's reminder, minutes before it starts")
            Integer reminderMinutes,

            @Size(max = MAX_LABELS) @Schema(nullable = true, description = "Workspace labels to attach; omitted or null attaches none")
            List<@NotNull String> labelIds) {
        public Create {
            labelIds = labelIds == null ? null : List.copyOf(labelIds);
            peopleIds = peopleIds == null ? null : List.copyOf(peopleIds);
        }

        WorkItem.Kind kindOrTask() {
            return kind == null ? WorkItem.Kind.task : kind;
        }

        WorkItem.Details details() {
            return new WorkItem.Details(
                    title,
                    description,
                    priority,
                    triggerType,
                    peopleIds == null ? Set.of() : Set.copyOf(peopleIds),
                    startDate,
                    dueDate,
                    startsAt,
                    endsAt,
                    Boolean.TRUE.equals(allDay));
        }

        Set<String> labels() {
            return labelIds == null ? Set.of() : Set.copyOf(labelIds);
        }
    }

    @Schema(name = "WorkItemVersion")
    public record Version(@NotNull @Min(0) Long expectedVersion) {}

    /** Which occurrences of a repeating work item an edit is for (D-092): this one, or this one and every later one. */
    public enum Scope {
        single,
        following
    }

    /** A rule a work item repeats by from its own day (D-092); on an occurrence it replaces the rule from there on. */
    @Schema(name = "RepeatWorkItem")
    public record Repeat(
            @NotNull @Min(0) Long expectedVersion,
            @NotNull Recurrence.Frequency frequency,

            @Min(1) @Max(52) @Schema(nullable = true, description = "Every this many days, weeks or months; 1 when omitted")
            Integer interval,

            @Size(max = 7) @Schema(nullable = true, description = "A weekly rule's weekdays; the item's own when omitted")
            List<@NotNull DayOfWeek> weekdays,

            @Schema(nullable = true, description = "The last day an occurrence may fall on; none repeats on")
            LocalDate untilOn,

            @NotBlank @Size(max = 64) @Schema(description = "The time zone its times repeat in, such as Asia/Seoul")
            String timeZone) {
        public Repeat {
            weekdays = weekdays == null ? null : List.copyOf(weekdays);
        }

        int intervalOrOne() {
            return interval == null ? 1 : interval;
        }

        Set<DayOfWeek> days() {
            return weekdays == null ? Set.of() : Set.copyOf(weekdays);
        }
    }

    @Schema(name = "UpdateWorkItem")
    public static final class Update {
        @NotNull @Min(0) private Long expectedVersion;

        private String title;
        private @Schema(nullable = true) String description;
        private @Schema(nullable = true) WorkItem.Priority priority;
        private @Schema(nullable = true) WorkItem.TriggerType triggerType;
        private @Schema(nullable = true) LocalDate startDate;
        private @Schema(nullable = true) LocalDate dueDate;
        private WorkItem.Kind kind;
        private @Schema(nullable = true) Instant startsAt;
        private @Schema(nullable = true) Instant endsAt;
        private Boolean allDay;

        @Min(0) @Max(WorkItem.MAX_REMINDER_MINUTES) private @Schema(nullable = true) Integer reminderMinutes;

        private boolean hasReminderMinutes;

        @Size(max = MAX_LABELS) private List<@NotNull String> labelIds;

        @Size(max = WorkItem.MAX_PEOPLE) private List<@NotNull String> peopleIds;

        private boolean hasTitle, hasDescription, hasPriority, hasTriggerType, hasStartDate, hasDueDate;
        private boolean hasLabelIds, hasPeopleIds, hasKind, hasStartsAt, hasEndsAt, hasAllDay;

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

        @Schema(description = "Changing the kind keeps what fits it (D-092): an event leaves its column")
        public WorkItem.Kind getKind() {
            return kind;
        }

        public void setKind(WorkItem.Kind value) {
            kind = value;
            hasKind = value != null;
        }

        @Schema(nullable = true, description = "Omitted: people are kept. Present: the whole set is replaced")
        public List<String> getPeopleIds() {
            return peopleIds == null ? null : java.util.Collections.unmodifiableList(peopleIds);
        }

        public void setPeopleIds(List<String> value) {
            peopleIds = value == null ? null : new ArrayList<>(value);
            hasPeopleIds = true;
        }

        public Instant getStartsAt() {
            return startsAt;
        }

        public void setStartsAt(Instant value) {
            startsAt = value;
            hasStartsAt = true;
        }

        public Instant getEndsAt() {
            return endsAt;
        }

        public void setEndsAt(Instant value) {
            endsAt = value;
            hasEndsAt = true;
        }

        public Boolean getAllDay() {
            return allDay;
        }

        public Integer getReminderMinutes() {
            return reminderMinutes;
        }

        public void setReminderMinutes(Integer value) {
            reminderMinutes = value;
            hasReminderMinutes = true;
        }

        public boolean hasReminderMinutes() {
            return hasReminderMinutes;
        }

        public void setAllDay(Boolean value) {
            allDay = value;
            hasAllDay = value != null;
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

        @Schema(
                nullable = true,
                description = "Omitted: labels are kept. Present: the whole set is replaced; [] or null clears it")
        public List<String> getLabelIds() {
            return labelIds == null ? null : java.util.Collections.unmodifiableList(labelIds);
        }

        public void setLabelIds(List<String> value) {
            labelIds = value == null ? null : new ArrayList<>(value);
            hasLabelIds = true;
        }

        public boolean hasLabelIds() {
            return hasLabelIds;
        }

        Set<String> labels() {
            return labelIds == null ? Set.of() : Set.copyOf(labelIds);
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

        public boolean hasKind() {
            return hasKind;
        }

        public boolean hasPeopleIds() {
            return hasPeopleIds;
        }

        Set<String> people() {
            return peopleIds == null ? Set.of() : Set.copyOf(peopleIds);
        }

        public boolean hasStartsAt() {
            return hasStartsAt;
        }

        public boolean hasEndsAt() {
            return hasEndsAt;
        }

        public boolean hasAllDay() {
            return hasAllDay;
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

        private String targetColumnId;
        private @Schema(nullable = true) String beforeItemId;
        private @Schema(nullable = true) String afterItemId;
        private boolean hasTarget;

        public Long getExpectedVersion() {
            return expectedVersion;
        }

        public void setExpectedVersion(Long value) {
            expectedVersion = value;
        }

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true)
        public String getTargetColumnId() {
            return targetColumnId;
        }

        public void setTargetColumnId(String value) {
            targetColumnId = value;
            hasTarget = true;
        }

        public String getBeforeItemId() {
            return beforeItemId;
        }

        public void setBeforeItemId(String value) {
            beforeItemId = value;
        }

        public String getAfterItemId() {
            return afterItemId;
        }

        public void setAfterItemId(String value) {
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

    /** Filters shared by the project, My Tasks and workspace lists. */
    public abstract static class Filters {
        private @Schema(nullable = true) String personId;
        private List<String> kind = List.of();
        private List<String> labelId = List.of();
        private List<String> category = List.of();
        private Boolean hasDates;
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

        @Schema(nullable = true, description = "Items this member does or attends")
        public String getPersonId() {
            return personId;
        }

        public void setPersonId(String value) {
            personId = value;
        }

        @Schema(description = "Any of task, event (repeatable)")
        public List<String> getKind() {
            return List.copyOf(kind);
        }

        public void setKind(List<String> value) {
            kind = value == null ? List.of() : List.copyOf(value);
        }

        @Schema(description = "Any of these labels (repeatable). Deleted labels match nothing")
        public List<String> getLabelId() {
            return List.copyOf(labelId);
        }

        public void setLabelId(List<String> value) {
            labelId = value == null ? List.of() : List.copyOf(value);
        }

        @Schema(description = "Any of todo, doing, done, or none for items without a status (repeatable)")
        public List<String> getCategory() {
            return List.copyOf(category);
        }

        public void setCategory(List<String> value) {
            category = value == null ? List.of() : List.copyOf(value);
        }

        @Schema(nullable = true, description = "true: has a start or due date. false: has neither")
        public Boolean getHasDates() {
            return hasDates;
        }

        public void setHasDates(Boolean value) {
            hasDates = value;
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

        @Schema(description = "Keeps items whose start..due span (one day when only one is set) ends on or after it")
        public LocalDate getFrom() {
            return from;
        }

        public void setFrom(LocalDate value) {
            from = value;
        }

        @Schema(description = "Keeps items whose start..due span starts on or before it")
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

    public static final class ListRequest extends Filters {
        private String column;

        @Schema(description = "A column id of the project, or backlog")
        public String getColumn() {
            return column;
        }

        public void setColumn(String value) {
            column = value;
        }
    }

    public static final class WorkspaceListRequest extends Filters {
        private List<String> projectId = List.of();
        private List<String> columnId = List.of();

        @Schema(description = "Any of these projects (repeatable). Archived and deleted projects are always left out")
        public List<String> getProjectId() {
            return List.copyOf(projectId);
        }

        public void setProjectId(List<String> value) {
            projectId = value == null ? List.of() : List.copyOf(value);
        }

        @Schema(description = "Any of these columns (repeatable); use category=none for items without a status")
        public List<String> getColumnId() {
            return List.copyOf(columnId);
        }

        public void setColumnId(List<String> value) {
            columnId = value == null ? List.of() : List.copyOf(value);
        }
    }
}
