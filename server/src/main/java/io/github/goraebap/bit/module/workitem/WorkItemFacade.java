package io.github.goraebap.bit.module.workitem;

import io.github.goraebap.bit.shared.web.CurrentUser;

public interface WorkItemFacade {
    void requireAccess(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String workItemId,
            boolean writing,
            boolean includeDeleted);

    Ref findByRef(CurrentUser actor, String workspaceId, String reference);

    record Ref(String id, String projectId, String reference) {}
}
