package io.github.goraebap.bit.module.iam.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IamRepository {
    List<Identity> findAllById(List<UUID> ids);

    UUID activeWorkspace(UUID sessionId);

    void selectWorkspace(UUID sessionId, UUID workspaceId);

    void clearWorkspace(UUID workspaceId, UUID userId);

    boolean hasUsers();

    Optional<Identity> findUser(UUID id);

    Optional<Identity> findByEmail(String email);

    Optional<PasswordCredential> findPassword(UUID userId);

    void createUser(Identity user, String hash, Instant now);

    void renameUser(UUID id, String name, Instant now);

    void savePassword(PasswordCredential password, Instant now);

    Optional<LoginSession> findSessionByHash(String hash);

    Optional<LoginSession> findSession(UUID id);

    void saveSession(LoginSession session);

    void deleteSession(UUID id);

    void deleteSessions(UUID userId);

    Optional<AgentKey> findKeyByHash(String hash);

    Optional<AgentKey> findKey(UUID id);

    List<AgentKey> findKeys(UUID userId, Instant beforeTime, UUID beforeId, int limit);

    void createKey(AgentKey key);

    void touchKey(UUID id, Instant now);

    void revokeKeys(UUID userId, Instant now);

    void revokeKey(UUID id, Instant now);
}
