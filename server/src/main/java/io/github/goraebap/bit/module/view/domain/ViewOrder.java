package io.github.goraebap.bit.module.view.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;

/**
 * A scope's own order of the views (D-088): the home's ({@link #HOME}) or a project's (its id). The first view is the
 * scope's default; a view not in it follows in the workspace's order. Keys are view ids and {@link IssueView#ALL}.
 */
public record ViewOrder(
        String workspaceId,
        String scope,
        List<String> viewKeys,
        Instant updatedAt,
        String updatedBy,
        String updatedByAgent) {
    public static final String HOME = "home";
    public static final int MAX_KEYS = 200;

    public ViewOrder {
        Objects.requireNonNull(workspaceId, "workspaceId");
        Objects.requireNonNull(updatedAt, "updatedAt");
        Objects.requireNonNull(updatedBy, "updatedBy");
        if (!validScope(scope)) throw new IllegalArgumentException("Invalid view order scope");
        if (!validKeys(viewKeys)) throw new IllegalArgumentException("Invalid view order keys");
        viewKeys = List.copyOf(viewKeys);
    }

    public static boolean validScope(String scope) {
        return HOME.equals(scope) || Ids.isId(scope);
    }

    /** At most {@link #MAX_KEYS} keys, each 전체 이슈's or a view id, none twice. */
    public static boolean validKeys(List<String> keys) {
        if (keys == null || keys.size() > MAX_KEYS) return false;
        var seen = new HashSet<String>();
        return keys.stream().allMatch(key -> (IssueView.ALL.equals(key) || Ids.isId(key)) && seen.add(key));
    }
}
