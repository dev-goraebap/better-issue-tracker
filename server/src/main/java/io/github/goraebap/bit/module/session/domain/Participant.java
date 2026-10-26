package io.github.goraebap.bit.module.session.domain;

public record Participant(String kind, String userId, String displayName) {
    public static Participant of(String kind, String userId, String displayName) {
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
