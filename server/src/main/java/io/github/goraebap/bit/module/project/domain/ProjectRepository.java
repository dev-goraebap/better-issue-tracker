package io.github.goraebap.bit.module.project.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ProjectRepository {
    Optional<Project> findById(String workspaceId, String projectId, boolean includeDeleted);

    Optional<Key> findKey(String workspaceId, String key);

    String currentKey(String projectId);

    /**
     * A page of the workspace's projects: newest first, after (time, id); or byPosition in the workspace's order, after
     * (position, id).
     */
    List<Row> findAll(
            String workspaceId,
            String status,
            String query,
            boolean byPosition,
            Instant beforeTime,
            Integer afterPosition,
            String cursorId,
            int limit);

    /** The workspace's live, unarchived projects in its order. */
    List<String> findActiveIds(String workspaceId);

    /** Puts the given projects in this order (positions 0, 1, …); version and audit stay, the order not being an edit. */
    void updateOrder(String workspaceId, List<String> orderedIds);

    int nextPosition(String workspaceId);

    void save(Project project);

    void switchKey(String workspaceId, String projectId, ProjectKey key, Instant now);

    List<BoardColumn> findColumns(String projectId);

    Optional<BoardColumn> findColumn(String projectId, String columnId);

    void save(BoardColumn column);

    /** The projects' members in a workspace, live projects only (D-075). */
    List<Membership> findMemberships(String workspaceId);

    /** Adds the member to the project unless already there. */
    void addMember(String workspaceId, String projectId, String userId, String actor, Instant now);

    void removeMember(String projectId, String userId);

    record Membership(String projectId, String userId) {}

    record Key(String projectId, boolean current) {}

    record Row(
            String id,
            String workspaceId,
            String name,
            String key,
            String description,
            String icon,
            String color,
            Instant archivedAt,
            int position,
            long version,
            Audit audit) {}
}
