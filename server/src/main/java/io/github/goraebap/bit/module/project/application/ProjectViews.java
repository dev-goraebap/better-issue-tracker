package io.github.goraebap.bit.module.project.application;

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
            @Schema(nullable = true) Instant archivedAt,
            @Schema(nullable = true) Instant deletedAt,
            long version,
            Instant createdAt,
            UUID createdBy,
            @Schema(nullable = true) String createdByAgent,
            Instant updatedAt) {}

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
            requiredProperties = {"id", "name", "color", "position", "isFinal", "version"})
    public record Column(
            UUID id, String name, @Schema(nullable = true) String color, int position, boolean isFinal, long version) {}
}
