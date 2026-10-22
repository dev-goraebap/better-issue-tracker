package io.github.goraebap.bit.module.iam.domain;

import java.time.Instant;
import java.util.UUID;

public record LoginSession(
        UUID id,
        UUID userId,
        String hash,
        Instant expiresAt,
        Instant absoluteExpiresAt,
        Instant lastSeenAt,
        Instant createdAt) {
    public boolean expired(Instant now) {
        return !expiresAt.isAfter(now) || !absoluteExpiresAt.isAfter(now);
    }

    public LoginSession seen(Instant now) {
        Instant next = now.plusSeconds(7 * 86400);
        return new LoginSession(
                id,
                userId,
                hash,
                next.isBefore(absoluteExpiresAt) ? next : absoluteExpiresAt,
                absoluteExpiresAt,
                now,
                createdAt);
    }
}
