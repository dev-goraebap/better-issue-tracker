package io.github.goraebap.bit.module.workspace.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface WorkspaceRepository {
    Optional<Workspace> findById(UUID id);

    boolean existsBySlug(String slug);

    void save(Workspace workspace);

    List<WorkspaceRow> findAllByUserId(UUID userId, Instant beforeTime, UUID beforeId, int limit);

    Optional<Membership> findMember(UUID workspaceId, UUID userId);

    Optional<Membership> findMemberById(UUID workspaceId, UUID id);

    List<Membership> findMembers(UUID workspaceId, Instant afterTime, UUID afterId, int limit);

    void saveAll(List<Membership> members);

    void deleteMember(UUID id);

    int countOwners(UUID workspaceId);

    Optional<Invitation> findInvitation(UUID workspaceId, UUID id);

    Optional<Invitation> findInvitationByHash(String hash);

    boolean existsPending(UUID workspaceId, String email);

    void expirePending(UUID workspaceId, String email, Instant now);

    void save(Invitation invitation);

    List<Invitation> findInvitations(
            UUID workspaceId,
            boolean owner,
            Set<String> statuses,
            Instant now,
            Instant beforeTime,
            UUID beforeId,
            int limit);

    void revokePending(UUID workspaceId, UUID issuer, WorkspaceRole retainedRole, UUID actor, Instant now);

    record WorkspaceRow(UUID id, String name, String slug, WorkspaceRole myRole, Instant createdAt) {}
}
