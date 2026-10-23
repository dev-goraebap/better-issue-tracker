package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.LinkFacade;
import io.github.goraebap.bit.module.link.TargetFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.Link;
import io.github.goraebap.bit.module.link.domain.LinkRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LinkService implements LinkFacade {
    private final LinkRepository repository;
    private final TargetFacade targets;
    private final WorkspaceFacade workspaceFacade;
    private final Clock clock;

    @Override
    @Transactional
    public UUID connect(
            CurrentUser actor,
            UUID workspaceId,
            TargetType fromType,
            UUID fromId,
            String relation,
            TargetType toType,
            UUID toId) {
        targets.requireAccess(actor, workspaceId, fromType, fromId, true);
        targets.requireAccess(actor, workspaceId, toType, toId, true);
        if ("supersedes".equals(relation)) throw LinkErrorCode.LINK_PROTECTED_RELATION.raise();
        return connect(actor, workspaceId, edge(fromType, fromId, relation, toType, toId));
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public UUID connectSupersession(CurrentUser actor, UUID workspaceId, UUID replacementId, UUID oldDecisionId) {
        var replacement = targets.requireAccess(actor, workspaceId, TargetType.decision, replacementId, true);
        var old = targets.requireAccess(actor, workspaceId, TargetType.decision, oldDecisionId, true);
        if (!replacement.projectId().equals(old.projectId())
                || !"accepted".equals(replacement.state())
                || !"accepted".equals(old.state())) throw LinkErrorCode.LINK_PROTECTED_RELATION.raise();
        return connect(
                actor,
                workspaceId,
                edge(TargetType.decision, replacementId, "supersedes", TargetType.decision, oldDecisionId));
    }

    @Override
    @Transactional
    public void disconnect(CurrentUser actor, UUID workspaceId, UUID id) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var link = repository.findById(workspaceId, id).orElseThrow(LinkErrorCode.LINK_NOT_FOUND::raise);
        var edge = link.edge();
        targets.requireAccess(actor, workspaceId, edge.fromType(), edge.fromId(), true);
        targets.requireAccess(actor, workspaceId, edge.toType(), edge.toId(), true);
        if ("supersedes".equals(edge.relation())) throw LinkErrorCode.LINK_PROTECTED_RELATION.raise();
        if (link.deletedAt() != null) return;
        link.disconnect(actor.userId(), agent(actor), clock.instant());
        repository.save(link);
    }

    private UUID connect(CurrentUser actor, UUID workspaceId, Link.Edge edge) {
        var current = repository.findActive(workspaceId, edge);
        if (current.isPresent()) return current.get().id();
        if (edge.acyclic() && repository.pathExists(workspaceId, edge.relation(), edge.toId(), edge.fromId()))
            throw LinkErrorCode.LINK_CYCLE.raise();
        if ("subtask_of".equals(edge.relation()) && repository.hasParent(workspaceId, edge.fromId()))
            throw LinkErrorCode.LINK_PARENT_CONFLICT.raise();
        if ("supersedes".equals(edge.relation()) && repository.hasReplacement(workspaceId, edge.toId()))
            throw LinkErrorCode.LINK_REPLACEMENT_CONFLICT.raise();
        var link = Link.create(workspaceId, edge, actor.userId(), agent(actor), clock.instant());
        repository.save(link);
        return link.id();
    }

    private static Link.Edge edge(TargetType fromType, UUID fromId, String relation, TargetType toType, UUID toId) {
        if (fromType == null || fromId == null || toType == null || toId == null)
            throw LinkErrorCode.LINK_RELATION_INVALID.raise();
        try {
            return Link.Edge.of(fromType, fromId, relation, toType, toId);
        } catch (IllegalArgumentException invalid) {
            throw LinkErrorCode.LINK_RELATION_INVALID.raise();
        }
    }

    private static String agent(CurrentUser actor) {
        return actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null;
    }
}
