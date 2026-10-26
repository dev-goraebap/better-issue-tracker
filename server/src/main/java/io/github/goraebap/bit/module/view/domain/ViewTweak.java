package io.github.goraebap.bit.module.view.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** A member's own layout, order and columns over a view; any part left null follows the view. */
public record ViewTweak(
        String workspaceId,
        String userId,
        String viewKey,
        WorkItemView.Layout layout,
        WorkItemView.Sort sort,
        List<WorkItemView.Column> columns,
        Instant updatedAt) {
    public ViewTweak {
        Objects.requireNonNull(workspaceId, "workspaceId");
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(viewKey, "viewKey");
        if (columns != null && !WorkItemView.validColumns(columns))
            throw new IllegalArgumentException("Invalid tweak columns");
        columns = columns == null ? null : List.copyOf(columns);
    }

    public static boolean validColumns(List<WorkItemView.Column> columns) {
        return columns == null || WorkItemView.validColumns(columns);
    }

    public boolean isEmpty() {
        return layout == null && sort == null && columns == null;
    }
}
