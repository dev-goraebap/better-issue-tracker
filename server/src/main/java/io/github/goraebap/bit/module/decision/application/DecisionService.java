package io.github.goraebap.bit.module.decision.application;

import io.github.goraebap.bit.module.decision.DecisionFacade;
import io.github.goraebap.bit.module.decision.domain.Decision;
import io.github.goraebap.bit.module.decision.domain.DecisionRepository;
import io.github.goraebap.bit.module.link.LinkFacade;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DecisionService implements DecisionFacade {
    private static final Pattern REFERENCE = Pattern.compile("(?:([A-Z0-9]{2,10})\\s+)?D-([0-9]{1,19})");
    private final DecisionRepository decisionRepository;
    private final ProjectFacade projectFacade;
    private final LinkFacade linkFacade;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Clock clock;

    @Override
    @Transactional
    public String create(CurrentUser actor, String workspaceId, String projectId, Draft draft) {
        if (draft == null) throw DecisionErrorCode.DECISION_INVALID_INPUT.raise();
        return createAll(actor, workspaceId, projectId, List.of(draft)).getFirst();
    }

    @Override
    @Transactional
    public List<String> createAll(CurrentUser actor, String workspaceId, String projectId, List<Draft> drafts) {
        projectFacade.requireAccess(actor, workspaceId, projectId, true);
        if (drafts == null || drafts.isEmpty() || drafts.size() > 20)
            throw DecisionErrorCode.DECISION_INVALID_INPUT.raise();
        var details = drafts.stream().map(DecisionService::details).toList();
        long first = projectFacade.allocateDecisionNumbers(actor, workspaceId, projectId, drafts.size());
        var decisions = new ArrayList<Decision>();
        var now = clock.instant();
        for (int i = 0; i < details.size(); i++)
            decisions.add(Decision.create(projectId, first + i, details.get(i), actor.userId(), agent(actor), now));
        decisionRepository.saveAll(decisions);
        for (var decision : decisions) changed(actor, workspaceId, decision, "created", List.of());
        return decisions.stream().map(Decision::id).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Ref findByRef(CurrentUser actor, String workspaceId, String projectId, String reference) {
        var project = projectFacade.requireAccess(actor, workspaceId, projectId, false);
        var match = REFERENCE.matcher(reference == null ? "" : reference.strip().toUpperCase(Locale.ROOT));
        if (!match.matches()) throw DecisionErrorCode.DECISION_NOT_FOUND.raise();
        if (match.group(1) != null
                && !projectFacade
                        .findByKey(actor, workspaceId, match.group(1))
                        .id()
                        .equals(projectId)) throw DecisionErrorCode.DECISION_NOT_FOUND.raise();
        long number;
        try {
            number = Long.parseLong(match.group(2));
        } catch (NumberFormatException invalid) {
            throw DecisionErrorCode.DECISION_NOT_FOUND.raise();
        }
        var decision = decisionRepository
                .findByNumber(projectId, number)
                .orElseThrow(DecisionErrorCode.DECISION_NOT_FOUND::raise);
        return new Ref(decision.id(), projectId, project.key() + " D-" + String.format(Locale.ROOT, "%03d", number));
    }

    @Transactional
    public void revise(
            CurrentUser actor, String workspaceId, String projectId, String id, Draft draft, long expectedVersion) {
        var decision = access(actor, workspaceId, projectId, id, false);
        version(decision, expectedVersion);
        writable(decision);
        var before = decision.details();
        var after = details(draft);
        var changes = new ArrayList<FieldChange>();
        field(changes, "title", before.title(), after.title());
        field(changes, "body", before.body(), after.body());
        field(changes, "rejectedAlternatives", before.rejectedAlternatives(), after.rejectedAlternatives());
        field(changes, "triggerType", before.triggerType(), after.triggerType());
        if (changes.isEmpty()) return;
        decision.revise(after, actor.userId(), agent(actor), clock.instant());
        decisionRepository.save(decision);
        changed(actor, workspaceId, decision, "changed", changes);
    }

    @Transactional
    public void accept(CurrentUser actor, String workspaceId, String projectId, String id, long expectedVersion) {
        var decision = access(actor, workspaceId, projectId, id, false);
        version(decision, expectedVersion);
        writable(decision);
        if (decision.state() == Decision.State.ACCEPTED) return;
        decision.accept(actor.userId(), agent(actor), clock.instant());
        decisionRepository.save(decision);
        changed(actor, workspaceId, decision, "accepted", List.of(new FieldChange("status", "proposed", "accepted")));
    }

    @Transactional
    public void supersede(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String id,
            long expectedVersion,
            String replacementId,
            long replacementExpectedVersion) {
        var old = access(actor, workspaceId, projectId, id, false);
        var replacement = access(actor, workspaceId, projectId, replacementId, false);
        version(old, expectedVersion);
        version(replacement, replacementExpectedVersion);
        if (id.equals(replacementId)
                || old.state() != Decision.State.ACCEPTED
                || replacement.state() != Decision.State.ACCEPTED)
            throw DecisionErrorCode.DECISION_STATE_CONFLICT.raise();
        linkFacade.connectSupersession(actor, workspaceId, replacementId, id);
        old.supersede(actor.userId(), agent(actor), clock.instant());
        decisionRepository.save(old);
        changed(
                actor,
                workspaceId,
                old,
                "superseded",
                List.of(
                        new FieldChange("status", "accepted", "superseded"),
                        new FieldChange("replacementId", null, replacementId)));
    }

    @Transactional
    public void delete(CurrentUser actor, String workspaceId, String projectId, String id, long expectedVersion) {
        var decision = access(actor, workspaceId, projectId, id, true);
        version(decision, expectedVersion);
        if (decision.state() != Decision.State.PROPOSED) throw DecisionErrorCode.DECISION_STATE_CONFLICT.raise();
        if (decision.audit().deletedAt() != null) return;
        decision.delete(actor.userId(), agent(actor), clock.instant());
        decisionRepository.save(decision);
        changed(actor, workspaceId, decision, "deleted", List.of(new FieldChange("deleted", "false", "true")));
    }

    @Transactional
    public void restore(CurrentUser actor, String workspaceId, String projectId, String id, long expectedVersion) {
        var decision = access(actor, workspaceId, projectId, id, true);
        version(decision, expectedVersion);
        if (decision.state() != Decision.State.PROPOSED) throw DecisionErrorCode.DECISION_STATE_CONFLICT.raise();
        if (decision.audit().deletedAt() == null) return;
        decision.restore(actor.userId(), agent(actor), clock.instant());
        decisionRepository.save(decision);
        changed(actor, workspaceId, decision, "restored", List.of(new FieldChange("deleted", "true", "false")));
    }

    private Decision access(
            CurrentUser actor, String workspaceId, String projectId, String id, boolean includeDeleted) {
        projectFacade.requireAccess(actor, workspaceId, projectId, true);
        return decisionRepository
                .findById(projectId, id, includeDeleted)
                .orElseThrow(DecisionErrorCode.DECISION_NOT_FOUND::raise);
    }

    private void changed(
            CurrentUser actor, String workspaceId, Decision decision, String action, List<FieldChange> changes) {
        applicationEventPublisher.publishEvent(new TargetChangedEvent(
                workspaceId,
                decision.projectId(),
                TargetType.decision,
                decision.id(),
                action,
                decision.version(),
                actor.userId(),
                agent(actor),
                decision.audit().updatedAt(),
                changes));
    }

    private static void field(List<FieldChange> changes, String field, String before, String after) {
        if (!Objects.equals(before, after)) changes.add(new FieldChange(field, before, after));
    }

    private static Decision.Details details(Draft draft) {
        if (draft == null) throw DecisionErrorCode.DECISION_INVALID_INPUT.raise();
        try {
            return Decision.Details.of(draft.title(), draft.body(), draft.rejectedAlternatives(), draft.triggerType());
        } catch (IllegalArgumentException invalid) {
            throw DecisionErrorCode.DECISION_INVALID_INPUT.raise();
        }
    }

    private static void writable(Decision decision) {
        if (decision.state() == Decision.State.SUPERSEDED) throw DecisionErrorCode.DECISION_STATE_CONFLICT.raise();
    }

    private static void version(Decision decision, long expected) {
        if (decision.version() != expected) throw DecisionErrorCode.DECISION_VERSION_CONFLICT.raise();
    }

    private static String agent(CurrentUser actor) {
        return actor.agent();
    }
}
