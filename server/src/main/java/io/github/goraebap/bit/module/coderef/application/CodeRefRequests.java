package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.coderef.domain.RuleEvent;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class CodeRefRequests {
    private CodeRefRequests() {}

    @Schema(name = "ConnectRepository")
    public record Connect(
            @NotNull Provider provider,

            @Size(max = 255) @Schema(
                    nullable = true,
                    description =
                            "The host's web address; GitHub and GitLab default to their public sites, Gitea needs one")
            String baseUrl,

            @NotBlank @Size(max = 255) @Schema(description = "owner/name, or GitLab's group/project path")
            String repository,

            @NotBlank @Size(max = 500) String token) {}

    @Schema(name = "ReviseRepositoryIntegration")
    public record Revise(
            @NotNull @Min(0) Long expectedVersion,
            @Schema(nullable = true) Boolean syncsIssues,
            @Schema(nullable = true) Boolean commentsLink,

            @Size(max = 500) @Schema(nullable = true, description = "A new token, checked against the host")
            String token) {}

    @Schema(name = "SetIntegrationRules")
    public record Rules(@NotNull @Size(max = 5) List<@Valid @NotNull Rule> items) {
        public Rules {
            items = items == null ? null : List.copyOf(items);
        }
    }

    @Schema(name = "SetIntegrationRule")
    public record Rule(
            @NotNull RuleEvent event,

            @Schema(description = "false clears it back to the default")
            boolean set,

            @Schema(nullable = true, description = "The column to move to; null not to move")
            String columnId) {}
}
