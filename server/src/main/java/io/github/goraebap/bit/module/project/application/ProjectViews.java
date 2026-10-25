package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.module.project.ColumnCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ProjectViews {
    private ProjectViews() {}

    @Schema(
            name = "Project",
            requiredProperties = {
                "id",
                "workspaceId",
                "name",
                "key",
                "description",
                "icon",
                "color",
                "archivedAt",
                "deletedAt",
                "version",
                "createdAt",
                "createdBy",
                "createdByAgent",
                "updatedAt"
            })
    public record ProjectInfo(
            UUID id,
            UUID workspaceId,
            String name,
            String key,
            @Schema(nullable = true) String description,

            @Schema(nullable = true, description = "One of the views' icon names; absent, the key's first letter shows")
            String icon,

            @Schema(nullable = true) String color,
            @Schema(nullable = true) Instant archivedAt,
            @Schema(nullable = true) Instant deletedAt,
            long version,
            Instant createdAt,
            UUID createdBy,
            @Schema(nullable = true) String createdByAgent,
            Instant updatedAt) {}

    /** A member of a project (D-075): where they work, shown on the members page; it grants nothing. */
    @Schema(
            name = "ProjectMembership",
            requiredProperties = {"projectId", "userId"})
    public record Membership(UUID projectId, UUID userId) {}

    @Schema(
            name = "ProjectMemberships",
            requiredProperties = {"items"})
    public record Memberships(List<Membership> items) {
        public Memberships {
            items = List.copyOf(items);
        }
    }

    @Schema(requiredProperties = {"items", "nextCursor"})
    public record Projects(
            List<ProjectInfo> items,
            @Schema(nullable = true) String nextCursor) {
        public Projects {
            items = List.copyOf(items);
        }
    }

    @Schema(
            name = "BoardColumn",
            requiredProperties = {"id", "name", "color", "position", "isFinal", "category", "version"})
    public record Column(
            UUID id,
            String name,
            @Schema(nullable = true) String color,
            int position,
            boolean isFinal,
            ColumnCategory category,
            long version) {}
}
