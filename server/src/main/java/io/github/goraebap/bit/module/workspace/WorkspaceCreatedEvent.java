package io.github.goraebap.bit.module.workspace;

import java.time.Instant;
import java.util.UUID;

/**
 * Published inside the creating transaction. Listeners that seed workspace data run before commit so the workspace
 * and its seeded rows commit or roll back together.
 */
public record WorkspaceCreatedEvent(UUID workspaceId, UUID actorId, String actorAgent, Instant occurredAt) {}
