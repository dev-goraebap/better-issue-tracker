package io.github.goraebap.bit.module.notification.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository {
    /** Saves new notices; one whose recipient already has its dedupe key is left out. */
    void saveAll(List<Notification> notifications);

    Optional<Notification> findById(String recipientId, String id);

    /** A member's notices in a workspace, newest first, after a cursor (the last one read) when given. */
    List<Notification> findPage(String recipientId, String workspaceId, boolean unreadOnly, Point after, int limit);

    long countUnread(String recipientId, String workspaceId);

    void markRead(String recipientId, String workspaceId, String id, Instant at);

    void markAllRead(String recipientId, String workspaceId, Instant at);

    /** Notices not yet mailed that were made after a moment, oldest first. */
    List<Notification> findUnmailed(Instant since, int limit);

    void markMailed(String id, Instant at);

    record Point(Instant createdAt, String id) {}
}
