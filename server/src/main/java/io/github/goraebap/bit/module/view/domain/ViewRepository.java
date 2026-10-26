package io.github.goraebap.bit.module.view.domain;

import java.util.List;
import java.util.Optional;

/** Views and the members' tweaks over them. View reads return live views only. */
public interface ViewRepository {
    /** The shared views and the user's own personal views, by position. */
    List<WorkItemView> findAllVisible(String workspaceId, String userId);

    Optional<WorkItemView> findById(String workspaceId, String id);

    double nextPosition(String workspaceId);

    void save(WorkItemView view);

    void saveAll(List<WorkItemView> views);

    List<ViewTweak> findTweaks(String workspaceId, String userId);

    void saveTweak(ViewTweak tweak);

    void deleteTweak(String workspaceId, String userId, String viewKey);

    void deleteAllTweaksByViewKey(String workspaceId, String viewKey);

    /** Each scope's own order of the views (D-088), the home's and the projects' that have one. */
    List<ViewOrder> findOrders(String workspaceId);

    Optional<ViewOrder> findOrder(String workspaceId, String scope);

    void saveOrder(ViewOrder order);
}
