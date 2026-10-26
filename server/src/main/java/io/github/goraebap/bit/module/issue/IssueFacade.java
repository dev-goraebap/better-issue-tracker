package io.github.goraebap.bit.module.issue;

import io.github.goraebap.bit.shared.web.CurrentUser;

public interface IssueFacade {
    void requireAccess(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String issueId,
            boolean writing,
            boolean includeDeleted);

    Ref findByRef(CurrentUser actor, String workspaceId, String reference);

    record Ref(String id, String projectId, String reference) {}
}
