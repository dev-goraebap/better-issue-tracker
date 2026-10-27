package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.workitem.domain.Recurrence;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class WorkItemViews {
    private WorkItemViews() {}

    @Schema(
            name = "WorkItemColumnCount",
            requiredProperties = {"columnId", "count"})
    public record ColumnCount(@Schema(nullable = true) String columnId, long count) {}

    @Schema(
            name = "WorkItemLabel",
            requiredProperties = {"id", "name", "color", "system"})
    public record Label(String id, String name, String color, boolean system) {}

    @Schema(
            name = "WorkItemPerson",
            requiredProperties = {"id", "name"})
    public record Person(String id, String name) {}

    /** The rule a repeating work item belongs to (D-092). */
    @Schema(
            name = "WorkItemRecurrence",
            requiredProperties = {"id", "frequency", "interval", "weekdays", "startsOn", "untilOn", "timeZone"})
    public record Repeat(
            String id,
            Recurrence.Frequency frequency,
            int interval,

            @Schema(description = "A weekly rule's weekdays, Monday first; empty otherwise")
            List<DayOfWeek> weekdays,

            LocalDate startsOn,
            @Schema(nullable = true) LocalDate untilOn,
            String timeZone) {
        public Repeat {
            weekdays = List.copyOf(weekdays);
        }

        static Repeat of(Recurrence rule) {
            var p = rule.pattern();
            return new Repeat(
                    rule.id(),
                    p.frequency(),
                    p.interval(),
                    p.weekdays().stream().sorted().toList(),
                    p.startsOn(),
                    p.untilOn(),
                    rule.zone().getId());
        }
    }

    @Schema(
            name = "WorkItem",
            requiredProperties = {
                "id",
                "workspaceId",
                "projectId",
                "number",
                "key",
                "kind",
                "title",
                "description",
                "columnId",
                "columnCategory",
                "labels",
                "position",
                "priority",
                "triggerType",
                "people",
                "startDate",
                "dueDate",
                "startsAt",
                "endsAt",
                "allDay",
                "recurrence",
                "occurrenceOn",
                "reminderMinutes",
                "closedAt",
                "archivedAt",
                "deletedAt",
                "version",
                "createdAt",
                "createdBy",
                "createdByAgent",
                "updatedAt",
                "updatedBy",
                "updatedByAgent"
            })
    public record Item(
            String id,
            String workspaceId,
            @Schema(nullable = true) String projectId,
            long number,
            String key,
            WorkItem.Kind kind,
            String title,
            @Schema(nullable = true) String description,
            @Schema(nullable = true) String columnId,

            @Schema(nullable = true, description = "Category of the column; null in the backlog")
            ColumnCategory columnCategory,

            @Schema(description = "Live labels, system labels first and then by name")
            List<Label> labels,

            double position,
            @Schema(nullable = true) WorkItem.Priority priority,
            @Schema(nullable = true) WorkItem.TriggerType triggerType,

            @Schema(description = "Who does a task or attends an event, by name")
            List<Person> people,

            @Schema(nullable = true) LocalDate startDate,
            @Schema(nullable = true) LocalDate dueDate,
            @Schema(nullable = true) Instant startsAt,
            @Schema(nullable = true) Instant endsAt,
            boolean allDay,

            @Schema(nullable = true, description = "The rule it repeats by; null when it does not repeat")
            Repeat recurrence,

            @Schema(nullable = true, description = "The day it falls on in its rule's series")
            LocalDate occurrenceOn,

            @Schema(nullable = true, description = "An event's reminder, minutes before it starts; null for none")
            Integer reminderMinutes,

            @Schema(nullable = true) Instant closedAt,
            @Schema(nullable = true) Instant archivedAt,
            @Schema(nullable = true) Instant deletedAt,
            long version,
            Instant createdAt,
            String createdBy,
            @Schema(nullable = true) String createdByAgent,
            Instant updatedAt,
            String updatedBy,
            @Schema(nullable = true) String updatedByAgent) {
        public Item {
            labels = List.copyOf(labels);
            people = List.copyOf(people);
        }
    }

    @Schema(requiredProperties = {"items", "nextCursor"})
    public record WorkItems(
            List<Item> items, @Schema(nullable = true) String nextCursor) {
        public WorkItems {
            items = List.copyOf(items);
        }
    }
}
