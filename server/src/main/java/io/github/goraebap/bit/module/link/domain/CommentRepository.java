package io.github.goraebap.bit.module.link.domain;

import io.github.goraebap.bit.module.link.TargetType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CommentRepository {
    Optional<Comment> findById(String workspaceId, String id);

    /** A target's live comments oldest first, after the given point (none for the start), at most limit. */
    List<Comment> findAllByTarget(
            String workspaceId, TargetType type, String targetId, Instant afterTime, String afterId, int limit);

    void save(Comment comment);
}
