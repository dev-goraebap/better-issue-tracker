package io.github.goraebap.bit.module.link.domain;

import java.util.List;
import java.util.Optional;

public interface LinkRepository {
    Optional<Link> findById(String workspaceId, String id);

    Optional<Link> findActive(String workspaceId, Link.Edge edge);

    List<Link> findAllActive(String workspaceId, List<Link.Edge> edges);

    List<Link> around(String workspaceId, io.github.goraebap.bit.module.link.TargetType type, String id);

    boolean hasParent(String workspaceId, String childId);

    boolean hasReplacement(String workspaceId, String oldDecisionId);

    boolean pathExists(String workspaceId, String relation, String fromId, String toId);

    void save(Link link);

    void saveAll(List<Link> links);
}
