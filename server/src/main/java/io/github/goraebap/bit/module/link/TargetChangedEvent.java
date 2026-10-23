package io.github.goraebap.bit.module.link;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Safe business facts only: never pass request bodies, credentials or headers here. */
public record TargetChangedEvent(
        UUID workspaceId,
        UUID projectId,
        TargetType targetType,
        UUID targetId,
        String action,
        long version,
        UUID actorId,
        String actorAgent,
        Instant occurredAt,
        List<FieldChange> changes) {
    public TargetChangedEvent {
        changes = List.copyOf(changes);
    }

    public record FieldChange(String field, String before, String after) {}
}
