package io.github.goraebap.bit.module.decision.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Decision.DECISION;
import static io.github.goraebap.bit.jooq.tables.Project.PROJECT;

import io.github.goraebap.bit.module.decision.domain.Decision;
import io.github.goraebap.bit.module.decision.domain.DecisionRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqDecisionRepository implements DecisionRepository {
    private final DSLContext dslContext;

    @Override
    public long countAllById(String projectId, java.util.Set<String> ids) {
        if (ids.isEmpty()) return 0;
        return dslContext.fetchCount(
                DECISION,
                DECISION.PROJECT_ID
                        .eq(projectId)
                        .and(DECISION.DECISION_ID.in(ids))
                        .and(DECISION.DELETED_AT.isNull()));
    }

    @Override
    public Optional<Decision> findById(String projectId, String id, boolean includeDeleted) {
        return dslContext
                .selectFrom(DECISION)
                .where(DECISION.PROJECT_ID.eq(projectId))
                .and(DECISION.DECISION_ID.eq(id))
                .and(includeDeleted ? DSL.noCondition() : DECISION.DELETED_AT.isNull())
                .fetchOptional(this::decision);
    }

    @Override
    public Optional<Decision> findByNumber(String projectId, long number) {
        return dslContext
                .selectFrom(DECISION)
                .where(DECISION.PROJECT_ID.eq(projectId))
                .and(DECISION.NUMBER.eq(number))
                .and(DECISION.DELETED_AT.isNull())
                .fetchOptional(this::decision);
    }

    @Override
    public Optional<Decision> findTarget(String workspaceId, String id) {
        return dslContext
                .select(DECISION.fields())
                .from(DECISION)
                .join(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(DECISION.PROJECT_ID))
                .where(PROJECT.WORKSPACE_ID.eq(workspaceId))
                .and(PROJECT.DELETED_AT.isNull())
                .and(DECISION.DECISION_ID.eq(id))
                .and(DECISION.DELETED_AT.isNull())
                .fetchOptional(this::decision);
    }

    @Override
    public void save(Decision decision) {
        saveAll(List.of(decision));
    }

    @Override
    public void saveAll(List<Decision> decisions) {
        if (!decisions.isEmpty())
            dslContext.batch(decisions.stream().map(this::saveQuery).toList()).execute();
    }

    private org.jooq.Query saveQuery(Decision decision) {
        var r = dslContext.newRecord(DECISION);
        var details = decision.details();
        r.setDecisionId(decision.id());
        r.setProjectId(decision.projectId());
        r.setNumber(decision.number());
        r.setTitle(details.title());
        r.setBody(details.body());
        r.setRejectedAlternatives(details.rejectedAlternatives());
        r.setTriggerType(details.triggerType());
        r.setStatus(decision.state().name().toLowerCase(java.util.Locale.ROOT));
        r.setAcceptedAt(decision.acceptedAt());
        r.setSupersededAt(decision.supersededAt());
        r.setVersion(decision.version());
        AuditRecords.write(r, decision.audit());
        return dslContext
                .insertInto(DECISION)
                .set(r)
                .onConflict(DECISION.DECISION_ID)
                .doUpdate()
                .set(r);
    }

    private Decision decision(Record row) {
        return Decision.fromPersistence(
                row.get(DECISION.DECISION_ID),
                row.get(DECISION.PROJECT_ID),
                row.get(DECISION.NUMBER),
                new Decision.Details(
                        row.get(DECISION.TITLE),
                        row.get(DECISION.BODY),
                        row.get(DECISION.REJECTED_ALTERNATIVES),
                        row.get(DECISION.TRIGGER_TYPE)),
                Decision.State.valueOf(row.get(DECISION.STATUS).toUpperCase(java.util.Locale.ROOT)),
                row.get(DECISION.ACCEPTED_AT),
                row.get(DECISION.SUPERSEDED_AT),
                row.get(DECISION.VERSION),
                AuditRecords.read(row));
    }
}
