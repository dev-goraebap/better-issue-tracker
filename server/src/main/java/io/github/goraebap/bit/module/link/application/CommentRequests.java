package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.TargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class CommentRequests {
    private CommentRequests() {}

    @Schema(name = "CreateComment")
    public record Create(
            @NotNull @Schema(allowableValues = {"work_item", "decision", "session_record", "document"})
            TargetType targetType,

            @NotNull String targetId,

            @NotBlank @Size(max = 20000) @Schema(description = "Markdown")
            String body,

            @Size(max = 20) java.util.List<@jakarta.validation.constraints.Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") String>
                    uploadIds) {
        public Create {
            uploadIds = uploadIds == null ? java.util.List.of() : java.util.List.copyOf(uploadIds);
        }

        public Create(TargetType targetType, String targetId, String body) {
            this(targetType, targetId, body, java.util.List.of());
        }
    }

    @Schema(name = "UpdateComment")
    public record Update(
            @NotBlank @Size(max = 20000) @Schema(description = "Markdown")
            String body,

            @NotNull @Min(0) Long expectedVersion) {}
}
