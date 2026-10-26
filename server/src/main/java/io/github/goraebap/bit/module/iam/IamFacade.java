package io.github.goraebap.bit.module.iam;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
import java.util.Optional;

public interface IamFacade {
    Optional<CurrentUser> authenticate(String token, CurrentUser.Method method);

    User actor(CurrentUser actor, boolean sessionOnly);

    Optional<User> user(String id);

    Optional<User> userByEmail(String email);

    List<User> users(List<String> ids);

    PreparedIdentity prepareIdentity(String email, String name, String password);

    User registerIdentity(PreparedIdentity identity);

    Reauthentication reauthenticate(CurrentUser actor, String password);

    void assertReauthentication(CurrentUser actor, Reauthentication proof);

    void selectWorkspace(CurrentUser actor, String workspaceId);

    void clearWorkspace(String workspaceId, String userId);

    record User(String id, String email, String name) {}

    record PreparedIdentity(String id, String email, String name, String passwordHash) {
        @Override
        public String toString() {
            return "PreparedIdentity[redacted]";
        }
    }

    record Reauthentication(String userId, String credentialId, String passwordHash) {
        @Override
        public String toString() {
            return "Reauthentication[redacted]";
        }
    }
}
