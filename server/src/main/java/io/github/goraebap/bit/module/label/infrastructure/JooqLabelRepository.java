package io.github.goraebap.bit.module.label.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Label.LABEL;

import io.github.goraebap.bit.module.label.domain.Label;
import io.github.goraebap.bit.module.label.domain.LabelRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqLabelRepository implements LabelRepository {
    private final DSLContext dslContext;

    @Override
    public List<Label> findAllByWorkspaceId(String workspaceId) {
        return dslContext
                .selectFrom(LABEL)
                .where(LABEL.WORKSPACE_ID.eq(workspaceId))
                .and(LABEL.DELETED_AT.isNull())
                .orderBy(LABEL.POSITION.asc(), DSL.lower(LABEL.NAME), LABEL.LABEL_ID)
                .fetch(this::label);
    }

    @Override
    public List<Label> findAllById(String workspaceId, Set<String> ids) {
        if (ids.isEmpty()) return List.of();
        return dslContext
                .selectFrom(LABEL)
                .where(LABEL.WORKSPACE_ID.eq(workspaceId))
                .and(LABEL.LABEL_ID.in(ids))
                .and(LABEL.DELETED_AT.isNull())
                .fetch(this::label);
    }

    @Override
    public Optional<Label> findById(String workspaceId, String id) {
        return dslContext
                .selectFrom(LABEL)
                .where(LABEL.WORKSPACE_ID.eq(workspaceId))
                .and(LABEL.LABEL_ID.eq(id))
                .and(LABEL.DELETED_AT.isNull())
                .fetchOptional(this::label);
    }

    @Override
    public boolean existsByNameAndIdNot(String workspaceId, String name, String id) {
        return dslContext.fetchExists(
                LABEL,
                LABEL.WORKSPACE_ID
                        .eq(workspaceId)
                        .and(DSL.lower(LABEL.NAME).eq(name.strip().toLowerCase(Locale.ROOT)))
                        .and(LABEL.DELETED_AT.isNull())
                        .and(id == null ? DSL.noCondition() : LABEL.LABEL_ID.ne(id)));
    }

    @Override
    public void save(Label l) {
        var r = dslContext.newRecord(LABEL);
        r.setLabelId(l.id());
        r.setWorkspaceId(l.workspaceId());
        r.setName(l.name());
        r.setColor(l.color());
        r.setIsSystem(l.system());
        r.setSystemKey(l.systemKey());
        r.setVersion(l.version());
        if (l.version() == 0)
            r.setPosition(dslContext
                    .select(DSL.coalesce(DSL.max(LABEL.POSITION), 0).add(1))
                    .from(LABEL)
                    .where(LABEL.WORKSPACE_ID.eq(l.workspaceId()))
                    .fetchOne(0, Integer.class));
        AuditRecords.write(r, l.audit());
        dslContext
                .insertInto(LABEL)
                .set(r)
                .onConflict(LABEL.LABEL_ID)
                .doUpdate()
                .set(r)
                .execute();
    }

    @Override
    public void reorder(String workspaceId, List<String> ids, String actor, String agent, java.time.Instant now) {
        for (int position = 0; position < ids.size(); position++)
            dslContext
                    .update(LABEL)
                    .set(LABEL.POSITION, position)
                    .set(LABEL.VERSION, LABEL.VERSION.add(1))
                    .set(LABEL.UPDATED_AT, now)
                    .set(LABEL.UPDATED_BY, actor)
                    .set(LABEL.UPDATED_BY_AGENT, agent)
                    .where(LABEL.WORKSPACE_ID.eq(workspaceId))
                    .and(LABEL.LABEL_ID.eq(ids.get(position)))
                    .execute();
    }

    private Label label(Record r) {
        return Label.fromPersistence(
                        r.get(LABEL.LABEL_ID),
                        r.get(LABEL.WORKSPACE_ID),
                        r.get(LABEL.NAME),
                        r.get(LABEL.COLOR),
                        r.get(LABEL.SYSTEM_KEY),
                        r.get(LABEL.VERSION),
                        AuditRecords.read(r))
                .atPosition(r.get(LABEL.POSITION));
    }
}
