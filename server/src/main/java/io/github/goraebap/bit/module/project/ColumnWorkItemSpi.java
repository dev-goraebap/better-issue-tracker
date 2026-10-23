package io.github.goraebap.bit.module.project;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.UUID;

/** Runs within the caller's column transaction; implementations must not start a separate transaction. */
public interface ColumnWorkItemSpi {
    void reclassify(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId, boolean finalColumn);

    void transfer(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            UUID sourceColumnId,
            UUID targetColumnId,
            boolean targetFinal);
}
