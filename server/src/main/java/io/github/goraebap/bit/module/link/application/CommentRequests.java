package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.TargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public final class CommentRequests {
    private CommentRequests() {}

    @Schema(name = "CreateComment")
    public record Create(
            @NotNull @Schema(allowableValues = {"work_item", "decision", "session_record", "artifact"})
            TargetType targetType,

            @NotNull UUID targetId,

            @NotBlank @Size(max = 20000) @Schema(description = "Markdown")
            String body) {}

    @Schema(name = "UpdateComment")
    public record Update(
            @NotBlank @Size(max = 20000) @Schema(description = "Markdown")
            String body,

            @NotNull @Min(0) Long expectedVersion) {}
}
