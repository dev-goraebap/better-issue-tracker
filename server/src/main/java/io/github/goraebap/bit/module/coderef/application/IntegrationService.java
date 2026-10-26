package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.module.coderef.domain.CodeLink;
import io.github.goraebap.bit.module.coderef.domain.CodeLinkRepository;
import io.github.goraebap.bit.module.coderef.domain.GitHostException;
import io.github.goraebap.bit.module.coderef.domain.Integration;
import io.github.goraebap.bit.module.coderef.domain.IntegrationRepository;
import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.coderef.domain.Remote;
import io.github.goraebap.bit.module.coderef.domain.RuleEvent;
import io.github.goraebap.bit.module.issue.IssueFacade;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.net.URI;
import java.time.Clock;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Connecting a project to repositories and what a manager sets for them (D-087). The host is asked before anything is
 * stored (outside a transaction), so a wrong token or name is refused with the host's reason and leaves nothing behind.
 */
@Service
@RequiredArgsConstructor
public class IntegrationService {
    private static final Logger LOG = LoggerFactory.getLogger(IntegrationService.class);
    private static final Pattern REPOSITORY = Pattern.compile("[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+){1,8}");
    private final IntegrationRepository integrationRepository;
    private final CodeLinkRepository codeLinkRepository;
    private final ProjectFacade projectFacade;
    private final IssueFacade issueFacade;
    private final WorkspaceFacade workspaceFacade;
    private final Hosts hosts;
    private final TransactionTemplate transactionTemplate;
    private final Clock clock;

    /** The project's connections; the webhook secret only for those who manage the project. */
    public List<CodeRefViews.Integration> list(CurrentUser actor, String workspaceId, String projectId) {
        projectFacade.requireAccess(actor, workspaceId, projectId, false);
        boolean manager = manages(actor, workspaceId, projectId);
        return read(() -> integrationRepository.findAllByProjectId(projectId)).stream()
                .map(each -> view(each, manager))
                .toList();
    }

    public CodeRefViews.Integration connect(
            CurrentUser actor, String workspaceId, String projectId, CodeRefRequests.Connect request) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        String base = baseUrl(request.provider(), request.baseUrl());
        String repository = repository(request.repository());
        if (read(() -> integrationRepository.findAllByProjectId(projectId)).stream()
                .anyMatch(each -> each.provider() == request.provider()))
            throw CodeRefErrorCode.INTEGRATION_EXISTS.raise();
        var host = hosts.of(request.provider());
        var connection =
                new Remote.Connection(base, repository, null, request.token().strip());
        Remote.Repository found;
        try {
            found = host.verify(connection);
        } catch (GitHostException refused) {
            throw CodeRefErrorCode.INTEGRATION_HOST_REFUSED.raise(refused.getMessage());
        }
        String secret = hosts.cipher().newSecret();
        var integration = Integration.create(
                workspaceId,
                projectId,
                request.provider(),
                base,
                found.fullName() == null ? repository : found.fullName(),
                found.externalId(),
                found.webUrl() == null ? base + "/" + repository : found.webUrl(),
                hosts.cipher().seal(connection.token()),
                hosts.cipher().seal(secret),
                found.accountLogin(),
                actor.userId(),
                agent(actor),
                clock.instant());
        write(() -> {
            if (integrationRepository.findAllByProjectId(projectId).stream()
                    .anyMatch(each -> each.provider() == request.provider()))
                throw CodeRefErrorCode.INTEGRATION_EXISTS.raise();
            integrationRepository.save(integration);
        });
        // Registering the webhook may need more than the token can (repository admin); then the manager does it.
        try {
            host.createWebhook(hosts.connection(integration), hosts.hookUrl(integration.id()), secret)
                    .ifPresent(id -> {
                        integration.registeredWebhook(id);
                        write(() -> integrationRepository.save(integration));
                    });
        } catch (GitHostException refused) {
            LOG.info("Webhook not registered for integration {}: {}", integration.id(), refused.getMessage());
        }
        return view(integration, true);
    }

    public CodeRefViews.Integration revise(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String integrationId,
            CodeRefRequests.Revise request) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        var integration = find(projectId, integrationId);
        if (integration.version() != request.expectedVersion())
            throw CodeRefErrorCode.INTEGRATION_VERSION_CONFLICT.raise();
        var now = clock.instant();
        if (request.token() != null && !request.token().isBlank()) {
            var connection = new Remote.Connection(
                    integration.baseUrl(),
                    integration.repository(),
                    integration.externalRepositoryId(),
                    request.token().strip());
            Remote.Repository found;
            try {
                found = hosts.of(integration.provider()).verify(connection);
            } catch (GitHostException refused) {
                throw CodeRefErrorCode.INTEGRATION_HOST_REFUSED.raise(refused.getMessage());
            }
            integration.replaceToken(
                    hosts.cipher().seal(connection.token()), found.accountLogin(), actor.userId(), agent(actor), now);
        }
        integration.configure(
                request.syncsIssues() == null ? integration.syncsIssues() : request.syncsIssues(),
                request.commentsLink() == null ? integration.commentsLink() : request.commentsLink(),
                actor.userId(),
                agent(actor),
                now);
        write(() -> integrationRepository.save(integration));
        return view(integration, true);
    }

    /** Removes the connection, its links and (when BIT registered it) the webhook on the host. */
    public void disconnect(CurrentUser actor, String workspaceId, String projectId, String integrationId) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        var integration = find(projectId, integrationId);
        if (integration.webhookId() != null) {
            try {
                hosts.of(integration.provider()).deleteWebhook(hosts.connection(integration), integration.webhookId());
            } catch (GitHostException | IllegalStateException unreachable) {
                LOG.info("Webhook of integration {} left on the host: {}", integration.id(), unreachable.getMessage());
            }
        }
        write(() -> integrationRepository.deleteById(integration.id()));
    }

    public CodeRefViews.Rules rules(CurrentUser actor, String workspaceId, String projectId) {
        projectFacade.requireAccess(actor, workspaceId, projectId, false);
        var columns = projectFacade.boardColumns(actor, workspaceId, projectId);
        var set = read(() -> integrationRepository.findRules(projectId));
        var items = new ArrayList<CodeRefViews.Rule>();
        for (RuleEvent event : RuleEvent.values()) {
            var rule = set.get(event);
            items.add(new CodeRefViews.Rule(
                    event, rule != null, rule == null ? null : rule.orElse(null), Hosts.defaultColumn(event, columns)));
        }
        return new CodeRefViews.Rules(items);
    }

    public CodeRefViews.Rules setRules(
            CurrentUser actor, String workspaceId, String projectId, CodeRefRequests.Rules request) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        var columns = projectFacade.boardColumns(actor, workspaceId, projectId);
        var next = new EnumMap<>(read(() -> integrationRepository.findRules(projectId)));
        for (var rule : request.items()) {
            if (!rule.set()) {
                next.remove(rule.event());
                continue;
            }
            if (rule.columnId() != null && columns.stream().noneMatch(c -> c.id().equals(rule.columnId())))
                throw CodeRefErrorCode.INTEGRATION_INVALID.raise("보드에 없는 칸입니다");
            next.put(rule.event(), Optional.ofNullable(rule.columnId()));
        }
        write(() -> integrationRepository.saveRules(projectId, next, actor.userId(), clock.instant()));
        return rules(actor, workspaceId, projectId);
    }

    /** An issue's links into the project's repositories, newest first. */
    public List<CodeRefViews.Link> links(CurrentUser actor, String workspaceId, String projectId, String issueId) {
        issueFacade.requireAccess(actor, workspaceId, projectId, issueId, false, false);
        var providers = new java.util.HashMap<String, Provider>();
        read(() -> integrationRepository.findAllByProjectId(projectId))
                .forEach(each -> providers.put(each.id(), each.provider()));
        return read(() -> codeLinkRepository.findAllByIssueId(issueId)).stream()
                .filter(link -> providers.containsKey(link.integrationId()))
                .map(link -> new CodeRefViews.Link(
                        link.id(),
                        providers.get(link.integrationId()),
                        link.kind(),
                        link.externalId(),
                        link.url(),
                        link.title(),
                        link.state(),
                        link.author(),
                        link.detail(),
                        link.updatedAt()))
                .toList();
    }

    /** The pull and merge requests of these issues, for the board's and list's badges. */
    public List<CodeRefViews.Pull> pulls(
            CurrentUser actor, String workspaceId, List<String> issueIds, List<String> projectIds) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        if (issueIds.isEmpty()) return List.of();
        var providers = new java.util.HashMap<String, Provider>();
        for (String projectId : projectIds) {
            projectFacade.requireAccess(actor, workspaceId, projectId, false);
            read(() -> integrationRepository.findAllByProjectId(projectId))
                    .forEach(each -> providers.put(each.id(), each.provider()));
        }
        return read(() -> codeLinkRepository.findAllByIssueIdIn(issueIds, CodeLink.Kind.pull_request)).stream()
                .filter(link -> providers.containsKey(link.integrationId()))
                .map(link -> new CodeRefViews.Pull(
                        link.issueId(),
                        providers.get(link.integrationId()),
                        link.externalId(),
                        link.url(),
                        link.title(),
                        link.state()))
                .toList();
    }

    Integration find(String projectId, String integrationId) {
        var integration = read(() -> integrationRepository.findById(integrationId))
                .orElseThrow(CodeRefErrorCode.INTEGRATION_NOT_FOUND::raise);
        if (!integration.projectId().equals(projectId)) throw CodeRefErrorCode.INTEGRATION_NOT_FOUND.raise();
        return integration;
    }

    private CodeRefViews.Integration view(Integration i, boolean manager) {
        return new CodeRefViews.Integration(
                i.id(),
                i.provider(),
                i.baseUrl(),
                i.repository(),
                i.webUrl(),
                i.accountLogin(),
                hosts.hookUrl(i.id()),
                manager ? hosts.secret(i) : "",
                i.webhookId() != null,
                i.syncsIssues(),
                i.commentsLink(),
                i.active(),
                i.lastEventAt(),
                i.lastError(),
                i.version());
    }

    private boolean manages(CurrentUser actor, String workspaceId, String projectId) {
        try {
            projectFacade.requireSettings(actor, workspaceId, projectId, false, true);
            return true;
        } catch (BusinessException refused) {
            return false;
        }
    }

    /** GitHub and GitLab default to their public sites; any address is http(s) without a path's trailing slash. */
    private static String baseUrl(Provider provider, String given) {
        String base = given == null || given.isBlank()
                ? provider.defaultUrl()
                : given.strip().replaceAll("/+$", "");
        if (base == null) throw CodeRefErrorCode.INTEGRATION_INVALID.raise("Gitea는 주소가 필요합니다");
        try {
            var uri = URI.create(base);
            if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                    || uri.getHost() == null
                    || uri.getQuery() != null)
                throw CodeRefErrorCode.INTEGRATION_INVALID.raise("주소는 http(s)://로 시작해야 합니다");
        } catch (IllegalArgumentException invalid) {
            throw CodeRefErrorCode.INTEGRATION_INVALID.raise("주소가 올바르지 않습니다");
        }
        return base;
    }

    /** owner/name (or a GitLab path), taken from a pasted address too. */
    private static String repository(String given) {
        String value = given.strip().replaceAll("\\.git$", "").replaceAll("/+$", "");
        int scheme = value.indexOf("://");
        if (scheme >= 0) {
            int path = value.indexOf('/', scheme + 3);
            value = path < 0 ? "" : value.substring(path + 1);
            int marker = value.indexOf("/-/");
            if (marker >= 0) value = value.substring(0, marker);
        }
        if (!REPOSITORY.matcher(value).matches())
            throw CodeRefErrorCode.INTEGRATION_INVALID.raise("저장소는 owner/name 형식입니다");
        return value;
    }

    private <T> T read(java.util.function.Supplier<T> query) {
        return transactionTemplate.execute(status -> query.get());
    }

    private void write(Runnable change) {
        transactionTemplate.executeWithoutResult(status -> change.run());
    }

    private static String agent(CurrentUser actor) {
        return actor.agent();
    }
}
