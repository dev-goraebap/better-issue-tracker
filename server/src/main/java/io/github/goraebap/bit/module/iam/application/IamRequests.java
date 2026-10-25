package io.github.goraebap.bit.module.iam.application;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class IamRequests {
    private IamRequests() {}

    public record Bootstrap(
            @NotBlank @Size(max = 64) String name,
            @NotBlank @Email @Size(max = 256) String email,
            @NotNull @Size(min = 1, max = 128) String password) {
        public Bootstrap {
            if (email != null) email = email.strip().toLowerCase(java.util.Locale.ROOT);
            if (name != null) name = name.strip();
        }

        @Override
        public String toString() {
            return "Bootstrap[redacted]";
        }
    }

    /** The member's own name, as teammates and agents' records show it. */
    public record Rename(@NotBlank @Size(max = 64) String name) {
        public Rename {
            if (name != null) name = name.strip();
        }
    }

    public record Login(
            @NotBlank @Size(max = 256) String email,
            @NotNull @Size(min = 1, max = 128) String password) {
        @Override
        public String toString() {
            return "Login[redacted]";
        }
    }

    public record Password(
            @NotNull @Size(min = 1, max = 128) String currentPassword,
            @NotNull @Size(min = 1, max = 128) String newPassword) {
        @Override
        public String toString() {
            return "Password[redacted]";
        }
    }

    public record CreateKey(
            @NotBlank @Size(max = 64) String name,
            @Size(max = 64) String agentName,
            Integer expiresInDays,
            @NotNull @Size(min = 1, max = 128) String currentPassword) {
        @Override
        public String toString() {
            return "CreateKey[redacted]";
        }
    }

    public record Reauthenticate(
            @NotNull @Size(min = 1, max = 128) String currentPassword) {
        @Override
        public String toString() {
            return "Reauthenticate[redacted]";
        }
    }
}
