package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.module.coderef.domain.GitHost;
import io.github.goraebap.bit.module.coderef.domain.Integration;
import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.coderef.domain.Remote;
import io.github.goraebap.bit.module.coderef.domain.RuleEvent;
import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * What the integration services share (D-087): each host's adapter, a connection with its token opened, who changes
 * made from a repository are recorded as, BIT's own address for links and webhooks, and the column an event moves to.
 */
@Component
class Hosts {
    private final Map<Provider, GitHost> hosts;
    private final TokenCipher tokenCipher;
    private final String publicUrl;

    Hosts(List<GitHost> adapters, TokenCipher tokenCipher, @Value("${app.auth.allowed-origins}") String origins) {
        this.hosts = new EnumMap<>(adapters.stream().collect(Collectors.toMap(GitHost::provider, Function.identity())));
        this.tokenCipher = tokenCipher;
        this.publicUrl = Arrays.stream(origins.split(","))
                .map(String::strip)
                .filter(origin -> !origin.isEmpty())
                .findFirst()
                .orElse("")
                .replaceAll("/+$", "");
    }

    GitHost of(Provider provider) {
        return Objects.requireNonNull(hosts.get(provider), "No adapter for " + provider);
    }

    Remote.Connection connection(Integration integration) {
        return new Remote.Connection(
                integration.baseUrl(),
                integration.repository(),
                integration.externalRepositoryId(),
                tokenCipher.open(integration.tokenCipher()));
    }

    String secret(Integration integration) {
        return tokenCipher.open(integration.webhookSecretCipher());
    }

    TokenCipher cipher() {
        return tokenCipher;
    }

    /**
     * Who a change from the repository is recorded as (D-021): the member who connected it, with the host's name
     * (and the repository account, when one wrote it) as the agent.
     */
    static CurrentUser actor(Integration integration, String account) {
        String agent = integration.provider().label() + (account == null || account.isBlank() ? "" : " · " + account);
        return new CurrentUser(
                integration.createdBy(),
                false,
                CurrentUser.Method.INTEGRATION,
                null,
                agent.length() > 64 ? agent.substring(0, 64) : agent,
                false);
    }

    /** Whether a change was made by a repository's webhook, so it is not sent back to it. */
    static boolean fromHost(String agent) {
        if (agent == null) return false;
        return Arrays.stream(Provider.values())
                .anyMatch(p -> agent.equals(p.label()) || agent.startsWith(p.label() + " · "));
    }

    String publicUrl() {
        return publicUrl;
    }

    String hookUrl(String integrationId) {
        return publicUrl + "/api/v1/hooks/" + integrationId;
    }

    String workItemUrl(String workspaceId, String reference) {
        return publicUrl + "/workspaces/" + workspaceId + "/work-items/" + reference;
    }

    /** The column an event moves to: the project's rule, else the default by the columns' kinds. Empty: stay. */
    static Optional<String> column(
            RuleEvent event, Map<RuleEvent, Optional<String>> rules, List<ProjectFacade.ColumnInfo> columns) {
        if (rules.containsKey(event)) {
            var set = rules.get(event);
            return set.filter(id -> columns.stream().anyMatch(c -> c.id().equals(id)));
        }
        return Optional.ofNullable(defaultColumn(event, columns));
    }

    static String defaultColumn(RuleEvent event, List<ProjectFacade.ColumnInfo> columns) {
        var doing = columns.stream()
                .filter(c -> c.category() == ColumnCategory.doing)
                .toList();
        // Finishing is done, never canceled (D-111): the first closing done column, else the first done one.
        var done = columns.stream()
                .filter(c -> c.finalColumn() && c.category() == ColumnCategory.done)
                .findFirst()
                .or(() -> columns.stream()
                        .filter(c -> c.category() == ColumnCategory.done)
                        .findFirst());
        var todo = columns.stream()
                .filter(c -> c.category() == ColumnCategory.todo)
                .findFirst();
        return switch (event) {
            case branch_push -> doing.isEmpty() ? null : doing.getFirst().id();
            case pr_opened -> doing.isEmpty() ? null : doing.getLast().id();
            case pr_merged, issue_closed ->
                done.map(ProjectFacade.ColumnInfo::id).orElse(null);
            case issue_opened ->
                todo.or(() -> columns.stream().findFirst())
                        .map(ProjectFacade.ColumnInfo::id)
                        .orElse(null);
        };
    }
}
