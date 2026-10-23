package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Set;
import java.util.UUID;

public interface TargetFacade {
    TargetRef requireAccess(CurrentUser actor, UUID workspaceId, TargetType type, UUID targetId, boolean writing);

    void requireAllInProject(
            CurrentUser actor, UUID workspaceId, UUID projectId, TargetType type, Set<UUID> targetIds, boolean writing);
}
