package io.github.goraebap.bit.module.link.domain;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;

@Getter
public final class Comment {
    private final UUID id;
    private final UUID workspaceId;
    private final TargetType targetType;
    private final UUID targetId;
    private String body;
    private long version;
    private Audit audit;

    private Comment(
            UUID id, UUID workspaceId, TargetType targetType, UUID targetId, String body, long version, Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.body = body;
        this.version = version;
        this.audit = audit;
    }

    public static Comment create(
            UUID workspaceId, TargetType type, UUID targetId, String body, UUID actor, String agent, Instant now) {
        if (type == null || type == TargetType.code_ref)
            throw new IllegalArgumentException("Unsupported comment target");
        return new Comment(
                UUID.randomUUID(),
                Objects.requireNonNull(workspaceId),
                type,
                Objects.requireNonNull(targetId),
                body(body),
                0,
                Audit.create(actor, agent, now));
    }

    public static Comment fromPersistence(
            UUID id, UUID workspaceId, TargetType type, UUID targetId, String body, long version, Audit audit) {
        return new Comment(id, workspaceId, type, targetId, body, version, audit);
    }

    public void revise(String body, UUID actor, String agent, Instant now) {
        if (!audit.createdBy().equals(actor)) throw new IllegalStateException("Only author can revise");
        if (audit.deletedAt() != null) throw new IllegalStateException("Comment is deleted");
        String valid = body(body);
        if (this.body.equals(valid)) return;
        this.body = valid;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void delete(UUID actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    public void restore(UUID actor, String agent, Instant now) {
        if (audit.deletedAt() == null) return;
        audit = audit.restore(actor, agent, now);
        version++;
    }

    private static String body(String body) {
        if (body == null || body.isBlank() || body.strip().length() > 20000)
            throw new IllegalArgumentException("Invalid comment body");
        return body.strip();
    }
}
