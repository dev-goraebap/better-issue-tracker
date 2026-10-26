package io.github.goraebap.bit.module.link;

/** Safe display metadata, resolved under current workspace and project access. */
public record TargetRef(
        TargetType type,
        String id,
        String workspaceId,
        String projectId,
        String reference,
        String title,
        long version,
        String state) {}
