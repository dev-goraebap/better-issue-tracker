package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.module.coderef.domain.CodeLink;
import io.github.goraebap.bit.module.coderef.domain.CodeLinkRepository;
import io.github.goraebap.bit.module.coderef.domain.GitHostException;
import io.github.goraebap.bit.module.coderef.domain.Integration;
import io.github.goraebap.bit.module.coderef.domain.IntegrationRepository;
import io.github.goraebap.bit.module.coderef.domain.References;
import io.github.goraebap.bit.module.coderef.domain.Remote;
import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.link.CommentChangedEvent;
import io.github.goraebap.bit.module.link.CommentFacade;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.shared.error.BusinessException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * What BIT tells a repository (D-087), for each project integration that keeps issues in step: a new issue becomes
 * the repository's issue, a changed title, description, priority, labels or column changes it (a done column closes
 * it), a comment is copied. It runs after the change commits, one at a time off the request, so a slow or failing
 * host never holds a request or a transaction; a failure is kept on the integration for its settings to show.
 * Changes that came from a repository's issue are not sent back; a column its code moved an issue to is (moved).
 */
@Service
public class OutboundService {
    private static final Logger LOG = LoggerFactory.getLogger(OutboundService.class);
    private static final Set<String> MIRRORED = Set.of("title", "description", "priority", "labels", "column");
    private final IntegrationRepository integrationRepository;
    private final CodeLinkRepository codeLinkRepository;
    private final WorkItemFacade workItemFacade;
    private final CommentFacade commentFacade;
    private final LabelFacade labelFacade;
    private final ProjectFacade projectFacade;
    private final Hosts hosts;
    private final TransactionTemplate transactionTemplate;
    private final Executor executor;
    private final Clock clock;

    OutboundService(
            IntegrationRepository integrationRepository,
            CodeLinkRepository codeLinkRepository,
            WorkItemFacade workItemFacade,
            CommentFacade commentFacade,
            LabelFacade labelFacade,
            ProjectFacade projectFacade,
            Hosts hosts,
            TransactionTemplate transactionTemplate,
            @Qualifier("repositorySyncExecutor") Executor executor,
            Clock clock) {
        this.integrationRepository = integrationRepository;
        this.codeLinkRepository = codeLinkRepository;
        this.workItemFacade = workItemFacade;
        this.commentFacade = commentFacade;
        this.labelFacade = labelFacade;
        this.projectFacade = projectFacade;
        this.hosts = hosts;
        this.transactionTemplate = transactionTemplate;
        this.executor = executor;
        this.clock = clock;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void workItemChanged(TargetChangedEvent event) {
        if (event.targetType() != TargetType.work_item
                || event.projectId() == null
                || Hosts.fromHost(event.actorAgent())) return;
        boolean created = "created".equals(event.action());
        if (!created && event.changes().stream().noneMatch(change -> MIRRORED.contains(change.field()))) return;
        executor.execute(() -> forEach(event.projectId(), integration -> {
            if (created) open(integration, event.workspaceId(), event.targetId());
            else update(integration, event.workspaceId(), event.targetId());
        }));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void commentChanged(CommentChangedEvent event) {
        if (event.targetType() != TargetType.work_item
                || !"comment_created".equals(event.action())
                || event.projectId() == null
                || Hosts.fromHost(event.actorAgent())) return;
        executor.execute(() -> forEach(event.projectId(), integration -> copy(integration, event)));
    }

    /**
     * A column a repository's code moved an issue to (a branch pushed, a pull request opened or merged): made in the
     * host's name, so issueChanged lets it pass, but news to the mirrored issues, whose status label and open or closed
     * state follow. Called once the move has committed.
     */
    void moved(String workspaceId, String projectId, String workItemId) {
        executor.execute(() -> forEach(projectId, integration -> update(integration, workspaceId, workItemId)));
    }

    /** Tells the repository's issue a BIT work item follows it, after a manager brought it in or its webhook did. */
    void announce(Integration integration, String number, String workspaceId, String reference) {
        if (!integration.commentsLink()) return;
        executor.execute(() -> guarded(integration, () -> hosts.of(integration.provider())
                .comment(
                        hosts.connection(integration),
                        number,
                        "BIT에서 [" + reference + "](" + hosts.workItemUrl(workspaceId, reference) + ")로 따라갑니다.\n\n"
                                + References.mark("link", reference))));
    }

    private void open(Integration integration, String workspaceId, String workItemId) {
        if (transactionTemplate
                .execute(status -> codeLinkRepository.findMirror(integration.id(), workItemId))
                .isPresent()) return;
        var actor = Hosts.actor(integration, null);
        var workItem = workItemFacade.get(actor, workspaceId, integration.projectId(), workItemId);
        var created = hosts.of(integration.provider())
                .createIssue(
                        hosts.connection(integration),
                        workItem.title(),
                        body(workItem, workspaceId),
                        labels(integration, workspaceId, workItem));
        var link = CodeLink.of(
                integration.id(),
                workItemId,
                CodeLink.Kind.issue,
                created.number(),
                created.url() == null ? integration.webUrl() : created.url(),
                workItem.title(),
                CodeLink.State.open,
                integration.accountLogin(),
                null,
                clock.instant());
        transactionTemplate.executeWithoutResult(status -> codeLinkRepository.saveAll(List.of(link)));
    }

    private void update(Integration integration, String workspaceId, String workItemId) {
        var mirror = transactionTemplate.execute(status -> codeLinkRepository.findMirror(integration.id(), workItemId));
        if (mirror.isEmpty()) return;
        var actor = Hosts.actor(integration, null);
        var workItem = workItemFacade.get(actor, workspaceId, integration.projectId(), workItemId);
        boolean done = projectFacade.boardColumns(actor, workspaceId, integration.projectId()).stream()
                .anyMatch(column -> column.id().equals(workItem.columnId()) && column.finalColumn());
        hosts.of(integration.provider())
                .updateIssue(
                        hosts.connection(integration),
                        mirror.get().externalId(),
                        new Remote.IssuePatch(
                                workItem.title(),
                                body(workItem, workspaceId),
                                !done,
                                labels(integration, workspaceId, workItem)));
        var seen = mirror.get()
                .seen(
                        workItem.title(),
                        done ? CodeLink.State.closed : CodeLink.State.open,
                        null,
                        null,
                        clock.instant());
        transactionTemplate.executeWithoutResult(status -> codeLinkRepository.saveAll(List.of(seen)));
    }

    private void copy(Integration integration, CommentChangedEvent event) {
        var mirror = transactionTemplate.execute(
                status -> codeLinkRepository.findMirror(integration.id(), event.targetId()));
        if (mirror.isEmpty()) return;
        var actor = Hosts.actor(integration, null);
        commentFacade.body(actor, event.workspaceId(), event.commentId()).ifPresent(body -> hosts.of(
                        integration.provider())
                .comment(
                        hosts.connection(integration),
                        mirror.get().externalId(),
                        body + "\n\n" + References.mark("comment", event.commentId())));
    }

    /** The issue's description, then a rule, BIT's hidden mark and a link back. */
    private String body(WorkItemFacade.Snapshot workItem, String workspaceId) {
        String description =
                workItem.description() == null ? "" : workItem.description().strip();
        return (description.isEmpty() ? "" : description + "\n\n") + "---\n"
                + References.mark("work_item", workItem.id()) + "\n" + "BIT [" + workItem.reference() + "]("
                + hosts.workItemUrl(workspaceId, workItem.reference()) + ")";
    }

    /** The issue's labels by name, with priority:x and status:<column> as Kaneo writes them. */
    private List<String> labels(Integration integration, String workspaceId, WorkItemFacade.Snapshot workItem) {
        var actor = Hosts.actor(integration, null);
        var names =
                new ArrayList<String>(labelFacade.findAllById(actor, workspaceId, workItem.labelIds()).values().stream()
                        .map(LabelFacade.LabelRef::name)
                        .sorted()
                        .collect(Collectors.toList()));
        if (workItem.priority() != null) names.add("priority:" + workItem.priority());
        projectFacade.boardColumns(actor, workspaceId, integration.projectId()).stream()
                .filter(column -> column.id().equals(workItem.columnId()))
                .findFirst()
                .ifPresent(column -> names.add("status:" + column.name()));
        return names;
    }

    private void forEach(String projectId, java.util.function.Consumer<Integration> send) {
        var integrations = transactionTemplate.execute(status -> integrationRepository.findAllByProjectId(projectId));
        for (var integration : integrations) {
            if (!integration.active() || !integration.syncsIssues()) continue;
            guarded(integration, () -> send.accept(integration));
        }
    }

    private void guarded(Integration integration, Runnable call) {
        try {
            call.run();
        } catch (GitHostException | BusinessException | IllegalStateException failure) {
            LOG.info("Repository sync for integration {} failed: {}", integration.id(), failure.getMessage());
            transactionTemplate.executeWithoutResult(
                    status -> integrationRepository.findById(integration.id()).ifPresent(current -> {
                        current.failed(failure.getMessage());
                        integrationRepository.save(current);
                    }));
        }
    }
}
