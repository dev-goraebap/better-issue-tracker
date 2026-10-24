package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class WorkItemViews {
    private WorkItemViews() {}

    @Schema(
            name = "WorkItemColumnCount",
            requiredProperties = {"columnId", "count"})
    public record ColumnCount(@Schema(nullable = true) UUID columnId, long count) {}

    @Schema(
            name = "WorkItemLabel",
            requiredProperties = {"id", "name", "color", "system"})
    public record Label(UUID id, String name, String color, boolean system) {}

    @Schema(
            name = "WorkItem",
            requiredProperties = {
                "id",
                "workspaceId",
                "projectId",
                "number",
                "key",
                "title",
                "description",
                "columnId",
                "columnCategory",
                "labels",
                "position",
                "priority",
                "triggerType",
                "assigneeId",
                "assigneeName",
                "startDate",
                "dueDate",
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
            UUID id,
            UUID workspaceId,
            UUID projectId,
            long number,
            String key,
            String title,
            @Schema(nullable = true) String description,
            @Schema(nullable = true) UUID columnId,

            @Schema(nullable = true, description = "Category of the column; null in the backlog")
            ColumnCategory columnCategory,

            @Schema(description = "Live labels, system labels first and then by name")
            List<Label> labels,

            double position,
            @Schema(nullable = true) WorkItem.Priority priority,
            @Schema(nullable = true) WorkItem.TriggerType triggerType,
            @Schema(nullable = true) UUID assigneeId,
            @Schema(nullable = true) String assigneeName,
            @Schema(nullable = true) LocalDate startDate,
            @Schema(nullable = true) LocalDate dueDate,
            @Schema(nullable = true) Instant closedAt,
            @Schema(nullable = true) Instant archivedAt,
            @Schema(nullable = true) Instant deletedAt,
            long version,
            Instant createdAt,
            UUID createdBy,
            @Schema(nullable = true) String createdByAgent,
            Instant updatedAt,
            UUID updatedBy,
            @Schema(nullable = true) String updatedByAgent) {
        public Item {
            labels = List.copyOf(labels);
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
