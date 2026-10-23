package io.github.goraebap.bit.module.link.domain;

import java.util.Optional;
import java.util.UUID;

public interface CommentRepository {
    Optional<Comment> findById(UUID workspaceId, UUID id);

    void save(Comment comment);
}
