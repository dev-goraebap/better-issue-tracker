package io.github.goraebap.bit.module.session.domain;

import java.util.UUID;

public record Participant(String kind, UUID userId, String displayName) {
    public static Participant of(String kind, UUID userId, String displayName) {
        if (!("user".equals(kind) || "agent".equals(kind) || "guest".equals(kind))
                || "user".equals(kind) != (userId != null)
                || displayName == null
                || displayName.isBlank()
                || displayName.strip().length() > 64) {
            throw new IllegalArgumentException("Invalid session participant");
        }
        return new Participant(kind, userId, displayName.strip());
    }
}
