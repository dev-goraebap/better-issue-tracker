package io.github.goraebap.bit.module.workitem.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Recurrence.RECURRENCE;

import io.github.goraebap.bit.jooq.tables.records.RecurrenceRecord;
import io.github.goraebap.bit.module.workitem.domain.Recurrence;
import io.github.goraebap.bit.module.workitem.domain.RecurrenceRepository;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqRecurrenceRepository implements RecurrenceRepository {
    private final DSLContext dslContext;

    @Override
    public Optional<Recurrence> findById(String id) {
        return dslContext
                .selectFrom(RECURRENCE)
                .where(RECURRENCE.RECURRENCE_ID.eq(id))
                .and(RECURRENCE.DELETED_AT.isNull())
                .fetchOptional(JooqRecurrenceRepository::recurrence);
    }

    @Override
    public List<Recurrence> findAllById(Set<String> ids) {
        if (ids.isEmpty()) return List.of();
        return dslContext
                .selectFrom(RECURRENCE)
                .where(RECURRENCE.RECURRENCE_ID.in(ids))
                .and(RECURRENCE.DELETED_AT.isNull())
                .fetch(JooqRecurrenceRepository::recurrence);
    }

    @Override
    public List<String> findRunningIds(LocalDate since) {
        return dslContext
                .select(RECURRENCE.RECURRENCE_ID)
                .from(RECURRENCE)
                .where(RECURRENCE.DELETED_AT.isNull())
                .and(RECURRENCE.UNTIL_ON.isNull().or(RECURRENCE.UNTIL_ON.ge(since)))
                .orderBy(RECURRENCE.RECURRENCE_ID)
                .fetch(RECURRENCE.RECURRENCE_ID);
    }

    @Override
    public void save(Recurrence recurrence) {
        var r = dslContext.newRecord(RECURRENCE);
        var p = recurrence.pattern();
        var t = recurrence.template();
        r.setRecurrenceId(recurrence.id());
        r.setWorkspaceId(recurrence.workspaceId());
        r.setProjectId(recurrence.projectId());
        r.setFrequency(p.frequency().name());
        r.setIntervalCount(p.interval());
        r.setWeekdays(
                p.weekdays().isEmpty()
                        ? null
                        : p.weekdays().stream().sorted().map(Enum::name).collect(Collectors.joining(",")));
        r.setStartsOn(p.startsOn());
        r.setUntilOn(p.untilOn());
        r.setTimeZone(recurrence.zone().getId());
        r.setKind(t.kind().name());
        r.setTitle(t.title());
        r.setDescription(t.description());
        r.setPriority(t.priority() == null ? null : t.priority().name());
        r.setPeopleIds(json(t.peopleIds()));
        r.setLabelIds(json(t.labelIds()));
        r.setBoardColumnId(t.columnId());
        r.setDateParts(t.dateParts().name());
        r.setSpanDays(t.spanDays());
        r.setStartTime(t.startTime() == null ? null : t.startTime().toString());
        r.setDurationMinutes(t.durationMinutes());
        r.setAllDay(t.allDay());
        r.setReminderMinutes(t.reminderMinutes());
        r.setVersion(recurrence.version());
        AuditRecords.write(r, recurrence.audit());
        dslContext
                .insertInto(RECURRENCE)
                .set(r)
                .onConflict(RECURRENCE.RECURRENCE_ID)
                .doUpdate()
                .set(r)
                .execute();
    }

    private static Recurrence recurrence(RecurrenceRecord r) {
        String weekdays = r.getWeekdays();
        var pattern = new Recurrence.Pattern(
                Recurrence.Frequency.valueOf(r.getFrequency()),
                r.getIntervalCount(),
                weekdays == null
                        ? Set.of()
                        : Arrays.stream(weekdays.split(","))
                                .map(DayOfWeek::valueOf)
                                .collect(Collectors.toSet()),
                r.getStartsOn(),
                r.getUntilOn());
        var template = new Recurrence.Template(
                WorkItem.Kind.valueOf(r.getKind()),
                r.getTitle(),
                r.getDescription(),
                r.getPriority() == null ? null : WorkItem.Priority.valueOf(r.getPriority()),
                ids(r.getPeopleIds()),
                ids(r.getLabelIds()),
                r.getBoardColumnId(),
                Recurrence.DateParts.valueOf(r.getDateParts()),
                r.getSpanDays(),
                r.getStartTime() == null ? null : LocalTime.parse(r.getStartTime()),
                r.getDurationMinutes(),
                Boolean.TRUE.equals(r.getAllDay()),
                r.getReminderMinutes());
        return Recurrence.fromPersistence(
                r.getRecurrenceId(),
                r.getWorkspaceId(),
                r.getProjectId(),
                pattern,
                ZoneId.of(r.getTimeZone()),
                template,
                r.getVersion(),
                AuditRecords.read(r));
    }

    /** Ids are letters and digits only (D-083), so a JSON array of them needs no escaping. */
    private static String json(Set<String> ids) {
        return ids.stream()
                .filter(Ids::isId)
                .sorted()
                .map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static Set<String> ids(String json) {
        return Arrays.stream(json.split("\"")).filter(Ids::isId).collect(Collectors.toSet());
    }
}
