package io.github.goraebap.bit.module.workspace.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface WorkspaceRepository {
    Optional<Workspace> findById(String id);

    boolean existsBySlug(String slug);

    void save(Workspace workspace);

    List<WorkspaceRow> findAllByUserId(String userId, Instant beforeTime, String beforeId, int limit);

    Optional<Membership> findMember(String workspaceId, String userId);

    Set<String> findMemberUserIds(String workspaceId, Set<String> userIds);

    Optional<Membership> findMemberById(String workspaceId, String id);

    List<Membership> findMembers(String workspaceId, Instant afterTime, String afterId, int limit);

    void saveAll(List<Membership> members);

    void deleteMember(String id);

    int countOwners(String workspaceId);

    Optional<Invitation> findInvitation(String workspaceId, String id);

    Optional<Invitation> findInvitationByHash(String hash);

    boolean existsPending(String workspaceId, String email);

    void expirePending(String workspaceId, String email, Instant now);

    void save(Invitation invitation);

    List<Invitation> findInvitations(
            String workspaceId,
            boolean owner,
            Set<String> statuses,
            Instant now,
            Instant beforeTime,
            String beforeId,
            int limit);

    void revokePending(String workspaceId, String workItemr, WorkspaceRole retainedRole, String actor, Instant now);

    record CustomRole(String id, String workspaceId, String name, Set<String> permissions, long version) {
        public CustomRole {
            permissions = Set.copyOf(permissions);
        }
    }

    List<CustomRole> customRoles(String workspaceId);

    Optional<CustomRole> customRole(String workspaceId, String roleId);

    Optional<CustomRole> memberCustomRole(String memberId);

    void saveCustomRole(CustomRole role);

    void assignCustomRole(String memberId, String roleId);

    int customRoleHolders(String roleId);

    void deleteCustomRole(String roleId);

    record WorkspaceRow(String id, String name, String slug, WorkspaceRole myRole, Instant createdAt) {}
}
