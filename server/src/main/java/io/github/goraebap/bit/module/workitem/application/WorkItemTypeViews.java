package io.github.goraebap.bit.module.workitem.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class WorkItemTypeViews {
    private WorkItemTypeViews() {}

    @Schema(
            name = "WorkItemType",
            requiredProperties = {
                "id",
                "workspaceId",
                "name",
                "icon",
                "color",
                "position",
                "isDefault",
                "parentRequired",
                "allowedParentTypeIds",
                "workItemCount",
                "version",
                "createdAt",
                "updatedAt"
            })
    public record Item(
            String id,
            String workspaceId,
            String name,

            @Schema(nullable = true, description = "An icon name the screen draws")
            String icon,

            String color,
            int position,

            @Schema(description = "The type a task gets when none is named; exactly one per workspace")
            boolean isDefault,

            @Schema(description = "A work item of this type must sit under one of an allowed type")
            boolean parentRequired,

            @Schema(description = "The live types it may sit under, in display order; empty for a top-level type")
            List<String> allowedParentTypeIds,

            @Schema(description = "Live work items of this type; a type in use cannot be deleted")
            long workItemCount,

            long version,
            Instant createdAt,
            Instant updatedAt) {
        public Item {
            allowedParentTypeIds = List.copyOf(allowedParentTypeIds);
        }
    }
}
