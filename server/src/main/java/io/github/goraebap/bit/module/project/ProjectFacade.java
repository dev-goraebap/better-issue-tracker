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

    ColumnRef requireColumn(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId);

    Optional<ColumnRef> findColumn(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId);

    record ProjectRef(UUID id, UUID workspaceId, String key, long version, boolean archived) {}

    record ColumnRef(UUID id, boolean finalColumn) {}
}
