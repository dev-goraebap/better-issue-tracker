package io.github.goraebap.bit.module.notification.application;

import io.github.goraebap.bit.module.file.Picture;
import io.github.goraebap.bit.module.notification.domain.Notification;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class NotificationViews {
    private NotificationViews() {}

    @Schema(
            name = "Notification",
            requiredProperties = {
                "id",
                "type",
                "title",
                "body",
                "projectId",
                "targetType",
                "targetId",
                "actorAgent",
                "actor",
                "readAt",
                "createdAt"
            })
    public record Notice(
            String id,
            Notification.Type type,

            @Schema(description = "The work item it is about: its key and title")
            String title,

            @Schema(description = "What happened, in words") String body,
            @Schema(nullable = true) String projectId,
            String targetType,
            String targetId,
            @Schema(nullable = true) String actorAgent,
            Actor actor,
            @Schema(nullable = true) Instant readAt,
            Instant createdAt) {
        static Notice of(Notification n, Actor actor) {
            return new Notice(
                    n.id(),
                    n.type(),
                    n.title(),
                    n.body(),
                    n.projectId(),
                    n.targetType(),
                    n.targetId(),
                    n.actorAgent(),
                    actor,
                    n.readAt(),
                    n.createdAt());
        }
    }

    @Schema(
            name = "NotificationActor",
            requiredProperties = {"id", "name", "system", "avatar"})
    public record Actor(
            @Schema(nullable = true) String id,
            String name,
            boolean system,
            @Schema(nullable = true) Picture avatar) {}

    @Schema(
            name = "Notifications",
            requiredProperties = {"items", "nextCursor"})
    public record Notices(
            List<Notice> items, @Schema(nullable = true) String nextCursor) {
        public Notices {
            items = List.copyOf(items);
        }
    }

    @Schema(
            name = "NotificationCount",
            requiredProperties = {"unread"})
    public record Count(long unread) {}
}
