package io.github.goraebap.bit.module.notification.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Notification.NOTIFICATION;

import io.github.goraebap.bit.jooq.tables.records.NotificationRecord;
import io.github.goraebap.bit.module.notification.domain.Notification;
import io.github.goraebap.bit.module.notification.domain.NotificationRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqNotificationRepository implements NotificationRepository {
    private final DSLContext dslContext;

    @Override
    public void saveAll(List<Notification> notifications) {
        for (var n : notifications) {
            var r = dslContext.newRecord(NOTIFICATION);
            r.setNotificationId(n.id());
            r.setWorkspaceId(n.workspaceId());
            r.setProjectId(n.projectId());
            r.setRecipientId(n.recipientId());
            r.setType(n.type().name());
            r.setTargetType(n.targetType());
            r.setTargetId(n.targetId());
            r.setActorId(n.actorId());
            r.setActorAgent(n.actorAgent());
            r.setTitle(n.title());
            r.setBody(n.body());
            r.setDedupeKey(n.dedupeKey());
            r.setReadAt(n.readAt());
            r.setMailedAt(n.mailedAt());
            r.setCreatedAt(n.createdAt());
            // A job's notice that a member already has (the same dedupe key) is skipped.
            dslContext.insertInto(NOTIFICATION).set(r).onConflictDoNothing().execute();
        }
    }

    @Override
    public Optional<Notification> findById(String recipientId, String id) {
        return dslContext
                .selectFrom(NOTIFICATION)
                .where(NOTIFICATION.NOTIFICATION_ID.eq(id))
                .and(NOTIFICATION.RECIPIENT_ID.eq(recipientId))
                .fetchOptional(JooqNotificationRepository::notification);
    }

    @Override
    public List<Notification> findPage(
            String recipientId, String workspaceId, boolean unreadOnly, Point after, int limit) {
        var where = NOTIFICATION.RECIPIENT_ID.eq(recipientId).and(NOTIFICATION.WORKSPACE_ID.eq(workspaceId));
        if (unreadOnly) where = where.and(NOTIFICATION.READ_AT.isNull());
        if (after != null)
            where = where.and(NOTIFICATION
                    .CREATED_AT
                    .lt(after.createdAt())
                    .or(NOTIFICATION
                            .CREATED_AT
                            .eq(after.createdAt())
                            .and(NOTIFICATION.NOTIFICATION_ID.lt(after.id()))));
        return dslContext
                .selectFrom(NOTIFICATION)
                .where(where)
                .orderBy(NOTIFICATION.CREATED_AT.desc(), NOTIFICATION.NOTIFICATION_ID.desc())
                .limit(limit)
                .fetch(JooqNotificationRepository::notification);
    }

    @Override
    public long countUnread(String recipientId, String workspaceId) {
        return dslContext.fetchCount(
                NOTIFICATION,
                NOTIFICATION
                        .RECIPIENT_ID
                        .eq(recipientId)
                        .and(NOTIFICATION.WORKSPACE_ID.eq(workspaceId))
                        .and(NOTIFICATION.READ_AT.isNull()));
    }

    @Override
    public void markRead(String recipientId, String workspaceId, String id, Instant at) {
        dslContext
                .update(NOTIFICATION)
                .set(NOTIFICATION.READ_AT, at)
                .where(NOTIFICATION.NOTIFICATION_ID.eq(id))
                .and(NOTIFICATION.RECIPIENT_ID.eq(recipientId))
                .and(NOTIFICATION.WORKSPACE_ID.eq(workspaceId))
                .and(NOTIFICATION.READ_AT.isNull())
                .execute();
    }

    @Override
    public void markAllRead(String recipientId, String workspaceId, Instant at) {
        dslContext
                .update(NOTIFICATION)
                .set(NOTIFICATION.READ_AT, at)
                .where(NOTIFICATION.RECIPIENT_ID.eq(recipientId))
                .and(NOTIFICATION.WORKSPACE_ID.eq(workspaceId))
                .and(NOTIFICATION.READ_AT.isNull())
                .execute();
    }

    @Override
    public List<Notification> findUnmailed(Instant since, int limit) {
        return dslContext
                .selectFrom(NOTIFICATION)
                .where(NOTIFICATION.MAILED_AT.isNull())
                .and(NOTIFICATION.CREATED_AT.gt(since))
                .orderBy(NOTIFICATION.CREATED_AT, NOTIFICATION.NOTIFICATION_ID)
                .limit(limit)
                .fetch(JooqNotificationRepository::notification);
    }

    @Override
    public void markMailed(String id, Instant at) {
        dslContext
                .update(NOTIFICATION)
                .set(NOTIFICATION.MAILED_AT, at)
                .where(NOTIFICATION.NOTIFICATION_ID.eq(id))
                .execute();
    }

    private static Notification notification(NotificationRecord r) {
        return new Notification(
                r.getNotificationId(),
                r.getWorkspaceId(),
                r.getProjectId(),
                r.getRecipientId(),
                Notification.Type.valueOf(r.getType()),
                r.getTargetType(),
                r.getTargetId(),
                r.getActorId(),
                r.getActorAgent(),
                r.getTitle(),
                r.getBody(),
                r.getDedupeKey(),
                r.getReadAt(),
                r.getMailedAt(),
                r.getCreatedAt());
    }
}
