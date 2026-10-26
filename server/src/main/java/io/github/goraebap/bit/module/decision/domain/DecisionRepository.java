package io.github.goraebap.bit.module.decision.domain;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface DecisionRepository {
    Optional<Decision> findById(String projectId, String id, boolean includeDeleted);

    Optional<Decision> findByNumber(String projectId, long number);

    Optional<Decision> findTarget(String workspaceId, String id);

    long countAllById(String projectId, Set<String> ids);

    void save(Decision decision);

    void saveAll(List<Decision> decisions);
}
