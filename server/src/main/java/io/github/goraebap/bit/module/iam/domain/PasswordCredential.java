package io.github.goraebap.bit.module.iam.domain;

import java.time.Instant;

public record PasswordCredential(
        String userId, String hash, int failures, Instant lockedUntil, boolean mustChange, Instant changedAt) {
    public boolean locked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    public PasswordCredential failed(Instant now) {
        if (locked(now)) return this;
        int count = lockedUntil != null ? 1 : failures + 1;
        return new PasswordCredential(
                userId, hash, count, count >= 5 ? now.plusSeconds(900) : null, mustChange, changedAt);
    }

    public PasswordCredential verified() {
        return new PasswordCredential(userId, hash, 0, null, mustChange, changedAt);
    }
}
