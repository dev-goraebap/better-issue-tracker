package io.github.goraebap.bit.module.workspace.domain;

import java.time.Instant;
import java.util.UUID;

public final class Membership {
    private final UUID id;
    private final UUID workspaceId;
    private final UUID userId;
    private WorkspaceRole role;
    private final Instant joinedAt;

    private Membership(UUID id, UUID workspaceId, UUID userId, WorkspaceRole role, Instant joinedAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.userId = userId;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    public static Membership create(UUID workspaceId, UUID userId, WorkspaceRole role, Instant now) {
        return new Membership(UUID.randomUUID(), workspaceId, userId, role, now);
    }

    public static Membership fromPersistence(
            UUID id, UUID workspaceId, UUID userId, WorkspaceRole role, Instant joinedAt) {
        return new Membership(id, workspaceId, userId, role, joinedAt);
    }

    public void changeRole(WorkspaceRole actorRole, WorkspaceRole next) {
        if (!actorRole.manages(role) || !actorRole.manages(next))
            throw new IllegalArgumentException("Invalid role change");
        role = next;
    }

    public void transferTo(Membership next) {
        if (role != WorkspaceRole.owner
                || next.role == WorkspaceRole.owner
                || !workspaceId.equals(next.workspaceId)
                || userId.equals(next.userId)) throw new IllegalArgumentException("Invalid ownership transfer");
        role = WorkspaceRole.admin;
        next.role = WorkspaceRole.owner;
    }

    public UUID id() {
        return id;
    }

    public UUID workspaceId() {
        return workspaceId;
    }

    public UUID userId() {
        return userId;
    }

    public WorkspaceRole role() {
        return role;
    }

    public Instant joinedAt() {
        return joinedAt;
    }
}
