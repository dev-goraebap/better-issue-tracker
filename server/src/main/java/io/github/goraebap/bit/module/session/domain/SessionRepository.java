package io.github.goraebap.bit.module.session.domain;

import java.util.Optional;
import java.util.Set;

public interface SessionRepository {
    Optional<SessionRecord> findById(String projectId, String id, boolean includeDeleted);

    Optional<SessionRecord> findByNumber(String projectId, long number);

    Optional<SessionRecord> findTarget(String workspaceId, String id);

    long countAllById(String projectId, Set<String> ids);

    void save(SessionRecord session);
}
