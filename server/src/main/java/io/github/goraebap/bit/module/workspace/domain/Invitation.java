package io.github.goraebap.bit.module.workspace.domain;

import java.time.Instant;
import java.util.UUID;

public final class Invitation {
    private final UUID id;
    private final UUID workspaceId;
    private final String email;
    private final WorkspaceRole role;
    private final String tokenHash;
    private String status;
    private final Instant expiresAt;
    private final UUID invitedBy;
    private final Instant createdAt;
    private UUID acceptedBy;
    private Instant acceptedAt;
    private UUID revokedBy;
    private Instant revokedAt;

    private Invitation(
            UUID id,
            UUID workspaceId,
            String email,
            WorkspaceRole role,
            String tokenHash,
            String status,
            Instant expiresAt,
            UUID invitedBy,
            Instant createdAt,
            UUID acceptedBy,
            Instant acceptedAt,
            UUID revokedBy,
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
            UUID workspaceId, String email, WorkspaceRole role, String hash, UUID actor, Instant now) {
        if (role == WorkspaceRole.owner) throw new IllegalArgumentException("Invalid invitation role");
        return new Invitation(
                UUID.randomUUID(),
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
            UUID id,
            UUID workspaceId,
            String email,
            WorkspaceRole role,
            String hash,
            String status,
            Instant expiresAt,
            UUID actor,
            Instant createdAt,
            UUID acceptedBy,
            Instant acceptedAt,
            UUID revokedBy,
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

    public void accept(UUID userId, Instant now) {
        if (!pending(now)) throw new IllegalArgumentException("Invitation unavailable");
        status = "accepted";
        acceptedBy = userId;
        acceptedAt = now;
    }

    public void revoke(UUID actor, Instant now) {
        if (!pending(now)) throw new IllegalArgumentException("Invitation unavailable");
        status = "revoked";
        revokedBy = actor;
        revokedAt = now;
    }

    public UUID id() {
        return id;
    }

    public UUID workspaceId() {
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

    public UUID invitedBy() {
        return invitedBy;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public UUID acceptedBy() {
        return acceptedBy;
    }

    public Instant acceptedAt() {
        return acceptedAt;
    }

    public UUID revokedBy() {
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
