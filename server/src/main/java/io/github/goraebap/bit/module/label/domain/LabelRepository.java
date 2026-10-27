package io.github.goraebap.bit.module.label.domain;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/** Reads return live labels only; a deleted label is gone for every caller. */
public interface LabelRepository {
    /** System labels first, then by name. */
    List<Label> findAllByWorkspaceId(String workspaceId);

    List<Label> findAllById(String workspaceId, Set<String> ids);

    Optional<Label> findById(String workspaceId, String id);

    /** Names compare without letter case, as the unique index does. */
    boolean existsByNameAndIdNot(String workspaceId, String name, String id);

    void save(Label label);

    void reorder(String workspaceId, List<String> ids, String actor, String agent, java.time.Instant now);
}
