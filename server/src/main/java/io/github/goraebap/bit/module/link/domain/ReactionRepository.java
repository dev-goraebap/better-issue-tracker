package io.github.goraebap.bit.module.link.domain;

import java.time.Instant;
import java.util.List;

public interface ReactionRepository {
    record Row(String emoji, String userId) {}

    List<Row> list(String workspace, String type, String id);

    void set(
            String workspace,
            String type,
            String id,
            String emoji,
            String user,
            String agent,
            Instant now,
            boolean active);
}
