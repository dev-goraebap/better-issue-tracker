package io.github.goraebap.bit.module.link.domain;

import io.github.goraebap.bit.module.link.TargetType;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record Activity(
        UUID id,
        UUID workspaceId,
        UUID projectId,
        TargetType targetType,
        UUID targetId,
        String type,
        UUID actorId,
        String actorAgent,
        String payload,
        Instant occurredAt) {
    public static Activity create(
            UUID workspaceId,
            UUID projectId,
            TargetType type,
            UUID targetId,
            String action,
            UUID actorId,
            String actorAgent,
            String payload,
            Instant now) {
        if (action == null
                || action.isBlank()
                || action.length() > 32
                || payload == null
                || payload.getBytes(StandardCharsets.UTF_8).length > 131072)
            throw new IllegalArgumentException("Invalid activity");
        return new Activity(
                UUID.randomUUID(),
                Objects.requireNonNull(workspaceId),
                projectId,
                Objects.requireNonNull(type),
                Objects.requireNonNull(targetId),
                action,
                actorId,
                actorAgent,
                payload,
                Objects.requireNonNull(now));
    }
}
