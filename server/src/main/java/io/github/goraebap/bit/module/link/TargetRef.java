package io.github.goraebap.bit.module.link;

import java.util.UUID;

/** Safe display metadata, resolved under current workspace and project access. */
public record TargetRef(
        TargetType type,
        UUID id,
        UUID workspaceId,
        UUID projectId,
        String reference,
        String title,
        long version,
        String state) {}
