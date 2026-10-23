package io.github.goraebap.bit.module.workitem;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.UUID;

public interface WorkItemFacade {
    void requireAccess(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            UUID workItemId,
            boolean writing,
            boolean includeDeleted);

    Ref findByRef(CurrentUser actor, UUID workspaceId, String reference);

    record Ref(UUID id, UUID projectId, String reference) {}
}
