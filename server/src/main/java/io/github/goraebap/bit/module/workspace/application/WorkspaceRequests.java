package io.github.goraebap.bit.module.workspace.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.github.goraebap.bit.module.workspace.domain.WorkspaceRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public final class WorkspaceRequests {
    private WorkspaceRequests() {}

    public record Create(
            @NotBlank @Size(max = 64) String name,
            @NotBlank @Size(max = 64) String slug) {}

    public static final class Rename {
        private String name;
        private boolean present;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
            this.present = true;
        }

        public boolean hasName() {
            return present;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported workspace field");
        }
    }

    public record ChangeRole(@NotNull WorkspaceRole role) {}

    public record Invite(
            @NotBlank @Email @Size(max = 256) String email,
            @NotNull WorkspaceRole role) {
        public Invite {
            if (email != null) email = email.strip().toLowerCase(java.util.Locale.ROOT);
        }
    }

    public record Token(@NotBlank @Size(max = 128) String token) {
        @Override
        public String toString() {
            return "Token[redacted]";
        }
    }

    public record Registration(
            @NotBlank @Size(max = 128) String token,
            @NotBlank @Size(max = 64) String name,
            @NotNull @Size(min = 1, max = 128) String password) {
        @Override
        public String toString() {
            return "Registration[redacted]";
        }
    }

    public record Transfer(
            @NotNull UUID userId,
            @NotNull @Size(min = 1, max = 128) String currentPassword) {
        @Override
        public String toString() {
            return "Transfer[redacted]";
        }
    }

    public record Selection(@NotNull UUID workspaceId) {}
}
