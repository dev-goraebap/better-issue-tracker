package io.github.goraebap.bit.module.iam.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface IamRepository {
    List<Identity> findAllById(List<String> ids);

    String activeWorkspace(String sessionId);

    void selectWorkspace(String sessionId, String workspaceId);

    void clearWorkspace(String workspaceId, String userId);

    boolean hasUsers();

    Optional<Identity> findUser(String id);

    Optional<Identity> findByEmail(String email);

    Optional<PasswordCredential> findPassword(String userId);

    void createUser(Identity user, String hash, Instant now);

    void renameUser(String id, String name, Instant now);

    void savePassword(PasswordCredential password, Instant now);

    Optional<LoginSession> findSessionByHash(String hash);

    Optional<LoginSession> findSession(String id);

    void saveSession(LoginSession session);

    void deleteSession(String id);

    void deleteSessions(String userId);

    Optional<AgentKey> findKeyByHash(String hash);

    Optional<AgentKey> findKey(String id);

    List<AgentKey> findKeys(String userId, Instant beforeTime, String beforeId, int limit);

    void createKey(AgentKey key);

    void touchKey(String id, Instant now);

    void revokeKeys(String userId, Instant now);

    void revokeKey(String id, Instant now);
}
