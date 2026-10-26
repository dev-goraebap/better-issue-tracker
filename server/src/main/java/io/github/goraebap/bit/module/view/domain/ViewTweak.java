package io.github.goraebap.bit.module.view.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** A member's own layout, order and columns over a view; any part left null follows the view. */
public record ViewTweak(
        String workspaceId,
        String userId,
        String viewKey,
        IssueView.Layout layout,
        IssueView.Sort sort,
        List<IssueView.Column> columns,
        Instant updatedAt) {
    public ViewTweak {
        Objects.requireNonNull(workspaceId, "workspaceId");
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(viewKey, "viewKey");
        if (columns != null && !IssueView.validColumns(columns))
            throw new IllegalArgumentException("Invalid tweak columns");
        columns = columns == null ? null : List.copyOf(columns);
    }

    public static boolean validColumns(List<IssueView.Column> columns) {
        return columns == null || IssueView.validColumns(columns);
    }

    public boolean isEmpty() {
        return layout == null && sort == null && columns == null;
    }
}
