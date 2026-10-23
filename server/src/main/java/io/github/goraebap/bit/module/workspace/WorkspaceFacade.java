package io.github.goraebap.bit.module.workspace;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.UUID;

public interface WorkspaceFacade {
    enum Action {
        READ,
        WRITE_WORK,
        EDIT_SETTINGS,
        MANAGE_MEMBERS,
        OWNER
    }

    void requireAccess(CurrentUser actor, UUID workspaceId, Action action);

    boolean hasMember(CurrentUser actor, UUID workspaceId, UUID userId);

    void requireMemberManagement(CurrentUser actor, UUID workspaceId, UUID memberId);

    void requireInvitationManagement(CurrentUser actor, UUID workspaceId, UUID invitationId);
}
