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

    /** The projects' members in a workspace, live projects only (D-075). */
    List<Membership> findMemberships(UUID workspaceId);

    /** Adds the member to the project unless already there. */
    void addMember(UUID workspaceId, UUID projectId, UUID userId, UUID actor, Instant now);

    void removeMember(UUID projectId, UUID userId);

    record Membership(UUID projectId, UUID userId) {}

    record Key(UUID projectId, boolean current) {}

    record Row(
            UUID id,
            UUID workspaceId,
            String name,
            String key,
            String description,
            String icon,
            String color,
            Instant archivedAt,
            long version,
            Audit audit) {}
}
