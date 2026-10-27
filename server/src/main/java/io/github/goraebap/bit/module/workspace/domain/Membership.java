package io.github.goraebap.bit.module.workspace.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;

public final class Membership {
    private final String id;
    private final String workspaceId;
    private final String userId;
    private WorkspaceRole role;
    private final Instant joinedAt;

    private Membership(String id, String workspaceId, String userId, WorkspaceRole role, Instant joinedAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.userId = userId;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    public static Membership create(String workspaceId, String userId, WorkspaceRole role, Instant now) {
        return new Membership(Ids.newId(), workspaceId, userId, role, now);
    }

    public static Membership fromPersistence(
            String id, String workspaceId, String userId, WorkspaceRole role, Instant joinedAt) {
        return new Membership(id, workspaceId, userId, role, joinedAt);
    }

    public void changeRole(WorkspaceRole actorRole, WorkspaceRole next) {
        if (!actorRole.manages(role) || !actorRole.manages(next))
            throw new IllegalArgumentException("Invalid role change");
        role = next;
    }

    public void assignNonOwnerRole(WorkspaceRole next) {
        if (role == WorkspaceRole.owner || next == WorkspaceRole.owner)
            throw new IllegalArgumentException("Ownership requires transfer");
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

    public String id() {
        return id;
    }

    public String workspaceId() {
        return workspaceId;
    }

    public String userId() {
        return userId;
    }

    public WorkspaceRole role() {
        return role;
    }

    public Instant joinedAt() {
        return joinedAt;
    }
}
