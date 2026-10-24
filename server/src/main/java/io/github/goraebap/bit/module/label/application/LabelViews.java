package io.github.goraebap.bit.module.label.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

public final class LabelViews {
    private LabelViews() {}

    @Schema(
            name = "Label",
            requiredProperties = {
                "id",
                "workspaceId",
                "name",
                "color",
                "system",
                "systemKey",
                "version",
                "createdAt",
                "updatedAt"
            })
    public record Item(
            UUID id,
            UUID workspaceId,
            String name,
            String color,
            boolean system,

            @Schema(nullable = true, description = "decision for the decision label (결정기록)")
            String systemKey,

            long version,
            Instant createdAt,
            Instant updatedAt) {}
}
