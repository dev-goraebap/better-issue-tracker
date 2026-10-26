package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.module.coderef.domain.CodeLink;
import io.github.goraebap.bit.module.coderef.domain.CodeLinkRepository;
import io.github.goraebap.bit.module.coderef.domain.GitHostException;
import io.github.goraebap.bit.module.coderef.domain.Integration;
import io.github.goraebap.bit.module.coderef.domain.IntegrationRepository;
import io.github.goraebap.bit.module.coderef.domain.References;
import io.github.goraebap.bit.module.coderef.domain.Remote;
import io.github.goraebap.bit.module.coderef.domain.RuleEvent;
import io.github.goraebap.bit.module.issue.IssueFacade;
import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.link.CommentFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * What a repository tells BIT (D-087): its signed webhooks, and the open issues a manager imports. A branch or a pull
 * request naming an issue (`BIT-42`) is linked to it and moves it by the project's rules, a commit naming one is
 * linked, and the repository's issues are mirrored with BIT's both ways. What BIT itself wrote to the repository
 * carries a hidden mark and is skipped when its webhook comes back, and mirroring is idempotent, so nothing loops.
 */
@Service
@RequiredArgsConstructor
public class InboundService {
    private static final Logger LOG = LoggerFactory.getLogger(InboundService.class);
    private static final Pattern CLOSING =
            Pattern.compile("(?i)\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#([1-9][0-9]{0,9})");
    private static final int IMPORT_ISSUES = 200;
    private static final String GREY = "#95959f";
    private final IntegrationRepository integrationRepository;
    private final CodeLinkRepository codeLinkRepository;
    private final IntegrationService integrationService;
    private final ProjectFacade projectFacade;
    private final IssueFacade issueFacade;
    private final CommentFacade commentFacade;
    private final LabelFacade labelFacade;
    private final OutboundService outboundService;
    private final Hosts hosts;
    private final TransactionTemplate transactionTemplate;
    private final Clock clock;

    /** A delivery to /api/v1/hooks/{id}; refused unless signed with that integration's secret. */
    public void receive(String integrationId, Map<String, String> headers, byte[] body) {
        var integration = transactionTemplate
                .execute(status -> integrationRepository.findById(integrationId))
                .orElseThrow(CodeRefErrorCode.HOOK_REJECTED::raise);
        var host = hosts.of(integration.provider());
        if (!host.signed(headers, body, hosts.secret(integration))) throw CodeRefErrorCode.HOOK_REJECTED.raise();
        List<Remote.Event> events;
        try {
            events = host.read(headers, body);
        } catch (RuntimeException unreadable) {
            LOG.info("Unreadable delivery for integration {}: {}", integrationId, unreadable.getMessage());
            events = List.of();
        }
        integration.heard(clock.instant());
        if (!integration.active()) {
            save(integration);
            return;
        }
        var scene = scene(integration);
        String failure = null;
        for (var event : events) {
            try {
                apply(scene, event);
            } catch (BusinessException | GitHostException refused) {
                failure = refused.getMessage();
                LOG.info("Delivery for integration {} not applied: {}", integrationId, failure);
            }
        }
        if (failure == null) integration.recovered();
        else integration.failed(failure);
        save(integration);
    }

    /** Brings in the repository's open issues (and their comments), and links its open pull requests. */
    public CodeRefViews.Imported importOpen(
            CurrentUser actor, String workspaceId, String projectId, String integrationId) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        var integration = integrationService.find(projectId, integrationId);
        var host = hosts.of(integration.provider());
        var connection = hosts.connection(integration);
        var scene = scene(integration);
        int issues = 0;
        int comments = 0;
        int pulls = 0;
        try {
            for (var remote : host.openIssues(connection, IMPORT_ISSUES)) {
                if (References.fromBit(remote.body())
                        || !mirrors(scene, remote.number()).isEmpty()) continue;
                String id = createMirror(
                        scene,
                        remote.number(),
                        remote.title(),
                        remote.body(),
                        remote.url(),
                        remote.labels(),
                        remote.author());
                issues++;
                for (var comment : host.comments(connection, remote.number())) {
                    if (References.fromBit(comment.body())
                            || comment.body() == null
                            || comment.body().isBlank()) continue;
                    commentFacade.create(
                            Hosts.actor(integration, comment.author()),
                            workspaceId,
                            TargetType.issue,
                            id,
                            comment.body());
                    comments++;
                }
            }
            for (var pull : host.openPulls(connection, IMPORT_ISSUES)) {
                if (pulled(
                        scene,
                        new Remote.PullEvent(
                                "opened",
                                pull.number(),
                                pull.title(),
                                pull.body(),
                                pull.url(),
                                pull.branch(),
                                pull.draft(),
                                pull.author()))) pulls++;
            }
        } catch (GitHostException refused) {
            throw CodeRefErrorCode.INTEGRATION_HOST_REFUSED.raise(refused.getMessage());
        }
        return new CodeRefViews.Imported(issues, comments, pulls);
    }

    private void apply(Scene scene, Remote.Event event) {
        switch (event) {
            case Remote.Push push -> pushed(scene, push);
            case Remote.PullEvent pull -> pulled(scene, pull);
            case Remote.IssueEvent issue -> issued(scene, issue);
            case Remote.CommentEvent comment -> commented(scene, comment);
        }
    }

    private void pushed(Scene scene, Remote.Push push) {
        var now = clock.instant();
        var branchIssues = resolve(scene, References.keys(push.branch()));
        String last = push.commits().isEmpty() ? null : push.commits().getLast().sha();
        var links = new ArrayList<CodeLink>();
        for (String issueId : branchIssues) {
            var existing =
                    codeLinkRepository.find(scene.integration.id(), CodeLink.Kind.branch, push.branch(), issueId);
            links.add(existing.map(
                            link -> link.seen(push.branch(), CodeLink.State.open, push.sender(), shortSha(last), now))
                    .orElseGet(() -> CodeLink.of(
                            scene.integration.id(),
                            issueId,
                            CodeLink.Kind.branch,
                            push.branch(),
                            push.branchUrl() == null ? scene.integration.webUrl() : push.branchUrl(),
                            push.branch(),
                            CodeLink.State.open,
                            push.sender(),
                            shortSha(last),
                            now)));
            if (existing.isEmpty()) move(scene, issueId, RuleEvent.branch_push, push.sender());
        }
        for (var commit : push.commits()) {
            var issues = new LinkedHashSet<>(branchIssues);
            issues.addAll(resolve(scene, References.keys(commit.message())));
            String title = commit.message() == null
                    ? commit.sha()
                    : commit.message().lines().findFirst().orElse(commit.sha());
            for (String issueId : issues) {
                var existing =
                        codeLinkRepository.find(scene.integration.id(), CodeLink.Kind.commit, commit.sha(), issueId);
                if (existing.isPresent()) continue;
                links.add(CodeLink.of(
                        scene.integration.id(),
                        issueId,
                        CodeLink.Kind.commit,
                        commit.sha(),
                        commit.url() == null ? scene.integration.webUrl() : commit.url(),
                        title,
                        CodeLink.State.open,
                        commit.author(),
                        push.branch(),
                        now));
            }
        }
        if (!links.isEmpty()) transactionTemplate.executeWithoutResult(status -> codeLinkRepository.saveAll(links));
    }

    /** Links the request to the issues it names; true when it named any. */
    private boolean pulled(Scene scene, Remote.PullEvent pull) {
        var now = clock.instant();
        var issues = new LinkedHashSet<String>();
        issues.addAll(resolve(scene, References.keys(pull.branch())));
        issues.addAll(resolve(scene, References.keys(pull.title())));
        issues.addAll(resolve(scene, References.keys(pull.body())));
        var numbers = new LinkedHashSet<String>();
        var closing = CLOSING.matcher(pull.body() == null ? "" : pull.body());
        while (closing.find()) numbers.add(closing.group(1));
        numbers.addAll(References.numbers(pull.title()));
        for (String number : numbers) issues.addAll(mirrors(scene, number));
        if (issues.isEmpty()) return false;
        var state =
                switch (pull.action()) {
                    case "merged" -> CodeLink.State.merged;
                    case "closed" -> CodeLink.State.closed;
                    default -> pull.draft() ? CodeLink.State.draft : CodeLink.State.open;
                };
        var links = new ArrayList<CodeLink>();
        for (String issueId : issues) {
            var existing =
                    codeLinkRepository.find(scene.integration.id(), CodeLink.Kind.pull_request, pull.number(), issueId);
            links.add(existing.map(link -> link.seen(pull.title(), state, pull.sender(), pull.branch(), now))
                    .orElseGet(() -> CodeLink.of(
                            scene.integration.id(),
                            issueId,
                            CodeLink.Kind.pull_request,
                            pull.number(),
                            pull.url() == null ? scene.integration.webUrl() : pull.url(),
                            pull.title(),
                            state,
                            pull.sender(),
                            pull.branch(),
                            now)));
        }
        transactionTemplate.executeWithoutResult(status -> codeLinkRepository.saveAll(links));
        for (String issueId : issues) {
            if (state == CodeLink.State.merged) move(scene, issueId, RuleEvent.pr_merged, pull.sender());
            else if (state == CodeLink.State.open && !"edited".equals(pull.action()))
                move(scene, issueId, RuleEvent.pr_opened, pull.sender());
        }
        return true;
    }

    private void issued(Scene scene, Remote.IssueEvent event) {
        if (event.fromPull()) return;
        var links = mirrorLinks(scene, event.number());
        var mirrored = links.stream()
                .filter(mirror -> !stale(mirror, event.updatedAt()))
                .map(CodeLink::issueId)
                .toList();
        switch (event.action()) {
            case "opened" -> {
                if (!links.isEmpty() || References.fromBit(event.body()) || !scene.integration.syncsIssues()) return;
                createMirror(
                        scene,
                        event.number(),
                        event.title(),
                        event.body(),
                        event.url(),
                        event.labels(),
                        event.sender());
            }
            case "closed" -> mirrored.forEach(id -> move(scene, id, RuleEvent.issue_closed, event.sender()));
            case "reopened" ->
                mirrored.forEach(id -> {
                    if (category(
                                    scene,
                                    issueFacade
                                            .get(scene.actor, scene.workspaceId, scene.projectId, id)
                                            .columnId())
                            == ColumnCategory.done)
                        to(scene, id, Hosts.column(RuleEvent.issue_opened, scene.rules, scene.columns));
                });
            case "edited" -> {
                if (!scene.integration.syncsIssues()) return;
                for (String id : mirrored) {
                    var now = issueFacade.get(scene.actor, scene.workspaceId, scene.projectId, id);
                    var labels = event.labels() == null ? null : labels(scene, event.labels());
                    String description = References.withoutMarks(event.body());
                    issueFacade.revise(
                            scene.actor,
                            scene.workspaceId,
                            scene.projectId,
                            id,
                            new IssueFacade.Revision(
                                    same(now.title(), event.title()) ? null : event.title(),
                                    same(now.description(), description) ? null : description,
                                    labels == null || same(now.priority(), labels.priority)
                                            ? null
                                            : labels.priority == null ? "" : labels.priority,
                                    labels == null || labels.ids.equals(now.labelIds()) ? null : labels.ids));
                    if (labels != null && labels.columnId != null) to(scene, id, Optional.of(labels.columnId));
                }
            }
            default -> {}
        }
    }

    private void commented(Scene scene, Remote.CommentEvent event) {
        if (event.bot()
                || References.fromBit(event.body())
                || event.body() == null
                || event.body().isBlank()) return;
        if (!scene.integration.syncsIssues()) return;
        for (String id : mirrors(scene, event.number()))
            commentFacade.create(
                    Hosts.actor(scene.integration, event.author()),
                    scene.workspaceId,
                    TargetType.issue,
                    id,
                    event.body());
    }

    /** A BIT issue for a repository issue, mirrored with it; its id. */
    private String createMirror(
            Scene scene,
            String number,
            String title,
            String body,
            String url,
            List<String> remoteLabels,
            String author) {
        var labels = labels(scene, remoteLabels);
        String column = labels.columnId != null
                ? labels.columnId
                : Hosts.column(RuleEvent.issue_opened, scene.rules, scene.columns)
                        .orElse(null);
        String safeTitle = title == null || title.isBlank()
                ? "#" + number
                : title.length() > 200 ? title.substring(0, 200) : title;
        String description = References.withoutMarks(body);
        if (description != null && description.length() > 20000) description = description.substring(0, 20000);
        String id = issueFacade.create(
                Hosts.actor(scene.integration, author),
                scene.workspaceId,
                scene.projectId,
                new IssueFacade.NewIssue(
                        safeTitle,
                        description == null || description.isBlank() ? null : description,
                        labels.priority,
                        column,
                        labels.ids));
        var link = CodeLink.of(
                scene.integration.id(),
                id,
                CodeLink.Kind.issue,
                number,
                url == null ? scene.integration.webUrl() : url,
                title,
                CodeLink.State.open,
                author,
                null,
                clock.instant());
        transactionTemplate.executeWithoutResult(status -> codeLinkRepository.saveAll(List.of(link)));
        String reference = issueFacade
                .get(scene.actor, scene.workspaceId, scene.projectId, id)
                .reference();
        outboundService.announce(scene.integration, number, scene.workspaceId, reference);
        return id;
    }

    /**
     * Moves an issue by an event's rule, forward only: a branch starts work on an issue not started, an opened request
     * moves it on unless it is further already, a merge or a close finishes it unless it is done.
     */
    private void move(Scene scene, String issueId, RuleEvent event, String sender) {
        var target = Hosts.column(event, scene.rules, scene.columns);
        if (target.isEmpty()) return;
        var issue = issueFacade.get(scene.actor, scene.workspaceId, scene.projectId, issueId);
        var category = category(scene, issue.columnId());
        boolean ahead = index(scene, target.get()) > index(scene, issue.columnId());
        boolean moves =
                switch (event) {
                    case branch_push -> category == null || category == ColumnCategory.todo;
                    case pr_opened -> category != ColumnCategory.done && (category == null || ahead);
                    case pr_merged, issue_closed -> category != ColumnCategory.done;
                    case issue_opened -> true;
                };
        if (!moves) return;
        issueFacade.moveTo(
                Hosts.actor(scene.integration, sender), scene.workspaceId, scene.projectId, issueId, target.get());
        // What the repository's issue did it knows already; what its code did, its issue is told.
        if (event == RuleEvent.branch_push || event == RuleEvent.pr_opened || event == RuleEvent.pr_merged)
            outboundService.moved(scene.workspaceId, scene.projectId, issueId);
    }

    private void to(Scene scene, String issueId, Optional<String> column) {
        column.ifPresent(id -> issueFacade.moveTo(scene.actor, scene.workspaceId, scene.projectId, issueId, id));
    }

    private static ColumnCategory category(Scene scene, String columnId) {
        return columnId == null
                ? null
                : scene.columns.stream()
                        .filter(c -> c.id().equals(columnId))
                        .map(ProjectFacade.ColumnInfo::category)
                        .findFirst()
                        .orElse(null);
    }

    private static int index(Scene scene, String columnId) {
        for (int i = 0; i < scene.columns.size(); i++)
            if (scene.columns.get(i).id().equals(columnId)) return i;
        return -1;
    }

    /** The project's issues among these keys (its current key or an old one); others are skipped. */
    private Set<String> resolve(Scene scene, Set<String> keys) {
        var found = new LinkedHashSet<String>();
        for (String key : keys) {
            try {
                var ref = issueFacade.findByRef(scene.actor, scene.workspaceId, key);
                if (ref.projectId().equals(scene.projectId)) found.add(ref.id());
            } catch (BusinessException notOurs) {
                // Not an issue of this workspace: a version number, another project's key or a typo.
            }
        }
        return found;
    }

    private List<String> mirrors(Scene scene, String number) {
        return mirrorLinks(scene, number).stream().map(CodeLink::issueId).toList();
    }

    private List<CodeLink> mirrorLinks(Scene scene, String number) {
        if (number == null) return List.of();
        return transactionTemplate.execute(
                status -> codeLinkRepository.findAllByExternalId(scene.integration.id(), CodeLink.Kind.issue, number));
    }

    /**
     * Whether a delivery tells of the repository's issue as it was before BIT last wrote to it: a late echo of an
     * earlier write (its labels a column behind, its close undone since), which must not move the issue back. Hosts
     * give the time to the second, so an edit there in the same second as BIT's write is taken as the older.
     */
    private static boolean stale(CodeLink mirror, Instant changedAt) {
        return changedAt != null && !changedAt.isAfter(mirror.updatedAt());
    }

    /** A repository's labels in BIT's terms: priority:x, status:<column> and the rest as workspace labels. */
    private Labels labels(Scene scene, List<String> names) {
        String priority = null;
        String columnId = null;
        var ids = new LinkedHashSet<String>();
        for (String raw : names == null ? List.<String>of() : names) {
            if (raw == null || raw.isBlank()) continue;
            String name = raw.strip();
            String lower = name.toLowerCase(Locale.ROOT);
            if (lower.startsWith("priority:")) {
                String value = lower.substring("priority:".length()).strip();
                if (Set.of("low", "medium", "high", "urgent").contains(value)) priority = value;
                continue;
            }
            if (lower.startsWith("status:")) {
                String column = name.substring("status:".length()).strip();
                columnId = scene.columns.stream()
                        .filter(c -> c.name().equalsIgnoreCase(column))
                        .map(ProjectFacade.ColumnInfo::id)
                        .findFirst()
                        .orElse(columnId);
                continue;
            }
            if (name.length() > 64) continue;
            ids.add(labelFacade.ensure(scene.actor, scene.workspaceId, name, GREY));
        }
        return new Labels(priority, columnId, ids);
    }

    private Scene scene(Integration integration) {
        var actor = Hosts.actor(integration, null);
        var columns = projectFacade.boardColumns(actor, integration.workspaceId(), integration.projectId());
        var rules = transactionTemplate.execute(status -> integrationRepository.findRules(integration.projectId()));
        return new Scene(integration, actor, integration.workspaceId(), integration.projectId(), columns, rules);
    }

    private void save(Integration integration) {
        transactionTemplate.executeWithoutResult(
                status -> integrationRepository.findById(integration.id()).ifPresent(current -> {
                    current.heard(integration.lastEventAt());
                    if (integration.lastError() == null) current.recovered();
                    else current.failed(integration.lastError());
                    integrationRepository.save(current);
                }));
    }

    private static boolean same(String a, String b) {
        return (a == null || a.isBlank()) ? (b == null || b.isBlank()) : a.equals(b);
    }

    private static String shortSha(String sha) {
        return sha == null ? null : sha.length() > 7 ? sha.substring(0, 7) : sha;
    }

    private record Labels(String priority, String columnId, Set<String> ids) {}

    private record Scene(
            Integration integration,
            CurrentUser actor,
            String workspaceId,
            String projectId,
            List<ProjectFacade.ColumnInfo> columns,
            Map<RuleEvent, Optional<String>> rules) {}
}
