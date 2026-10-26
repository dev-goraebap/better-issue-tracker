package io.github.goraebap.bit.module.link;

import java.time.Instant;

/** Comment history deliberately has no body field. */
public record CommentChangedEvent(
        String workspaceId,
        String projectId,
        TargetType targetType,
        String targetId,
        String commentId,
        long version,
        String action,
        String actorId,
        String actorAgent,
        Instant occurredAt) {}
