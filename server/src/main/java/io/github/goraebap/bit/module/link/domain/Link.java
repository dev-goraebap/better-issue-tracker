package io.github.goraebap.bit.module.link.domain;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;
import lombok.Getter;

@Getter
public final class Link {
    public record Edge(TargetType fromType, String fromId, String relation, TargetType toType, String toId) {
        public static Edge of(TargetType fromType, String fromId, String relation, TargetType toType, String toId) {
            Objects.requireNonNull(fromType);
            Objects.requireNonNull(toType);
            Objects.requireNonNull(fromId);
            Objects.requireNonNull(toId);
            if (fromType == toType && fromId.equals(toId))
                throw new IllegalArgumentException("Cannot link a target to itself");
            boolean workPair = fromType == TargetType.work_item && toType == TargetType.work_item;
            boolean sessionWork = fromType == TargetType.session_record && toType == TargetType.work_item
                    || fromType == TargetType.work_item && toType == TargetType.session_record;
            boolean valid =
                    switch (relation == null ? "" : relation) {
                        case "derives_from" ->
                            fromType == TargetType.decision && toType == TargetType.session_record
                                    || fromType == TargetType.work_item && toType == TargetType.decision;
                        case "implements" -> fromType == TargetType.code_ref && toType == TargetType.work_item;
                        case "revises", "based_on" ->
                            (fromType == TargetType.work_item || fromType == TargetType.decision)
                                    && toType == TargetType.artifact;
                        case "supersedes" -> fromType == TargetType.decision && toType == TargetType.decision;
                        case "blocks", "subtask_of" -> workPair;
                        case "references", "mentions" ->
                            fromType == TargetType.document && toType == TargetType.document;
                        case "relates_to" ->
                            workPair
                                    || sessionWork
                                    || fromType == TargetType.document && toType == TargetType.work_item
                                    || fromType == TargetType.work_item && toType == TargetType.document;
                        default -> false;
                    };
            if (!valid) throw new IllegalArgumentException("Invalid relation for these targets");
            if ("relates_to".equals(relation)
                    && (fromType.name() + ":" + fromId).compareTo(toType.name() + ":" + toId) > 0) {
                return new Edge(toType, toId, relation, fromType, fromId);
            }
            return new Edge(fromType, fromId, relation, toType, toId);
        }

        public boolean acyclic() {
            return "blocks".equals(relation) || "subtask_of".equals(relation) || "supersedes".equals(relation);
        }
    }

    private final String id;
    private final String workspaceId;
    private final Edge edge;
    private final Instant createdAt;
    private final String createdBy;
    private final String createdByAgent;
    private Instant deletedAt;
    private String deletedBy;
    private String deletedByAgent;

    private Link(
            String id,
            String workspaceId,
            Edge edge,
            Instant createdAt,
            String createdBy,
            String createdByAgent,
            Instant deletedAt,
            String deletedBy,
            String deletedByAgent) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.edge = edge;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.createdByAgent = createdByAgent;
        this.deletedAt = deletedAt;
        this.deletedBy = deletedBy;
        this.deletedByAgent = deletedByAgent;
    }

    public static Link create(String workspaceId, Edge edge, String actor, String agent, Instant now) {
        var valid = Edge.of(edge.fromType(), edge.fromId(), edge.relation(), edge.toType(), edge.toId());
        return new Link(Ids.newId(), Objects.requireNonNull(workspaceId), valid, now, actor, agent, null, null, null);
    }

    public static Link fromPersistence(
            String id,
            String workspaceId,
            Edge edge,
            Instant createdAt,
            String createdBy,
            String createdByAgent,
            Instant deletedAt,
            String deletedBy,
            String deletedByAgent) {
        return new Link(
                id, workspaceId, edge, createdAt, createdBy, createdByAgent, deletedAt, deletedBy, deletedByAgent);
    }

    public void disconnect(String actor, String agent, Instant now) {
        if (deletedAt != null) return;
        deletedAt = now;
        deletedBy = actor;
        deletedByAgent = agent;
    }
}
