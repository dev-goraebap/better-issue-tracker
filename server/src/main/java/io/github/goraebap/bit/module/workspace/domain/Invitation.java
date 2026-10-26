package io.github.goraebap.bit.module.workspace.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;

public final class Invitation {
    private final String id;
    private final String workspaceId;
    private final String email;
    private final WorkspaceRole role;
    private final String tokenHash;
    private String status;
    private final Instant expiresAt;
    private final String invitedBy;
    private final Instant createdAt;
    private String acceptedBy;
    private Instant acceptedAt;
    private String revokedBy;
    private Instant revokedAt;

    private Invitation(
            String id,
            String workspaceId,
            String email,
            WorkspaceRole role,
            String tokenHash,
            String status,
            Instant expiresAt,
            String invitedBy,
            Instant createdAt,
            String acceptedBy,
            Instant acceptedAt,
            String revokedBy,
            Instant revokedAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.email = email;
        this.role = role;
        this.tokenHash = tokenHash;
        this.status = status;
        this.expiresAt = expiresAt;
        this.invitedBy = invitedBy;
        this.createdAt = createdAt;
        this.acceptedBy = acceptedBy;
        this.acceptedAt = acceptedAt;
        this.revokedBy = revokedBy;
        this.revokedAt = revokedAt;
    }

    public static Invitation create(
            String workspaceId, String email, WorkspaceRole role, String hash, String actor, Instant now) {
        if (role == WorkspaceRole.owner) throw new IllegalArgumentException("Invalid invitation role");
        return new Invitation(
                Ids.newId(),
                workspaceId,
                email.strip().toLowerCase(java.util.Locale.ROOT),
                role,
                hash,
                "pending",
                now.plusSeconds(7 * 86400),
                actor,
                now,
                null,
                null,
                null,
                null);
    }

    public static Invitation fromPersistence(
            String id,
            String workspaceId,
            String email,
            WorkspaceRole role,
            String hash,
            String status,
            Instant expiresAt,
            String actor,
            Instant createdAt,
            String acceptedBy,
            Instant acceptedAt,
            String revokedBy,
            Instant revokedAt) {
        return new Invitation(
                id,
                workspaceId,
                email,
                role,
                hash,
                status,
                expiresAt,
                actor,
                createdAt,
                acceptedBy,
                acceptedAt,
                revokedBy,
                revokedAt);
    }

    public String effectiveStatus(Instant now) {
        return status.equals("pending") && !expiresAt.isAfter(now) ? "expired" : status;
    }

    public boolean pending(Instant now) {
        return effectiveStatus(now).equals("pending");
    }

    public void accept(String userId, Instant now) {
        if (!pending(now)) throw new IllegalArgumentException("Invitation unavailable");
        status = "accepted";
        acceptedBy = userId;
        acceptedAt = now;
    }

    public void revoke(String actor, Instant now) {
        if (!pending(now)) throw new IllegalArgumentException("Invitation unavailable");
        status = "revoked";
        revokedBy = actor;
        revokedAt = now;
    }

    public String id() {
        return id;
    }

    public String workspaceId() {
        return workspaceId;
    }

    public String email() {
        return email;
    }

    public WorkspaceRole role() {
        return role;
    }

    public String tokenHash() {
        return tokenHash;
    }

    public String status() {
        return status;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public String invitedBy() {
        return invitedBy;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public String acceptedBy() {
        return acceptedBy;
    }

    public Instant acceptedAt() {
        return acceptedAt;
    }

    public String revokedBy() {
        return revokedBy;
    }

    public Instant revokedAt() {
        return revokedAt;
    }

    @Override
    public String toString() {
        return "Invitation[redacted]";
    }
}
