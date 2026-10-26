package io.github.goraebap.bit.module.workspace.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class WorkspaceRulesTest {
    private static final Instant NOW = Instant.parse("2026-10-22T00:00:00Z");

    @Test
    void ownershipTransferValidatesBothSidesBeforeMutation() {
        String workspace = Ids.newId();
        var owner = Membership.create(workspace, Ids.newId(), WorkspaceRole.owner, NOW);
        var foreign = Membership.create(Ids.newId(), Ids.newId(), WorkspaceRole.member, NOW);
        assertThatThrownBy(() -> owner.transferTo(foreign)).isInstanceOf(IllegalArgumentException.class);
        assertThat(owner.role()).isEqualTo(WorkspaceRole.owner);
        assertThat(foreign.role()).isEqualTo(WorkspaceRole.member);
        var target = Membership.create(workspace, Ids.newId(), WorkspaceRole.viewer, NOW);
        owner.transferTo(target);
        assertThat(owner.role()).isEqualTo(WorkspaceRole.admin);
        assertThat(target.role()).isEqualTo(WorkspaceRole.owner);
    }

    @Test
    void invitationExpiresAtTheExactBoundaryAndCannotBeConsumedTwice() {
        var invite =
                Invitation.create(Ids.newId(), " TEST@example.test ", WorkspaceRole.member, "hash", Ids.newId(), NOW);
        assertThat(invite.email()).isEqualTo("test@example.test");
        assertThat(invite.pending(invite.expiresAt().minusNanos(1))).isTrue();
        assertThat(invite.effectiveStatus(invite.expiresAt())).isEqualTo("expired");
        assertThatThrownBy(() -> invite.accept(Ids.newId(), invite.expiresAt()))
                .isInstanceOf(IllegalArgumentException.class);
        invite.accept(Ids.newId(), NOW);
        assertThatThrownBy(() -> invite.revoke(Ids.newId(), NOW)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void identifiersRejectUnsupportedCharactersAndOwnershipCannotBeGrantedByRoleChange() {
        String actor = Ids.newId();
        assertThat(Workspace.create(" Team ", " TEAM-A ", actor, NOW).slug()).isEqualTo("team-a");
        for (String slug : new String[] {"a", "a-", "-a", "a_b", "한글", "a".repeat(65)})
            assertThatThrownBy(() -> Workspace.create("Team", slug, actor, NOW))
                    .isInstanceOf(IllegalArgumentException.class);
        var member = Membership.create(Ids.newId(), actor, WorkspaceRole.member, NOW);
        assertThatThrownBy(() -> member.changeRole(WorkspaceRole.admin, WorkspaceRole.admin))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> member.changeRole(WorkspaceRole.owner, WorkspaceRole.owner))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
