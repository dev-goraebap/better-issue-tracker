package io.github.goraebap.bit.module.link.domain;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.domain.Ids;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Objects;

public record Activity(
        String id,
        String workspaceId,
        String projectId,
        TargetType targetType,
        String targetId,
        String type,
        String actorId,
        String actorAgent,
        String payload,
        Instant occurredAt) {
    public static Activity create(
            String workspaceId,
            String projectId,
            TargetType type,
            String targetId,
            String action,
            String actorId,
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
                Ids.newId(),
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
