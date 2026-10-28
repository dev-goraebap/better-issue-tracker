package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.LinkFacade;
import io.github.goraebap.bit.module.link.TargetFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.Link;
import io.github.goraebap.bit.module.link.domain.LinkRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LinkService implements LinkFacade {
    private static final String SUBTASK_OF = "subtask_of";
    private final LinkRepository repository;
    private final TargetFacade targets;
    private final WorkspaceFacade workspaceFacade;
    private final Clock clock;
    private final RelationQuery relationQuery;
    private final io.github.goraebap.bit.module.project.ProjectFacade projectFacade;
    private final org.springframework.context.ApplicationEventPublisher events;
    private final io.github.goraebap.bit.module.link.SubtaskRuleSpi subtaskRuleSpi;

    @org.springframework.beans.factory.annotation.Value("${app.auth.allowed-origins}")
    private String origins;

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void connectSessionRecord(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String sessionId,
            List<String> decisionIds,
            List<String> workItemIds) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        if (decisionIds == null
                || workItemIds == null
                || decisionIds.size() > 20
                || workItemIds.size() > 100
                || sessionId == null
                || decisionIds.stream().anyMatch(java.util.Objects::isNull)
                || workItemIds.stream().anyMatch(java.util.Objects::isNull))
            throw LinkErrorCode.LINK_RELATION_INVALID.raise();
        var decisions = new LinkedHashSet<>(decisionIds);
        var workItems = new LinkedHashSet<>(workItemIds);
        targets.requireAllInProject(actor, workspaceId, projectId, TargetType.session_record, Set.of(sessionId), true);
        if (!decisions.isEmpty())
            targets.requireAllInProject(actor, workspaceId, projectId, TargetType.decision, decisions, true);
        if (!workItems.isEmpty())
            targets.requireAllInProject(actor, workspaceId, projectId, TargetType.work_item, workItems, true);
        var edges = new ArrayList<Link.Edge>();
        for (String id : decisions)
            edges.add(edge(TargetType.decision, id, "derives_from", TargetType.session_record, sessionId));
        for (String id : workItems)
            edges.add(edge(TargetType.session_record, sessionId, "relates_to", TargetType.work_item, id));
        var existing = repository.findAllActive(workspaceId, edges).stream()
                .map(Link::edge)
                .collect(Collectors.toSet());
        var now = clock.instant();
        var missing = edges.stream()
                .filter(e -> !existing.contains(e))
                .map(e -> Link.create(workspaceId, e, actor.userId(), agent(actor), now))
                .toList();
        repository.saveAll(missing);
    }

    @Override
    @Transactional
    public String connect(
            CurrentUser actor,
            String workspaceId,
            TargetType fromType,
            String fromId,
            String relation,
            TargetType toType,
            String toId) {
        if ("mentions".equals(relation)) throw LinkErrorCode.LINK_PROTECTED_RELATION.raise();
        var from = targets.requireAccess(actor, workspaceId, fromType, fromId, true);
        var to = targets.requireAccess(actor, workspaceId, toType, toId, !"references".equals(relation));
        if ("supersedes".equals(relation)) throw LinkErrorCode.LINK_PROTECTED_RELATION.raise();
        var edge = edge(fromType, fromId, relation, toType, toId);
        boolean exists = repository.findActive(workspaceId, edge).isPresent();
        String id = connect(actor, workspaceId, edge);
        if (!exists) {
            changed(actor, from, "added");
            changed(actor, to, "added");
        }
        return id;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public String connectSupersession(
            CurrentUser actor, String workspaceId, String replacementId, String oldDecisionId) {
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
    public void disconnect(CurrentUser actor, String workspaceId, String id) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var link = repository.findById(workspaceId, id).orElseThrow(LinkErrorCode.LINK_NOT_FOUND::raise);
        var edge = link.edge();
        if ("mentions".equals(edge.relation())) throw LinkErrorCode.LINK_PROTECTED_RELATION.raise();
        var from = targets.requireAccess(actor, workspaceId, edge.fromType(), edge.fromId(), true);
        var to = targets.requireAccess(
                actor, workspaceId, edge.toType(), edge.toId(), !"references".equals(edge.relation()));
        if ("supersedes".equals(edge.relation())) throw LinkErrorCode.LINK_PROTECTED_RELATION.raise();
        if (link.deletedAt() != null) return;
        if (SUBTASK_OF.equals(edge.relation())) subtaskRuleSpi.requireParentOptional(workspaceId, edge.fromId());
        link.disconnect(actor.userId(), agent(actor), clock.instant());
        repository.save(link);
        changed(actor, from, "removed");
        changed(actor, to, "removed");
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<String, String> parents(String workspaceId, Set<String> childIds) {
        return repository.findParentIds(workspaceId, childIds);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> children(String workspaceId, String parentId) {
        return repository.findChildIds(workspaceId, parentId);
    }

    @Override
    @Transactional
    public void setParent(CurrentUser actor, String workspaceId, String childId, String parentId) {
        var child = targets.requireAccess(actor, workspaceId, TargetType.work_item, childId, true);
        var current = repository.findParentLink(workspaceId, childId);
        String before = current.map(link -> link.edge().toId()).orElse(null);
        if (java.util.Objects.equals(before, parentId)) return;
        var now = clock.instant();
        io.github.goraebap.bit.module.link.TargetRef to = null;
        Link.Edge edge = null;
        if (parentId == null) {
            subtaskRuleSpi.requireParentOptional(workspaceId, childId);
        } else {
            to = targets.requireAccess(actor, workspaceId, TargetType.work_item, parentId, true);
            edge = edge(TargetType.work_item, childId, SUBTASK_OF, TargetType.work_item, parentId);
            if (repository.pathExists(workspaceId, SUBTASK_OF, parentId, childId))
                throw LinkErrorCode.LINK_CYCLE.raise();
            subtaskRuleSpi.requireParentAllowed(workspaceId, childId, parentId);
        }
        // The old link goes first: a work item has one live parent link at a time.
        if (current.isPresent()) {
            var link = current.get();
            link.disconnect(actor.userId(), agent(actor), now);
            repository.save(link);
            // A parent since deleted keeps its link (D-104) but has no activity to tell.
            try {
                changed(
                        actor,
                        targets.requireAccess(actor, workspaceId, TargetType.work_item, before, false),
                        "removed");
            } catch (io.github.goraebap.bit.shared.error.BusinessException gone) {
                if (gone.errorCode() != LinkErrorCode.LINK_TARGET_NOT_FOUND) throw gone;
            }
        }
        if (edge != null) {
            repository.save(Link.create(workspaceId, edge, actor.userId(), agent(actor), now));
            changed(actor, to, "added");
        }
        changed(actor, child, parentId == null ? "removed" : "added");
    }

    private String connect(CurrentUser actor, String workspaceId, Link.Edge edge) {
        var current = repository.findActive(workspaceId, edge);
        if (current.isPresent()) return current.get().id();
        if (edge.acyclic() && repository.pathExists(workspaceId, edge.relation(), edge.toId(), edge.fromId()))
            throw LinkErrorCode.LINK_CYCLE.raise();
        if (SUBTASK_OF.equals(edge.relation()) && repository.hasParent(workspaceId, edge.fromId()))
            throw LinkErrorCode.LINK_PARENT_CONFLICT.raise();
        if (SUBTASK_OF.equals(edge.relation()))
            subtaskRuleSpi.requireParentAllowed(workspaceId, edge.fromId(), edge.toId());
        if ("supersedes".equals(edge.relation()) && repository.hasReplacement(workspaceId, edge.toId()))
            throw LinkErrorCode.LINK_REPLACEMENT_CONFLICT.raise();
        var link = Link.create(workspaceId, edge, actor.userId(), agent(actor), clock.instant());
        repository.save(link);
        return link.id();
    }

    @Override
    @Transactional(readOnly = true)
    public List<io.github.goraebap.bit.module.link.RelationRef> relations(
            CurrentUser actor, String workspace, TargetType type, String id) {
        targets.requireAccess(actor, workspace, type, id, false);
        var links = repository.around(workspace, type, id);
        var summaries = new java.util.HashMap<String, RelationQuery.Summary>();
        for (var targetType : List.of(TargetType.work_item, TargetType.document)) {
            var ids = links.stream()
                    .map(link -> link.edge())
                    .map(e -> e.fromType() == type && e.fromId().equals(id)
                            ? new java.util.AbstractMap.SimpleEntry<>(e.toType(), e.toId())
                            : new java.util.AbstractMap.SimpleEntry<>(e.fromType(), e.fromId()))
                    .filter(e -> e.getKey() == targetType)
                    .map(java.util.Map.Entry::getValue)
                    .collect(Collectors.toSet());
            for (var summary : relationQuery.summaries(workspace, targetType, ids))
                summaries.put(targetType + ":" + summary.id(), summary);
        }
        var readable = new java.util.HashMap<String, Boolean>();
        var result = new ArrayList<io.github.goraebap.bit.module.link.RelationRef>();
        for (var link : links) {
            var e = link.edge();
            boolean outgoing = e.fromType() == type && e.fromId().equals(id);
            var summary =
                    summaries.get((outgoing ? e.toType() : e.fromType()) + ":" + (outgoing ? e.toId() : e.fromId()));
            if (summary == null) continue;
            if (summary.projectId() != null
                    && !readable.computeIfAbsent(summary.projectId(), project -> {
                        try {
                            projectFacade.requireAccess(actor, workspace, project, false);
                            return true;
                        } catch (io.github.goraebap.bit.shared.error.BusinessException denied) {
                            return false;
                        }
                    })) continue;
            result.add(new io.github.goraebap.bit.module.link.RelationRef(
                    link.id(),
                    e.relation(),
                    outgoing,
                    summary.type(),
                    summary.id(),
                    summary.projectId(),
                    summary.reference(),
                    summary.title(),
                    summary.category(),
                    summary.status(),
                    summary.people(),
                    summary.peopleIds()));
        }
        return List.copyOf(result);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void syncDocumentReferences(CurrentUser actor, String workspace, String document, String body) {
        var desired = io.github.goraebap.bit.module.link.domain.DocumentReferences.ids(
                body,
                workspace,
                java.util.Arrays.stream(origins.split(",")).map(String::strip).collect(Collectors.toSet()));
        var existing = repository.around(workspace, TargetType.document, document).stream()
                .filter(l -> l.edge().relation().equals("mentions")
                        && l.edge().fromId().equals(document))
                .toList();
        for (var link : existing)
            if (!desired.contains(link.edge().toId())) {
                link.disconnect(actor.userId(), actor.agent(), clock.instant());
                repository.save(link);
            }
        for (var id : desired)
            if (!id.equals(document)) {
                try {
                    targets.requireAccess(actor, workspace, TargetType.document, id, false);
                } catch (io.github.goraebap.bit.shared.error.BusinessException denied) {
                    continue;
                }
                connect(actor, workspace, edge(TargetType.document, document, "mentions", TargetType.document, id));
            }
    }

    public String resolve(CurrentUser actor, String workspace, TargetType type, String value) {
        String id = type == TargetType.work_item
                ? relationQuery.workItemId(workspace, value.toUpperCase(java.util.Locale.ROOT))
                : value;
        if (id == null) throw LinkErrorCode.LINK_TARGET_NOT_FOUND.raise();
        return targets.requireAccess(actor, workspace, type, id, false).id();
    }

    private void changed(CurrentUser actor, io.github.goraebap.bit.module.link.TargetRef target, String change) {
        if (target.type() != TargetType.document && target.type() != TargetType.work_item) return;
        events.publishEvent(new io.github.goraebap.bit.module.link.TargetChangedEvent(
                target.workspaceId(),
                target.projectId(),
                target.type(),
                target.id(),
                "changed",
                target.version(),
                actor.userId(),
                actor.agent(),
                clock.instant(),
                List.of(new io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange(
                        "relations", null, change))));
    }

    private static Link.Edge edge(TargetType fromType, String fromId, String relation, TargetType toType, String toId) {
        if (fromType == null || fromId == null || toType == null || toId == null)
            throw LinkErrorCode.LINK_RELATION_INVALID.raise();
        try {
            return Link.Edge.of(fromType, fromId, relation, toType, toId);
        } catch (IllegalArgumentException invalid) {
            throw LinkErrorCode.LINK_RELATION_INVALID.raise();
        }
    }

    private static String agent(CurrentUser actor) {
        return actor.agent();
    }
}
