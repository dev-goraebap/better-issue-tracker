package io.github.goraebap.bit.module.manual.application;

import java.util.List;

public interface ManualQuery {
    record Search(String query, String scope, String color, String sort, boolean ascending) {}

    List<ManualViews.Summary> list(String workspaceId, String projectId, Search search, String cursor, int limit);

    int count(String workspaceId, String projectId, Search search);
}
