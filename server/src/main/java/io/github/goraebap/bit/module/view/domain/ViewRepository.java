package io.github.goraebap.bit.module.view.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Views and the members' tweaks over them. View reads return live views only. */
public interface ViewRepository {
    /** The shared views and the user's own personal views, by position. */
    List<IssueView> findAllVisible(UUID workspaceId, UUID userId);

    Optional<IssueView> findById(UUID workspaceId, UUID id);

    double nextPosition(UUID workspaceId);

    void save(IssueView view);

    void saveAll(List<IssueView> views);

    List<ViewTweak> findTweaks(UUID workspaceId, UUID userId);

    void saveTweak(ViewTweak tweak);

    void deleteTweak(UUID workspaceId, UUID userId, String viewKey);

    void deleteAllTweaksByViewKey(UUID workspaceId, String viewKey);
}
