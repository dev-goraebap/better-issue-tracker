package io.github.goraebap.bit.module.document.infrastructure;

import static io.github.goraebap.bit.jooq.tables.DocumentOrder.DOCUMENT_ORDER;

import io.github.goraebap.bit.module.document.domain.DocumentOrderRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqDocumentOrderRepository implements DocumentOrderRepository {
    private final DSLContext dslContext;

    @Override
    public Saved find(String workspaceId, String scope) {
        return dslContext
                .selectFrom(DOCUMENT_ORDER)
                .where(DOCUMENT_ORDER.WORKSPACE_ID.eq(workspaceId))
                .and(DOCUMENT_ORDER.SCOPE_KEY.eq(scope))
                .fetchOptional(
                        r -> new Saved(r.getVersion(), r.getEntries().lines().toList()))
                .orElseGet(() -> new Saved(0, List.of()));
    }

    @Override
    public void save(String workspaceId, String scope, Saved saved, String actor, String agent, Instant now) {
        dslContext
                .insertInto(DOCUMENT_ORDER)
                .set(DOCUMENT_ORDER.DOCUMENT_ORDER_ID, Ids.newId())
                .set(DOCUMENT_ORDER.WORKSPACE_ID, workspaceId)
                .set(DOCUMENT_ORDER.SCOPE_KEY, scope)
                .set(DOCUMENT_ORDER.ENTRIES, String.join("\n", saved.order()))
                .set(DOCUMENT_ORDER.VERSION, saved.version())
                .set(DOCUMENT_ORDER.UPDATED_AT, now)
                .set(DOCUMENT_ORDER.UPDATED_BY, actor)
                .set(DOCUMENT_ORDER.UPDATED_BY_AGENT, agent)
                .onConflict(DOCUMENT_ORDER.WORKSPACE_ID, DOCUMENT_ORDER.SCOPE_KEY)
                .doUpdate()
                .set(DOCUMENT_ORDER.ENTRIES, String.join("\n", saved.order()))
                .set(DOCUMENT_ORDER.VERSION, saved.version())
                .set(DOCUMENT_ORDER.UPDATED_AT, now)
                .set(DOCUMENT_ORDER.UPDATED_BY, actor)
                .set(DOCUMENT_ORDER.UPDATED_BY_AGENT, agent)
                .execute();
    }
}
