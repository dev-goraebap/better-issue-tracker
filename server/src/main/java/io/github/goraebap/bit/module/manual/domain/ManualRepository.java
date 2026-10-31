package io.github.goraebap.bit.module.manual.domain;

import java.util.Optional;

public interface ManualRepository {
    Optional<Manual> findById(String workspaceId, String id);

    boolean existsById(String id);

    void save(Manual manual);
}
