package io.github.goraebap.bit.shared.domain;

import java.time.Instant;
import java.util.UUID;

/** Immutable provenance shared by persisted aggregates, without request or framework dependencies. */
public record Audit(
        Instant createdAt,
        UUID createdBy,
        String createdByAgent,
        Instant updatedAt,
        UUID updatedBy,
        String updatedByAgent,
        Instant deletedAt,
        UUID deletedBy,
        String deletedByAgent) {
    public static Audit create(UUID actor, String agent, Instant now) {
        return new Audit(now, actor, agent, now, actor, agent, null, null, null);
    }

    public Audit touch(UUID actor, String agent, Instant now) {
        return new Audit(createdAt, createdBy, createdByAgent, now, actor, agent, deletedAt, deletedBy, deletedByAgent);
    }

    public Audit delete(UUID actor, String agent, Instant now) {
        return new Audit(createdAt, createdBy, createdByAgent, now, actor, agent, now, actor, agent);
    }

    public Audit restore(UUID actor, String agent, Instant now) {
        return new Audit(createdAt, createdBy, createdByAgent, now, actor, agent, null, null, null);
    }
}
