package io.github.goraebap.bit.module.link.domain;

import io.github.goraebap.bit.module.link.TargetType;
import java.time.Instant;
import java.util.List;

public interface ActivityRepository {
    void saveAll(List<Activity> activities);

    /**
     * A target's activity oldest first, after the given point (none for the start), at most limit; a comment's own
     * activity is left out, the comment itself being in the timeline.
     */
    List<Activity> findAllByTarget(
            String workspaceId, TargetType type, String targetId, Instant afterTime, String afterId, int limit);
}
