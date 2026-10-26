package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Set;

/** Implementations must not depend on a service that itself injects LinkFacade. */
public interface TargetSpi {
    TargetType type();

    TargetRef requireAccess(CurrentUser actor, String workspaceId, String targetId, boolean writing);

    void requireAllInProject(
            CurrentUser actor, String workspaceId, String projectId, Set<String> targetIds, boolean writing);
}
