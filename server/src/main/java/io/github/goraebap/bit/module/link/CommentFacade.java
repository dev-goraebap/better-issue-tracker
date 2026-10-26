package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;

public interface CommentFacade {
    String create(CurrentUser actor, String workspaceId, TargetType targetType, String targetId, String body);

    void revise(CurrentUser actor, String workspaceId, String commentId, String body, long expectedVersion);

    void delete(CurrentUser actor, String workspaceId, String commentId, long expectedVersion);

    void restore(CurrentUser actor, String workspaceId, String commentId, long expectedVersion);

    /** A live comment's Markdown, for a module that copies it elsewhere (a repository's issue, D-087). */
    java.util.Optional<String> body(CurrentUser actor, String workspaceId, String commentId);
}
