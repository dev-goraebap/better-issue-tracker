package io.github.goraebap.bit.module.view.domain;

import java.util.List;
import java.util.Optional;

/** Views and the members' tweaks over them. View reads return live views only. */
public interface ViewRepository {
    /** The shared views and the user's own personal views, by position. */
    List<IssueView> findAllVisible(String workspaceId, String userId);

    Optional<IssueView> findById(String workspaceId, String id);

    double nextPosition(String workspaceId);

    void save(IssueView view);

    void saveAll(List<IssueView> views);

    List<ViewTweak> findTweaks(String workspaceId, String userId);

    void saveTweak(ViewTweak tweak);

    void deleteTweak(String workspaceId, String userId, String viewKey);

    void deleteAllTweaksByViewKey(String workspaceId, String viewKey);
}
