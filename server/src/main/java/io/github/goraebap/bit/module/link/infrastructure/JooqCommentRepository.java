package io.github.goraebap.bit.module.link.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Comment.COMMENT;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.Comment;
import io.github.goraebap.bit.module.link.domain.CommentRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqCommentRepository implements CommentRepository {
    private final DSLContext dslContext;

    @Override
    public Optional<Comment> findById(UUID workspaceId, UUID id) {
        return dslContext
                .selectFrom(COMMENT)
                .where(COMMENT.WORKSPACE_ID.eq(workspaceId))
                .and(COMMENT.COMMENT_ID.eq(id))
                .fetchOptional(r -> Comment.fromPersistence(
                        r.getCommentId(),
                        r.getWorkspaceId(),
                        TargetType.valueOf(r.getTargetType()),
                        r.getTargetId(),
                        r.getBody(),
                        r.getVersion(),
                        AuditRecords.read(r)));
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
