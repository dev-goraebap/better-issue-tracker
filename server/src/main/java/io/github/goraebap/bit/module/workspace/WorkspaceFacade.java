package io.github.goraebap.bit.module.workspace;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Map;
import java.util.Set;
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

    /** Whether a member may take the action; a non-member still gets WORKSPACE_NOT_FOUND. */
    boolean allows(CurrentUser actor, UUID workspaceId, Action action);

    boolean hasMember(CurrentUser actor, UUID workspaceId, UUID userId);

    Map<UUID, String> memberNames(CurrentUser actor, UUID workspaceId, Set<UUID> userIds);

    void requireMemberManagement(CurrentUser actor, UUID workspaceId, UUID memberId);

    void requireInvitationManagement(CurrentUser actor, UUID workspaceId, UUID invitationId);
}
