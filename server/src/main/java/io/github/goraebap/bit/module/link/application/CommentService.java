package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.CommentChangedEvent;
import io.github.goraebap.bit.module.link.CommentFacade;
import io.github.goraebap.bit.module.link.TargetFacade;
import io.github.goraebap.bit.module.link.TargetRef;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.Comment;
import io.github.goraebap.bit.module.link.domain.CommentRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService implements CommentFacade {
    private final CommentRepository commentRepository;
    private final TargetFacade targetFacade;
    private final WorkspaceFacade workspaceFacade;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Clock clock;

    @Override
    @Transactional
    public UUID create(CurrentUser actor, UUID workspaceId, TargetType type, UUID id, String body) {
        var target = targetFacade.requireAccess(actor, workspaceId, type, id, true);
        Comment comment;
        try {
            comment = Comment.create(workspaceId, type, id, body, actor.userId(), agent(actor), clock.instant());
        } catch (IllegalArgumentException invalid) {
            throw CommentErrorCode.COMMENT_INVALID_INPUT.raise();
        }
        commentRepository.save(comment);
        changed(actor, target, comment, "comment_created");
        return comment.id();
    }

    @Override
    @Transactional
    public void revise(CurrentUser actor, UUID workspaceId, UUID id, String body, long expectedVersion) {
        var comment = access(actor, workspaceId, id);
        var target = targetFacade.requireAccess(actor, workspaceId, comment.targetType(), comment.targetId(), true);
        if (!comment.audit().createdBy().equals(actor.userId())) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        if (comment.audit().deletedAt() != null) throw CommentErrorCode.COMMENT_NOT_FOUND.raise();
        version(comment, expectedVersion);
        long before = comment.version();
        try {
            comment.revise(body, actor.userId(), agent(actor), clock.instant());
        } catch (IllegalArgumentException invalid) {
            throw CommentErrorCode.COMMENT_INVALID_INPUT.raise();
        }
        if (comment.version() == before) return;
        commentRepository.save(comment);
        changed(actor, target, comment, "comment_changed");
    }

    @Override
    @Transactional
    public void delete(CurrentUser actor, UUID workspaceId, UUID id, long expectedVersion) {
        var comment = access(actor, workspaceId, id);
        var target = targetFacade.requireAccess(actor, workspaceId, comment.targetType(), comment.targetId(), true);
        removal(actor, comment);
        version(comment, expectedVersion);
        if (comment.audit().deletedAt() != null) return;
        comment.delete(actor.userId(), agent(actor), clock.instant());
        commentRepository.save(comment);
        changed(actor, target, comment, "comment_deleted");
    }

    @Override
    @Transactional
    public void restore(CurrentUser actor, UUID workspaceId, UUID id, long expectedVersion) {
        var comment = access(actor, workspaceId, id);
        var target = targetFacade.requireAccess(actor, workspaceId, comment.targetType(), comment.targetId(), true);
        removal(actor, comment);
        version(comment, expectedVersion);
        if (comment.audit().deletedAt() == null) return;
        comment.restore(actor.userId(), agent(actor), clock.instant());
        commentRepository.save(comment);
        changed(actor, target, comment, "comment_restored");
    }

    private Comment access(CurrentUser actor, UUID workspaceId, UUID id) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        return commentRepository.findById(workspaceId, id).orElseThrow(CommentErrorCode.COMMENT_NOT_FOUND::raise);
    }

    private void removal(CurrentUser actor, Comment comment) {
        if (!comment.audit().createdBy().equals(actor.userId()))
            workspaceFacade.requireAccess(actor, comment.workspaceId(), WorkspaceFacade.Action.EDIT_SETTINGS);
    }

    private void changed(CurrentUser actor, TargetRef target, Comment comment, String action) {
        applicationEventPublisher.publishEvent(new CommentChangedEvent(
                comment.workspaceId(),
                target.projectId(),
                comment.targetType(),
                comment.targetId(),
                comment.id(),
                comment.version(),
                action,
                actor.userId(),
                agent(actor),
                comment.audit().updatedAt()));
    }

    private static void version(Comment comment, long expected) {
        if (comment.version() != expected) throw CommentErrorCode.COMMENT_VERSION_CONFLICT.raise();
    }

    private static String agent(CurrentUser actor) {
        return actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null;
    }
}
