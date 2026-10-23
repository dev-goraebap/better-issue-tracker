package io.github.goraebap.bit.module.session.domain;

import java.util.Optional;
import java.util.UUID;

public interface SessionRepository {
    Optional<SessionRecord> findById(UUID projectId, UUID id, boolean includeDeleted);

    Optional<SessionRecord> findByNumber(UUID projectId, long number);

    Optional<SessionRecord> findTarget(UUID workspaceId, UUID id);

    void save(SessionRecord session);
}
