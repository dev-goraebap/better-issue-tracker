package io.github.goraebap.bit.module.label.domain;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Reads return live labels only; a deleted label is gone for every caller. */
public interface LabelRepository {
    /** System labels first, then by name. */
    List<Label> findAllByWorkspaceId(UUID workspaceId);

    List<Label> findAllById(UUID workspaceId, Set<UUID> ids);

    Optional<Label> findById(UUID workspaceId, UUID id);

    /** Names compare without letter case, as the unique index does. */
    boolean existsByNameAndIdNot(UUID workspaceId, String name, UUID id);

    void save(Label label);
}
