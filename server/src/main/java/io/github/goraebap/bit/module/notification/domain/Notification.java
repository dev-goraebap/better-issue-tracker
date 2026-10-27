package io.github.goraebap.bit.module.notification.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;

/**
 * A notice to one member (BIT-39): what happened to a work item of theirs, said in words when it is made, so the inbox
 * and the mail read the same. dedupeKey keeps a job's notice to one per member however often the job runs.
 */
public record Notification(
        String id,
        String workspaceId,
        String projectId,
        String recipientId,
        Type type,
        String targetType,
        String targetId,
        String actorId,
        String actorAgent,
        String title,
        String body,
        String dedupeKey,
        Instant readAt,
        Instant mailedAt,
        Instant createdAt) {
    public enum Type {
        assigned,
        invited,
        commented,
        rescheduled,
        due_today,
        event_reminder
    }

    public Notification {
        Objects.requireNonNull(recipientId, "recipientId");
        Objects.requireNonNull(type, "type");
        title = cut(title, 300);
        body = cut(body, 500);
    }

    public static Notification create(
            String workspaceId,
            String projectId,
            String recipientId,
            Type type,
            String targetId,
            String actorId,
            String actorAgent,
            String title,
            String body,
            String dedupeKey,
            Instant now) {
        return new Notification(
                Ids.newId(),
                workspaceId,
                projectId,
                recipientId,
                type,
                "work_item",
                targetId,
                actorId,
                actorAgent,
                title,
                body,
                dedupeKey,
                null,
                null,
                now);
    }

    private static String cut(String text, int length) {
        String value = Objects.requireNonNull(text, "text").strip();
        return value.length() > length ? value.substring(0, length - 1) + "…" : value;
    }
}
