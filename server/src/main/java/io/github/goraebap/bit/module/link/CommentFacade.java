package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.UUID;

public interface CommentFacade {
    UUID create(CurrentUser actor, UUID workspaceId, TargetType targetType, UUID targetId, String body);

    void revise(CurrentUser actor, UUID workspaceId, UUID commentId, String body, long expectedVersion);

    void delete(CurrentUser actor, UUID workspaceId, UUID commentId, long expectedVersion);

    void restore(CurrentUser actor, UUID workspaceId, UUID commentId, long expectedVersion);
}
