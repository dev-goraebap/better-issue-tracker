package io.github.goraebap.bit.module.link.domain;

import java.util.Optional;
import java.util.UUID;

public interface LinkRepository {
    Optional<Link> findById(UUID workspaceId, UUID id);

    Optional<Link> findActive(UUID workspaceId, Link.Edge edge);

    boolean hasParent(UUID workspaceId, UUID childId);

    boolean hasReplacement(UUID workspaceId, UUID oldDecisionId);

    boolean pathExists(UUID workspaceId, String relation, UUID fromId, UUID toId);

    void save(Link link);
}
