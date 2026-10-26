package io.github.goraebap.bit.module.link.domain;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;
import lombok.Getter;

@Getter
public final class Comment {
    private final String id;
    private final String workspaceId;
    private final TargetType targetType;
    private final String targetId;
    private String body;
    private long version;
    private Audit audit;

    private Comment(
            String id,
            String workspaceId,
            TargetType targetType,
            String targetId,
            String body,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.body = body;
        this.version = version;
        this.audit = audit;
    }

    public static Comment create(
            String workspaceId,
            TargetType type,
            String targetId,
            String body,
            String actor,
            String agent,
            Instant now) {
        if (type == null || type == TargetType.code_ref)
            throw new IllegalArgumentException("Unsupported comment target");
        return new Comment(
                Ids.newId(),
                Objects.requireNonNull(workspaceId),
                type,
                Objects.requireNonNull(targetId),
                body(body),
                0,
                Audit.create(actor, agent, now));
    }

    public static Comment fromPersistence(
            String id, String workspaceId, TargetType type, String targetId, String body, long version, Audit audit) {
        return new Comment(id, workspaceId, type, targetId, body, version, audit);
    }

    public void revise(String body, String actor, String agent, Instant now) {
        if (!audit.createdBy().equals(actor)) throw new IllegalStateException("Only author can revise");
        if (audit.deletedAt() != null) throw new IllegalStateException("Comment is deleted");
        String valid = body(body);
        if (this.body.equals(valid)) return;
        this.body = valid;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void delete(String actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    public void restore(String actor, String agent, Instant now) {
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
