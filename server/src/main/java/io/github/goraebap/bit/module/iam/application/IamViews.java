package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.module.file.Picture;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class IamViews {
    private IamViews() {}

    @Schema(requiredProperties = {"canBootstrap"})
    public record BootstrapStatus(boolean canBootstrap) {}

    @Schema(requiredProperties = {"id", "email", "name", "instanceAdmin", "mustChangePassword", "authenticationMethod"})
    public record Me(
            String id,
            String email,
            String name,
            boolean instanceAdmin,
            boolean mustChangePassword,
            CurrentUser.Method authenticationMethod,
            @Schema(types = {"string", "null"}) String agentName,

            @Schema(description = "내 사진(BIT-30). 없으면 그림 아바타")
            Picture avatar) {}

    @Schema(requiredProperties = {"user", "expiresAt", "absoluteExpiresAt", "mustChangePassword"})
    public record Session(
            Me user,
            Instant expiresAt,
            Instant absoluteExpiresAt,
            boolean mustChangePassword,

            @Schema(types = {"string", "null"}) String activeWorkspaceId) {}

    @Schema(requiredProperties = {"id", "name", "prefix", "createdAt"})
    public record Key(
            String id,
            String name,
            @Schema(types = {"string", "null"}) String agentName,
            String prefix,
            Instant createdAt,

            @Schema(
                    types = {"string", "null"},
                    format = "date-time")
            Instant lastUsedAt,

            @Schema(
                    types = {"string", "null"},
                    format = "date-time")
            Instant expiresAt,

            @Schema(
                    types = {"string", "null"},
                    format = "date-time")
            Instant revokedAt) {}

    @Schema(requiredProperties = {"items"})
    public record Keys(
            List<Key> items,
            @Schema(types = {"string", "null"}) String nextCursor) {
        public Keys {
            items = List.copyOf(items);
        }
    }

    @Schema(requiredProperties = {"id", "key", "prefix"})
    public record CreatedKey(
            String id,
            String key,
            String prefix,

            @Schema(
                    types = {"string", "null"},
                    format = "date-time")
            Instant expiresAt) {
        @Override
        public String toString() {
            return "CreatedKey[redacted]";
        }
    }

    @Schema(requiredProperties = {"temporaryPassword"})
    public record TemporaryPassword(String temporaryPassword) {
        @Override
        public String toString() {
            return "TemporaryPassword[redacted]";
        }
    }

    @Schema(requiredProperties = {"token", "headerName"})
    public record Csrf(String token, String headerName) {}
}
