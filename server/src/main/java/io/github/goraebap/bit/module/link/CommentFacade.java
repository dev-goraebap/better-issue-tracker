package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;

public interface CommentFacade {
    String create(CurrentUser actor, String workspaceId, TargetType targetType, String targetId, String body);

    void revise(CurrentUser actor, String workspaceId, String commentId, String body, long expectedVersion);

    void delete(CurrentUser actor, String workspaceId, String commentId, long expectedVersion);

    void restore(CurrentUser actor, String workspaceId, String commentId, long expectedVersion);
}
