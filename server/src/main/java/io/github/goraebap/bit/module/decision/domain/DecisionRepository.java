package io.github.goraebap.bit.module.decision.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DecisionRepository {
    Optional<Decision> findById(UUID projectId, UUID id, boolean includeDeleted);

    Optional<Decision> findByNumber(UUID projectId, long number);

    Optional<Decision> findTarget(UUID workspaceId, UUID id);

    void save(Decision decision);

    void saveAll(List<Decision> decisions);
}
