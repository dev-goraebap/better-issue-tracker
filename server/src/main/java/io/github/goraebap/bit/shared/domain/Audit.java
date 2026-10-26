package io.github.goraebap.bit.shared.domain;

import java.time.Instant;

/** Immutable provenance shared by persisted aggregates, without request or framework dependencies. */
public record Audit(
        Instant createdAt,
        String createdBy,
        String createdByAgent,
        Instant updatedAt,
        String updatedBy,
        String updatedByAgent,
        Instant deletedAt,
        String deletedBy,
        String deletedByAgent) {
    public static Audit create(String actor, String agent, Instant now) {
        return new Audit(now, actor, agent, now, actor, agent, null, null, null);
    }

    public Audit touch(String actor, String agent, Instant now) {
        return new Audit(createdAt, createdBy, createdByAgent, now, actor, agent, deletedAt, deletedBy, deletedByAgent);
    }

    public Audit delete(String actor, String agent, Instant now) {
        return new Audit(createdAt, createdBy, createdByAgent, now, actor, agent, now, actor, agent);
    }

    public Audit restore(String actor, String agent, Instant now) {
        return new Audit(createdAt, createdBy, createdByAgent, now, actor, agent, null, null, null);
    }
}
