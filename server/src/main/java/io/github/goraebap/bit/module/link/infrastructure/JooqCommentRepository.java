package io.github.goraebap.bit.module.link.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Comment.COMMENT;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.Comment;
import io.github.goraebap.bit.module.link.domain.CommentRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqCommentRepository implements CommentRepository {
    private final DSLContext dslContext;

    @Override
    public Optional<Comment> findById(String workspaceId, String id) {
        return dslContext
                .selectFrom(COMMENT)
                .where(COMMENT.WORKSPACE_ID.eq(workspaceId))
                .and(COMMENT.COMMENT_ID.eq(id))
                .fetchOptional(JooqCommentRepository::comment);
    }

    @Override
    public List<Comment> findAllByTarget(
            String workspaceId, TargetType type, String targetId, Instant afterTime, String afterId, int limit) {
        return dslContext
                .selectFrom(COMMENT)
                .where(COMMENT.WORKSPACE_ID.eq(workspaceId))
                .and(COMMENT.TARGET_TYPE.eq(type.name()))
                .and(COMMENT.TARGET_ID.eq(targetId))
                .and(COMMENT.DELETED_AT.isNull())
                .and(
                        afterTime == null
                                ? DSL.noCondition()
                                : COMMENT.CREATED_AT
                                        .gt(afterTime)
                                        .or(COMMENT.CREATED_AT.eq(afterTime).and(COMMENT.COMMENT_ID.gt(afterId))))
                .orderBy(COMMENT.CREATED_AT, COMMENT.COMMENT_ID)
                .limit(limit)
                .fetch(JooqCommentRepository::comment);
    }

    private static Comment comment(io.github.goraebap.bit.jooq.tables.records.CommentRecord r) {
        return Comment.fromPersistence(
                r.getCommentId(),
                r.getWorkspaceId(),
                TargetType.valueOf(r.getTargetType()),
                r.getTargetId(),
                r.getBody(),
                r.getVersion(),
                AuditRecords.read(r));
    }

    @Override
    public void save(Comment comment) {
        var r = dslContext.newRecord(COMMENT);
        r.setCommentId(comment.id());
        r.setWorkspaceId(comment.workspaceId());
        r.setTargetType(comment.targetType().name());
        r.setTargetId(comment.targetId());
        r.setBody(comment.body());
        r.setVersion(comment.version());
        AuditRecords.write(r, comment.audit());
        dslContext
                .insertInto(COMMENT)
                .set(r)
                .onConflict(COMMENT.COMMENT_ID)
                .doUpdate()
                .set(r)
                .execute();
    }
}
