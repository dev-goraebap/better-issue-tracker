package io.github.goraebap.bit.module.link;

import java.time.Instant;
import java.util.UUID;

/** Comment history deliberately has no body field. */
public record CommentChangedEvent(
        UUID workspaceId,
        UUID projectId,
        TargetType targetType,
        UUID targetId,
        UUID commentId,
        long version,
        String action,
        UUID actorId,
        String actorAgent,
        Instant occurredAt) {}
