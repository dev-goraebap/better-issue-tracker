package io.github.goraebap.bit.module.workspace;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
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

    /** The workspaces the actor belongs to, with their role in each, newest first. */
    List<SpaceRef> mine(CurrentUser actor);

    /**
     * The workspace a hint names, by its id, slug or name (case aside); with no hint, the actor's only workspace. One
     * the actor is not in, or several to choose from, is a COMMON_INVALID_REQUEST naming the actor's workspaces.
     */
    UUID resolve(CurrentUser actor, String hint);

    /** The workspace's members with their names, emails and roles, in the order they joined. */
    List<MemberRef> members(CurrentUser actor, UUID workspaceId);

    record SpaceRef(UUID id, String name, String slug, String role) {}

    record MemberRef(UUID userId, String name, String email, String role) {}
}
