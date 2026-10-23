package io.github.goraebap.bit.module.decision.domain;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface DecisionRepository {
    Optional<Decision> findById(UUID projectId, UUID id, boolean includeDeleted);

    Optional<Decision> findByNumber(UUID projectId, long number);

    Optional<Decision> findTarget(UUID workspaceId, UUID id);

    long countAllById(UUID projectId, Set<UUID> ids);

    void save(Decision decision);

    void saveAll(List<Decision> decisions);
}
