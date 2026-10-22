package io.github.goraebap.bit.module.workspace.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WorkspaceRulesTest {
    private static final Instant NOW = Instant.parse("2026-10-22T00:00:00Z");

    @Test
    void ownershipTransferValidatesBothSidesBeforeMutation() {
        UUID workspace = UUID.randomUUID();
        var owner = Membership.create(workspace, UUID.randomUUID(), WorkspaceRole.owner, NOW);
        var foreign = Membership.create(UUID.randomUUID(), UUID.randomUUID(), WorkspaceRole.member, NOW);
        assertThatThrownBy(() -> owner.transferTo(foreign)).isInstanceOf(IllegalArgumentException.class);
        assertThat(owner.role()).isEqualTo(WorkspaceRole.owner);
        assertThat(foreign.role()).isEqualTo(WorkspaceRole.member);
        var target = Membership.create(workspace, UUID.randomUUID(), WorkspaceRole.viewer, NOW);
        owner.transferTo(target);
        assertThat(owner.role()).isEqualTo(WorkspaceRole.admin);
        assertThat(target.role()).isEqualTo(WorkspaceRole.owner);
    }

    @Test
    void invitationExpiresAtTheExactBoundaryAndCannotBeConsumedTwice() {
        var invite = Invitation.create(
                UUID.randomUUID(), " TEST@example.test ", WorkspaceRole.member, "hash", UUID.randomUUID(), NOW);
        assertThat(invite.email()).isEqualTo("test@example.test");
        assertThat(invite.pending(invite.expiresAt().minusNanos(1))).isTrue();
        assertThat(invite.effectiveStatus(invite.expiresAt())).isEqualTo("expired");
        assertThatThrownBy(() -> invite.accept(UUID.randomUUID(), invite.expiresAt()))
                .isInstanceOf(IllegalArgumentException.class);
        invite.accept(UUID.randomUUID(), NOW);
        assertThatThrownBy(() -> invite.revoke(UUID.randomUUID(), NOW)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void identifiersRejectUnsupportedCharactersAndOwnershipCannotBeGrantedByRoleChange() {
        UUID actor = UUID.randomUUID();
        assertThat(Workspace.create(" Team ", " TEAM-A ", actor, NOW).slug()).isEqualTo("team-a");
        for (String slug : new String[] {"a", "a-", "-a", "a_b", "한글", "a".repeat(65)})
            assertThatThrownBy(() -> Workspace.create("Team", slug, actor, NOW))
                    .isInstanceOf(IllegalArgumentException.class);
        var member = Membership.create(UUID.randomUUID(), actor, WorkspaceRole.member, NOW);
        assertThatThrownBy(() -> member.changeRole(WorkspaceRole.admin, WorkspaceRole.admin))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> member.changeRole(WorkspaceRole.owner, WorkspaceRole.owner))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
