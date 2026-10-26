package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Set;

public interface TargetFacade {
    TargetRef requireAccess(CurrentUser actor, String workspaceId, TargetType type, String targetId, boolean writing);

    void requireAllInProject(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            TargetType type,
            Set<String> targetIds,
            boolean writing);
}
