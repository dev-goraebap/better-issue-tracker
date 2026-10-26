package io.github.goraebap.bit.module.project;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Optional;

public interface ProjectFacade {
    ProjectRef requireAccess(CurrentUser actor, String workspaceId, String projectId, boolean writing);

    void requireSettings(
            CurrentUser actor, String workspaceId, String projectId, boolean includeDeleted, boolean allowArchived);

    ProjectRef findByKey(CurrentUser actor, String workspaceId, String key);

    long allocateWorkItemNumber(CurrentUser actor, String workspaceId, String projectId);

    long allocateDecisionNumber(CurrentUser actor, String workspaceId, String projectId);

    long allocateDecisionNumbers(CurrentUser actor, String workspaceId, String projectId, int count);

    long allocateSessionNumber(CurrentUser actor, String workspaceId, String projectId);

    ColumnRef requireColumn(CurrentUser actor, String workspaceId, String projectId, String columnId);

    Optional<ColumnRef> findColumn(CurrentUser actor, String workspaceId, String projectId, String columnId);

    /** The project's board columns in order, with their names: where an issue can be moved. */
    java.util.List<ColumnInfo> boardColumns(CurrentUser actor, String workspaceId, String projectId);

    record ColumnInfo(String id, String name, ColumnCategory category, boolean finalColumn) {}

    record ProjectRef(String id, String workspaceId, String key, long version, boolean archived) {}

    /** A null id is the backlog, which has no category. */
    record ColumnRef(String id, boolean finalColumn, ColumnCategory category) {}
}
