package io.github.goraebap.bit.module.view;

import io.github.goraebap.bit.shared.web.CurrentUser;

public interface ViewFacade {
    /**
     * Workspace access for view requests. {@code viewKey} is a view id or "all" (the built-in view, which can only be
     * read). Someone else's personal view does not exist for the caller; editing needs the view's owner, or the
     * workspace's owner or admin for a shared view (D-068).
     */
    void requireAccess(CurrentUser actor, String workspaceId, String viewKey, boolean editing);
}
