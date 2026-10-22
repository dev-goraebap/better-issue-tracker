package io.github.goraebap.bit.module.iam;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IamFacade {
    Optional<CurrentUser> authenticate(String token, CurrentUser.Method method);

    User actor(CurrentUser actor, boolean sessionOnly);

    Optional<User> user(UUID id);

    Optional<User> userByEmail(String email);

    List<User> users(List<UUID> ids);

    PreparedIdentity prepareIdentity(String email, String name, String password);

    User registerIdentity(PreparedIdentity identity);

    Reauthentication reauthenticate(CurrentUser actor, String password);

    void assertReauthentication(CurrentUser actor, Reauthentication proof);

    void selectWorkspace(CurrentUser actor, UUID workspaceId);

    void clearWorkspace(UUID workspaceId, UUID userId);

    record User(UUID id, String email, String name) {}

    record PreparedIdentity(UUID id, String email, String name, String passwordHash) {
        @Override
        public String toString() {
            return "PreparedIdentity[redacted]";
        }
    }

    record Reauthentication(UUID userId, UUID credentialId, String passwordHash) {
        @Override
        public String toString() {
            return "Reauthentication[redacted]";
        }
    }
}
