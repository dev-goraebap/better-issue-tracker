package io.github.goraebap.bit.module.session.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Project.PROJECT;
import static io.github.goraebap.bit.jooq.tables.SessionParticipant.SESSION_PARTICIPANT;
import static io.github.goraebap.bit.jooq.tables.SessionRecord.SESSION_RECORD;

import io.github.goraebap.bit.module.session.domain.Participant;
import io.github.goraebap.bit.module.session.domain.SessionRecord;
import io.github.goraebap.bit.module.session.domain.SessionRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqSessionRepository implements SessionRepository {
    private final DSLContext dslContext;

    @Override
    public long countAllById(UUID projectId, java.util.Set<UUID> ids) {
        if (ids.isEmpty()) return 0;
        return dslContext.fetchCount(
                SESSION_RECORD,
                SESSION_RECORD
                        .PROJECT_ID
                        .eq(projectId)
                        .and(SESSION_RECORD.SESSION_RECORD_ID.in(ids))
                        .and(SESSION_RECORD.DELETED_AT.isNull()));
    }

    @Override
    public Optional<SessionRecord> findById(UUID projectId, UUID id, boolean includeDeleted) {
        return dslContext
                .selectFrom(SESSION_RECORD)
                .where(SESSION_RECORD.PROJECT_ID.eq(projectId))
                .and(SESSION_RECORD.SESSION_RECORD_ID.eq(id))
                .and(includeDeleted ? DSL.noCondition() : SESSION_RECORD.DELETED_AT.isNull())
                .fetchOptional(this::session);
    }

    @Override
    public Optional<SessionRecord> findByNumber(UUID projectId, long number) {
        return dslContext
                .selectFrom(SESSION_RECORD)
                .where(SESSION_RECORD.PROJECT_ID.eq(projectId))
                .and(SESSION_RECORD.NUMBER.eq(number))
                .and(SESSION_RECORD.DELETED_AT.isNull())
                .fetchOptional(this::session);
    }

    @Override
    public Optional<SessionRecord> findTarget(UUID workspaceId, UUID id) {
        return dslContext
                .select(SESSION_RECORD.fields())
                .from(SESSION_RECORD)
                .join(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(SESSION_RECORD.PROJECT_ID))
                .where(PROJECT.WORKSPACE_ID.eq(workspaceId))
                .and(PROJECT.DELETED_AT.isNull())
                .and(SESSION_RECORD.SESSION_RECORD_ID.eq(id))
                .and(SESSION_RECORD.DELETED_AT.isNull())
                .fetchOptional(this::session);
    }

    @Override
    public void save(SessionRecord session) {
        var r = dslContext.newRecord(SESSION_RECORD);
        var details = session.details();
        r.setSessionRecordId(session.id());
        r.setProjectId(session.projectId());
        r.setNumber(session.number());
        r.setType(details.type());
        r.setTitle(details.title());
        r.setSummary(details.summary());
        r.setOccurredAt(details.occurredAt());
        r.setVersion(session.version());
        AuditRecords.write(r, session.audit());
        dslContext
                .insertInto(SESSION_RECORD)
                .set(r)
                .onConflict(SESSION_RECORD.SESSION_RECORD_ID)
                .doUpdate()
                .set(r)
                .execute();
        dslContext
                .deleteFrom(SESSION_PARTICIPANT)
                .where(SESSION_PARTICIPANT.SESSION_RECORD_ID.eq(session.id()))
                .execute();
        var participants = session.participants().stream()
                .map(participant -> {
                    var person = dslContext.newRecord(SESSION_PARTICIPANT);
                    person.setSessionParticipantId(UUID.randomUUID());
                    person.setSessionRecordId(session.id());
                    person.setKind(participant.kind());
                    person.setIamUserId(participant.userId());
                    person.setDisplayName(participant.displayName());
                    person.setCreatedAt(session.audit().updatedAt());
                    return person;
                })
                .toList();
        if (!participants.isEmpty()) dslContext.batchInsert(participants).execute();
    }

    private SessionRecord session(Record row) {
        UUID id = row.get(SESSION_RECORD.SESSION_RECORD_ID);
        var participants = dslContext
                .selectFrom(SESSION_PARTICIPANT)
                .where(SESSION_PARTICIPANT.SESSION_RECORD_ID.eq(id))
                .orderBy(SESSION_PARTICIPANT.CREATED_AT, SESSION_PARTICIPANT.SESSION_PARTICIPANT_ID)
                .fetch(p -> new Participant(p.getKind(), p.getIamUserId(), p.getDisplayName()));
        return SessionRecord.fromPersistence(
                id,
                row.get(SESSION_RECORD.PROJECT_ID),
                row.get(SESSION_RECORD.NUMBER),
                new SessionRecord.Details(
                        row.get(SESSION_RECORD.TYPE),
                        row.get(SESSION_RECORD.TITLE),
                        row.get(SESSION_RECORD.SUMMARY),
                        row.get(SESSION_RECORD.OCCURRED_AT)),
                participants,
                row.get(SESSION_RECORD.VERSION),
                AuditRecords.read(row));
    }
}
