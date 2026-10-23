package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Set;
import java.util.UUID;

/** Implementations must not depend on a service that itself injects LinkFacade. */
public interface TargetSpi {
    TargetType type();

    TargetRef requireAccess(CurrentUser actor, UUID workspaceId, UUID targetId, boolean writing);

    void requireAllInProject(CurrentUser actor, UUID workspaceId, UUID projectId, Set<UUID> targetIds, boolean writing);
}
