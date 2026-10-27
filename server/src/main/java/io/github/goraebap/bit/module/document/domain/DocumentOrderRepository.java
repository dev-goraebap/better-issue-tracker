package io.github.goraebap.bit.module.document.domain;

import java.time.Instant;
import java.util.List;

/** One shared order per part and parent; the tokens identify mixed project, folder and document rows. */
public interface DocumentOrderRepository {
    Saved find(String workspaceId, String scope);

    void save(String workspaceId, String scope, Saved saved, String actor, String agent, Instant now);

    record Saved(long version, List<String> order) {
        public Saved {
            order = List.copyOf(order);
        }
    }
}
