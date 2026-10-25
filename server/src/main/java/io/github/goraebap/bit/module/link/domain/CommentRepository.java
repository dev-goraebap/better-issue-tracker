package io.github.goraebap.bit.module.link.domain;

import io.github.goraebap.bit.module.link.TargetType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentRepository {
    Optional<Comment> findById(UUID workspaceId, UUID id);

    /** A target's live comments oldest first, after the given point (none for the start), at most limit. */
    List<Comment> findAllByTarget(
            UUID workspaceId, TargetType type, UUID targetId, Instant afterTime, UUID afterId, int limit);

    void save(Comment comment);
}
