package io.github.goraebap.bit.module.iam.domain;

import java.time.Instant;

public record AgentKey(
        String id,
        String userId,
        String name,
        String agentName,
        String prefix,
        String hash,
        Instant lastUsedAt,
        Instant expiresAt,
        Instant revokedAt,
        Instant createdAt) {
    public boolean usable(Instant now) {
        return revokedAt == null && (expiresAt == null || expiresAt.isAfter(now));
    }
}
