package io.github.goraebap.bit.module.project.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository {
    Optional<Project> findById(UUID workspaceId, UUID projectId, boolean includeDeleted);

    Optional<Key> findKey(UUID workspaceId, String key);

    String currentKey(UUID projectId);

    List<Row> findAll(UUID workspaceId, String status, String query, Instant beforeTime, UUID beforeId, int limit);

    int nextPosition(UUID workspaceId);

    void save(Project project);

    void switchKey(UUID workspaceId, UUID projectId, ProjectKey key, Instant now);

    List<BoardColumn> findColumns(UUID projectId);

    Optional<BoardColumn> findColumn(UUID projectId, UUID columnId);

    void save(BoardColumn column);

    record Key(UUID projectId, boolean current) {}

    record Row(
            UUID id,
            UUID workspaceId,
            String name,
            String key,
            String description,
            Instant archivedAt,
            long version,
            Audit audit) {}
}
