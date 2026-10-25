package io.github.goraebap.bit.module.project;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Optional;
import java.util.UUID;

public interface ProjectFacade {
    ProjectRef requireAccess(CurrentUser actor, UUID workspaceId, UUID projectId, boolean writing);

    void requireSettings(
            CurrentUser actor, UUID workspaceId, UUID projectId, boolean includeDeleted, boolean allowArchived);

    ProjectRef findByKey(CurrentUser actor, UUID workspaceId, String key);

    long allocateWorkItemNumber(CurrentUser actor, UUID workspaceId, UUID projectId);

    long allocateDecisionNumber(CurrentUser actor, UUID workspaceId, UUID projectId);

    long allocateDecisionNumbers(CurrentUser actor, UUID workspaceId, UUID projectId, int count);

    long allocateSessionNumber(CurrentUser actor, UUID workspaceId, UUID projectId);

    ColumnRef requireColumn(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId);

    Optional<ColumnRef> findColumn(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId);

    /** The project's board columns in order, with their names: where an issue can be moved. */
    java.util.List<ColumnInfo> boardColumns(CurrentUser actor, UUID workspaceId, UUID projectId);

    record ColumnInfo(UUID id, String name, ColumnCategory category, boolean finalColumn) {}

    record ProjectRef(UUID id, UUID workspaceId, String key, long version, boolean archived) {}

    /** A null id is the backlog, which has no category. */
    record ColumnRef(UUID id, boolean finalColumn, ColumnCategory category) {}
}
