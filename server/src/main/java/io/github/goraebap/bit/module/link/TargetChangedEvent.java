package io.github.goraebap.bit.module.link;

import java.time.Instant;
import java.util.List;

/** Safe business facts only: never pass request bodies, credentials or headers here. */
public record TargetChangedEvent(
        String workspaceId,
        String projectId,
        TargetType targetType,
        String targetId,
        String action,
        long version,
        String actorId,
        String actorAgent,
        Instant occurredAt,
        List<FieldChange> changes) {
    public TargetChangedEvent {
        changes = List.copyOf(changes);
    }

    public record FieldChange(String field, String before, String after) {}
}
