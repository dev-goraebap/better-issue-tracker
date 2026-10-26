package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.module.coderef.domain.CodeLink;
import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.coderef.domain.RuleEvent;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class CodeRefViews {
    private CodeRefViews() {}

    @Schema(
            name = "RepositoryIntegration",
            requiredProperties = {
                "id",
                "provider",
                "baseUrl",
                "repository",
                "webUrl",
                "accountLogin",
                "webhookUrl",
                "webhookSecret",
                "webhookRegistered",
                "syncsIssues",
                "commentsLink",
                "active",
                "lastEventAt",
                "lastError",
                "version"
            })
    public record Integration(
            String id,
            Provider provider,
            @Schema(description = "The host's web address") String baseUrl,

            @Schema(description = "owner/name, or GitLab's group/project path")
            String repository,

            String webUrl,

            @Schema(nullable = true, description = "Whose the token is, when the host says")
            String accountLogin,

            @Schema(description = "Where the host delivers its webhooks")
            String webhookUrl,

            @Schema(description = "The secret the webhooks are signed with, for registering it by hand")
            String webhookSecret,

            @Schema(description = "Whether BIT registered the webhook itself; otherwise the manager registers it")
            boolean webhookRegistered,

            boolean syncsIssues,
            boolean commentsLink,
            boolean active,
            @Schema(nullable = true) Instant lastEventAt,
            @Schema(nullable = true) String lastError,
            long version) {}

    @Schema(
            name = "IntegrationRule",
            requiredProperties = {"event", "set", "columnId", "defaultColumnId"})
    public record Rule(
            RuleEvent event,

            @Schema(description = "Whether the project set it; otherwise the default column below is used")
            boolean set,

            @Schema(nullable = true, description = "The column it moves to; null when it does not move")
            String columnId,

            @Schema(nullable = true, description = "The column the default moves to")
            String defaultColumnId) {}

    @Schema(
            name = "CodeLink",
            requiredProperties = {
                "id",
                "provider",
                "kind",
                "externalId",
                "url",
                "title",
                "state",
                "author",
                "detail",
                "updatedAt"
            })
    public record Link(
            String id,
            Provider provider,
            CodeLink.Kind kind,

            @Schema(description = "A number, a branch name or a commit sha")
            String externalId,

            String url,
            String title,
            CodeLink.State state,
            @Schema(nullable = true) String author,

            @Schema(nullable = true, description = "A pull request's branch, a commit's branch")
            String detail,

            Instant updatedAt) {}

    @Schema(
            name = "PullRequestBadge",
            requiredProperties = {"issueId", "provider", "number", "url", "title", "state"})
    public record Pull(
            String issueId, Provider provider, String number, String url, String title, CodeLink.State state) {}

    @Schema(
            name = "IssueImport",
            requiredProperties = {"issues", "comments", "pullRequests"})
    public record Imported(int issues, int comments, int pullRequests) {}

    @Schema(
            name = "IntegrationRules",
            requiredProperties = {"items"})
    public record Rules(List<Rule> items) {
        public Rules {
            items = List.copyOf(items);
        }
    }
}
