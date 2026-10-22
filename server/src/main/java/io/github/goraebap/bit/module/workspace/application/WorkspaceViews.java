package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.module.workspace.domain.WorkspaceRole;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class WorkspaceViews {
    private WorkspaceViews() {}

    @Schema(requiredProperties = {"id", "name", "slug", "myRole", "createdAt"})
    public record Space(UUID id, String name, String slug, WorkspaceRole myRole, Instant createdAt) {}

    @Schema(requiredProperties = {"memberId", "userId", "name", "email", "role", "joinedAt"})
    public record Member(UUID memberId, UUID userId, String name, String email, WorkspaceRole role, Instant joinedAt) {}

    @Schema(
            name = "WorkspaceInvitation",
            requiredProperties = {"id", "email", "role", "status", "expiresAt", "invitedBy", "inviterName", "createdAt"
            })
    public record Invite(
            UUID id,
            String email,
            WorkspaceRole role,
            String status,
            Instant expiresAt,
            UUID invitedBy,
            String inviterName,
            Instant createdAt,

            @Schema(
                    types = {"string", "null"},
                    format = "uuid")
            UUID acceptedBy,

            @Schema(
                    types = {"string", "null"},
                    format = "date-time")
            Instant acceptedAt,

            @Schema(
                    types = {"string", "null"},
                    format = "date-time")
            Instant revokedAt) {}

    @Schema(requiredProperties = {"id", "token", "expiresAt"})
    public record CreatedInvitation(UUID id, String token, Instant expiresAt) {
        @Override
        public String toString() {
            return "CreatedInvitation[redacted]";
        }
    }

    @Schema(requiredProperties = {"workspaceId", "workspaceName", "email", "role", "expiresAt"})
    public record Preview(
            UUID workspaceId, String workspaceName, String email, WorkspaceRole role, Instant expiresAt) {}

    @Schema(requiredProperties = {"items"})
    public record Spaces(
            List<Space> items,
            @Schema(types = {"string", "null"}) String nextCursor) {
        public Spaces {
            items = List.copyOf(items);
        }
    }

    @Schema(requiredProperties = {"items"})
    public record Members(
            List<Member> items,
            @Schema(types = {"string", "null"}) String nextCursor) {
        public Members {
            items = List.copyOf(items);
        }
    }

    @Schema(requiredProperties = {"items"})
    public record Invites(
            List<Invite> items,
            @Schema(types = {"string", "null"}) String nextCursor) {
        public Invites {
            items = List.copyOf(items);
        }
    }

    record Accepted(UUID workspaceId, boolean repeated) {}
}
