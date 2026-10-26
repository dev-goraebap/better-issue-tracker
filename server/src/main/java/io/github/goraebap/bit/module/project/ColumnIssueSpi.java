package io.github.goraebap.bit.module.project;

import io.github.goraebap.bit.shared.web.CurrentUser;

/** Runs within the caller's column transaction; implementations must not start a separate transaction. */
public interface ColumnIssueSpi {
    void reclassify(CurrentUser actor, String workspaceId, String projectId, String columnId, boolean finalColumn);

    void transfer(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String sourceColumnId,
            String targetColumnId,
            boolean targetFinal);
}
