package io.github.goraebap.bit.module.workitem.infrastructure;

import static io.github.goraebap.bit.jooq.tables.BoardColumn.BOARD_COLUMN;
import static io.github.goraebap.bit.jooq.tables.IamUser.IAM_USER;
import static io.github.goraebap.bit.jooq.tables.Label.LABEL;
import static io.github.goraebap.bit.jooq.tables.Project.PROJECT;
import static io.github.goraebap.bit.jooq.tables.ProjectKey.PROJECT_KEY;
import static io.github.goraebap.bit.jooq.tables.WorkItem.WORK_ITEM;
import static io.github.goraebap.bit.jooq.tables.WorkItemLabel.WORK_ITEM_LABEL;
import static io.github.goraebap.bit.jooq.tables.WorkItemPerson.WORK_ITEM_PERSON;

import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqWorkItemRepository implements WorkItemRepository {
    private final DSLContext dslContext;

    private static String referenceKey(Record row) {
        String ref = row.get(WORK_ITEM.PUBLIC_REF);
        return ref == null ? row.get(PROJECT_KEY.KEY) : ref.substring(0, ref.lastIndexOf('-'));
    }

    @Override
    public String reference(WorkItem item) {
        if (item.publicRef() != null) return item.publicRef();
        return dslContext
                        .select(PROJECT_KEY.KEY)
                        .from(PROJECT_KEY)
                        .where(PROJECT_KEY.PROJECT_ID.eq(item.projectId()))
                        .and(PROJECT_KEY.IS_CURRENT.isTrue())
                        .fetchOne(PROJECT_KEY.KEY)
                + "-" + item.number();
    }

    @Override
    public Optional<WorkItem> findByReference(String workspaceId, String reference) {
        return single(dslContext
                .selectFrom(WORK_ITEM)
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM.PUBLIC_REF.eq(reference))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public long countAllById(String projectId, Set<String> ids) {
        if (ids.isEmpty()) return 0;
        return dslContext.fetchCount(
                WORK_ITEM,
                WORK_ITEM
                        .PROJECT_ID
                        .eq(projectId)
                        .and(WORK_ITEM.WORK_ITEM_ID.in(ids))
                        .and(WORK_ITEM.DELETED_AT.isNull()));
    }

    @Override
    public List<WorkItem> findAllById(String workspaceId, Set<String> ids) {
        if (ids.isEmpty()) return List.of();
        return items(dslContext
                .selectFrom(WORK_ITEM)
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM.WORK_ITEM_ID.in(ids))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public Optional<WorkItem> findAnyById(String workspaceId, String id) {
        return single(dslContext
                .selectFrom(WORK_ITEM)
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM.WORK_ITEM_ID.eq(id))
                .fetch());
    }

    @Override
    public Map<String, String> findReferences(String workspaceId, Set<String> ids) {
        if (ids.isEmpty()) return Map.of();
        var references = new HashMap<String, String>();
        dslContext
                .select(WORK_ITEM.WORK_ITEM_ID, WORK_ITEM.PUBLIC_REF, WORK_ITEM.NUMBER, PROJECT_KEY.KEY)
                .from(WORK_ITEM)
                .leftJoin(PROJECT_KEY)
                .on(PROJECT_KEY.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID).and(PROJECT_KEY.IS_CURRENT.isTrue()))
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM.WORK_ITEM_ID.in(ids))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .forEach(r -> references.put(
                        r.get(WORK_ITEM.WORK_ITEM_ID),
                        r.get(WORK_ITEM.PUBLIC_REF) != null
                                ? r.get(WORK_ITEM.PUBLIC_REF)
                                : r.get(PROJECT_KEY.KEY) + "-" + r.get(WORK_ITEM.NUMBER)));
        return Map.copyOf(references);
    }

    @Override
    public Optional<WorkItem> findById(String projectId, String id, boolean includeDeleted) {
        return single(dslContext
                .selectFrom(WORK_ITEM)
                .where((projectId == null ? WORK_ITEM.PROJECT_ID.isNull() : WORK_ITEM.PROJECT_ID.eq(projectId)))
                .and(WORK_ITEM.WORK_ITEM_ID.eq(id))
                .and(includeDeleted ? DSL.noCondition() : WORK_ITEM.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public Optional<WorkItem> findTarget(String workspaceId, String id) {
        return single(dslContext
                .select(WORK_ITEM.fields())
                .from(WORK_ITEM)
                .leftJoin(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspaceId))
                .and(PROJECT.DELETED_AT.isNull())
                .and(WORK_ITEM.WORK_ITEM_ID.eq(id))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public Optional<WorkItem> findByNumber(String projectId, long number) {
        return single(dslContext
                .selectFrom(WORK_ITEM)
                .where((projectId == null ? WORK_ITEM.PROJECT_ID.isNull() : WORK_ITEM.PROJECT_ID.eq(projectId)))
                .and(WORK_ITEM.NUMBER.eq(number))
                .and(WORK_ITEM.PUBLIC_REF.isNull())
                .and(WORK_ITEM.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public List<WorkItem> findColumnItems(String projectId, String columnId, boolean includeDeleted) {
        return items(dslContext
                .selectFrom(WORK_ITEM)
                .where((projectId == null ? WORK_ITEM.PROJECT_ID.isNull() : WORK_ITEM.PROJECT_ID.eq(projectId)))
                .and(columnId == null ? backlog() : WORK_ITEM.BOARD_COLUMN_ID.eq(columnId))
                .and(includeDeleted ? DSL.noCondition() : WORK_ITEM.DELETED_AT.isNull())
                .orderBy(WORK_ITEM.POSITION, WORK_ITEM.WORK_ITEM_ID)
                .fetch());
    }

    @Override
    public Optional<Located> findLocated(String id) {
        return located(WORK_ITEM.WORK_ITEM_ID.eq(id)).stream().findFirst();
    }

    @Override
    public List<Located> findRemindable(java.time.Instant after, java.time.Instant through) {
        return located(WORK_ITEM
                .KIND
                .eq(WorkItem.Kind.event.name())
                .and(WORK_ITEM.REMINDER_MINUTES.isNotNull())
                .and(WORK_ITEM.STARTS_AT.gt(after))
                .and(WORK_ITEM.STARTS_AT.le(through))
                .and(WORK_ITEM.ARCHIVED_AT.isNull()));
    }

    @Override
    public List<Located> findDueOn(LocalDate day) {
        return located(WORK_ITEM
                .KIND
                .eq(WorkItem.Kind.task.name())
                .and(WORK_ITEM.DUE_DATE.eq(day))
                .and(WORK_ITEM.CLOSED_AT.isNull())
                .and(WORK_ITEM.ARCHIVED_AT.isNull())
                .and(DSL.exists(DSL.selectOne()
                        .from(WORK_ITEM_PERSON)
                        .where(WORK_ITEM_PERSON.WORK_ITEM_ID.eq(WORK_ITEM.WORK_ITEM_ID)))));
    }

    /** Live work items of live projects matching a condition, each with its workspace and current key. */
    private List<Located> located(Condition condition) {
        var records = dslContext
                .select(WORK_ITEM.fields())
                .select(PROJECT_KEY.KEY)
                .from(WORK_ITEM)
                .leftJoin(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .leftJoin(PROJECT_KEY)
                .on(PROJECT_KEY.PROJECT_ID.eq(PROJECT.PROJECT_ID).and(PROJECT_KEY.IS_CURRENT.isTrue()))
                .where(condition)
                .and(WORK_ITEM.DELETED_AT.isNull())
                .and(PROJECT.DELETED_AT.isNull())
                .orderBy(WORK_ITEM.WORK_ITEM_ID)
                .fetch();
        var ids = records.stream().map(r -> r.get(WORK_ITEM.WORK_ITEM_ID)).collect(Collectors.toSet());
        var labels = labels(ids);
        var people = people(ids);
        return records.stream()
                .map(r -> new Located(r.get(WORK_ITEM.WORKSPACE_ID), row(r, null, labels, people)))
                .toList();
    }

    @Override
    public List<WorkItem> findOccurrencesAfter(String recurrenceId, LocalDate day) {
        return items(dslContext
                .selectFrom(WORK_ITEM)
                .where(WORK_ITEM.RECURRENCE_ID.eq(recurrenceId))
                .and(WORK_ITEM.OCCURRENCE_ON.gt(day))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .orderBy(WORK_ITEM.OCCURRENCE_ON)
                .fetch());
    }

    @Override
    public Optional<LocalDate> findLatestOccurrence(String recurrenceId) {
        return Optional.ofNullable(dslContext
                .select(DSL.max(WORK_ITEM.OCCURRENCE_ON))
                .from(WORK_ITEM)
                .where(WORK_ITEM.RECURRENCE_ID.eq(recurrenceId))
                .fetchOne(0, LocalDate.class));
    }

    @Override
    public List<Row> findAll(Query q, Point p, int limit) {
        Condition where = conditions(q);
        boolean position = q.sort().equals("position");
        boolean ascending = q.direction().equals("ASC");
        if (p.id() != null) {
            Condition seek = position
                    ? (ascending ? WORK_ITEM.POSITION.gt(p.position()) : WORK_ITEM.POSITION.lt(p.position()))
                    : (ascending ? WORK_ITEM.CREATED_AT.gt(p.time()) : WORK_ITEM.CREATED_AT.lt(p.time()));
            Condition equal = position ? WORK_ITEM.POSITION.eq(p.position()) : WORK_ITEM.CREATED_AT.eq(p.time());
            where = where.and(seek.or(
                    equal.and(ascending ? WORK_ITEM.WORK_ITEM_ID.gt(p.id()) : WORK_ITEM.WORK_ITEM_ID.lt(p.id()))));
        }
        var order = position
                ? (ascending ? WORK_ITEM.POSITION.asc() : WORK_ITEM.POSITION.desc())
                : (ascending ? WORK_ITEM.CREATED_AT.asc() : WORK_ITEM.CREATED_AT.desc());
        // board_column is a to-one join by primary key: the category filter needs it, so its value is read here too.
        var records = dslContext
                .select(WORK_ITEM.fields())
                .select(PROJECT_KEY.KEY, BOARD_COLUMN.CATEGORY)
                .from(WORK_ITEM)
                .leftJoin(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .leftJoin(PROJECT_KEY)
                .on(PROJECT_KEY.PROJECT_ID.eq(PROJECT.PROJECT_ID).and(PROJECT_KEY.IS_CURRENT.isTrue()))
                .leftJoin(BOARD_COLUMN)
                .on(BOARD_COLUMN.BOARD_COLUMN_ID.eq(WORK_ITEM.BOARD_COLUMN_ID))
                .where(where)
                .orderBy(order, ascending ? WORK_ITEM.WORK_ITEM_ID.asc() : WORK_ITEM.WORK_ITEM_ID.desc())
                .limit(limit)
                .fetch();
        var ids = records.stream().map(r -> r.get(WORK_ITEM.WORK_ITEM_ID)).collect(Collectors.toSet());
        var labels = labels(ids);
        var people = people(ids);
        return records.stream()
                .map(r -> row(r, r.get(BOARD_COLUMN.CATEGORY), labels, people))
                .toList();
    }

    private Row row(Record r, String category, Map<String, Set<String>> labels, Map<String, List<Person>> people) {
        String id = r.get(WORK_ITEM.WORK_ITEM_ID);
        var mine = people.getOrDefault(id, List.of());
        return new Row(
                id,
                r.get(WORK_ITEM.PROJECT_ID),
                referenceKey(r),
                r.get(WORK_ITEM.NUMBER),
                WorkItem.Kind.valueOf(r.get(WORK_ITEM.KIND)),
                r.get(WORK_ITEM.WORK_ITEM_TYPE_ID),
                details(r, mine.stream().map(Person::id).collect(Collectors.toSet())),
                labels.getOrDefault(id, Set.of()),
                r.get(WORK_ITEM.BOARD_COLUMN_ID),
                r.get(WORK_ITEM.PROJECT_ID) == null ? r.get(WORK_ITEM.WORKSPACE_STATUS) : category,
                r.get(WORK_ITEM.POSITION).doubleValue(),
                r.get(WORK_ITEM.CLOSED_AT),
                r.get(WORK_ITEM.ARCHIVED_AT),
                r.get(WORK_ITEM.RECURRENCE_ID),
                r.get(WORK_ITEM.OCCURRENCE_ON),
                r.get(WORK_ITEM.REMINDER_MINUTES),
                r.get(WORK_ITEM.VERSION),
                AuditRecords.read(r),
                mine);
    }

    @Override
    public void save(WorkItem w) {
        var r = dslContext.newRecord(WORK_ITEM);
        var d = w.details();
        r.setWorkItemId(w.id());
        r.setProjectId(w.projectId());
        r.setWorkspaceId(
                w.workspaceId() == null
                        ? dslContext
                                .select(PROJECT.WORKSPACE_ID)
                                .from(PROJECT)
                                .where(PROJECT.PROJECT_ID.eq(w.projectId()))
                                .fetchOne(PROJECT.WORKSPACE_ID)
                        : w.workspaceId());
        r.setPublicRef(w.publicRef());
        r.setWorkspaceStatus(w.workspaceStatus());
        r.setNumber(w.number());
        r.setKind(w.kind().name());
        r.setWorkItemTypeId(w.typeId());
        r.setTitle(d.title());
        r.setDescription(d.description());
        r.setBoardColumnId(w.columnId());
        r.setPosition(w.position());
        r.setPriority(d.priority() == null ? null : d.priority().name());
        r.setTriggerType(d.triggerType() == null ? null : d.triggerType().name());
        r.setStartDate(d.startDate());
        r.setDueDate(d.dueDate());
        r.setStartsAt(d.startsAt());
        r.setEndsAt(d.endsAt());
        r.setAllDay(d.allDay());
        r.setClosedAt(w.closedAt());
        r.setArchivedAt(w.archivedAt());
        r.setRecurrenceId(w.recurrenceId());
        r.setOccurrenceOn(w.occurrenceOn());
        r.setReminderMinutes(w.reminderMinutes());
        r.setVersion(w.version());
        AuditRecords.write(r, w.audit());
        dslContext
                .insertInto(WORK_ITEM)
                .set(r)
                .onConflict(WORK_ITEM.WORK_ITEM_ID)
                .doUpdate()
                .set(r)
                .execute();
        saveLabels(w);
        savePeople(w);
    }

    /** As the labels: people no longer on the item go, new ones come as its latest editor's, kept ones stay. */
    private void savePeople(WorkItem w) {
        var people = w.details().peopleIds();
        dslContext
                .deleteFrom(WORK_ITEM_PERSON)
                .where(WORK_ITEM_PERSON.WORK_ITEM_ID.eq(w.id()))
                .and(people.isEmpty() ? DSL.noCondition() : WORK_ITEM_PERSON.IAM_USER_ID.notIn(people))
                .execute();
        if (people.isEmpty()) return;
        var insert = dslContext.insertInto(
                WORK_ITEM_PERSON,
                WORK_ITEM_PERSON.WORK_ITEM_PERSON_ID,
                WORK_ITEM_PERSON.WORK_ITEM_ID,
                WORK_ITEM_PERSON.IAM_USER_ID,
                WORK_ITEM_PERSON.CREATED_AT,
                WORK_ITEM_PERSON.CREATED_BY,
                WORK_ITEM_PERSON.CREATED_BY_AGENT);
        var a = w.audit();
        for (String person : people)
            insert = insert.values(Ids.newId(), w.id(), person, a.updatedAt(), a.updatedBy(), a.updatedByAgent());
        insert.onConflictDoNothing().execute();
    }

    /** Removes links no longer in the set and adds new ones as the item's latest editor; kept links stay as they are. */
    private void saveLabels(WorkItem w) {
        dslContext
                .deleteFrom(WORK_ITEM_LABEL)
                .where(WORK_ITEM_LABEL.WORK_ITEM_ID.eq(w.id()))
                .and(w.labelIds().isEmpty() ? DSL.noCondition() : WORK_ITEM_LABEL.LABEL_ID.notIn(w.labelIds()))
                .execute();
        if (w.labelIds().isEmpty()) return;
        var insert = dslContext.insertInto(
                WORK_ITEM_LABEL,
                WORK_ITEM_LABEL.WORK_ITEM_LABEL_ID,
                WORK_ITEM_LABEL.WORK_ITEM_ID,
                WORK_ITEM_LABEL.LABEL_ID,
                WORK_ITEM_LABEL.CREATED_AT,
                WORK_ITEM_LABEL.CREATED_BY,
                WORK_ITEM_LABEL.CREATED_BY_AGENT);
        var a = w.audit();
        for (String label : w.labelIds())
            insert = insert.values(Ids.newId(), w.id(), label, a.updatedAt(), a.updatedBy(), a.updatedByAgent());
        insert.onConflictDoNothing().execute();
    }

    private static Condition conditions(Query q) {
        Condition where = WORK_ITEM
                .WORKSPACE_ID
                .eq(q.workspaceId())
                .and(PROJECT.DELETED_AT.isNull())
                .and(q.deleted() ? WORK_ITEM.DELETED_AT.isNotNull() : WORK_ITEM.DELETED_AT.isNull());
        if (!q.deleted())
            where = where.and(q.archived() ? WORK_ITEM.ARCHIVED_AT.isNotNull() : WORK_ITEM.ARCHIVED_AT.isNull());
        if (q.projectId() != null) where = where.and(WORK_ITEM.PROJECT_ID.eq(q.projectId()));
        else where = where.and(PROJECT.ARCHIVED_AT.isNull());
        if (!q.projectIds().isEmpty()) where = where.and(WORK_ITEM.PROJECT_ID.in(q.projectIds()));
        if (q.personId() != null)
            where = where.and(DSL.exists(DSL.selectOne()
                    .from(WORK_ITEM_PERSON)
                    .where(WORK_ITEM_PERSON.WORK_ITEM_ID.eq(WORK_ITEM.WORK_ITEM_ID))
                    .and(WORK_ITEM_PERSON.IAM_USER_ID.eq(q.personId()))));
        if (!q.kinds().isEmpty())
            where = where.and(
                    WORK_ITEM.KIND.in(q.kinds().stream().map(Enum::name).toList()));
        if (q.backlog()) where = where.and(backlog());
        else if (q.columnId() != null) where = where.and(WORK_ITEM.BOARD_COLUMN_ID.eq(q.columnId()));
        if (!q.columnIds().isEmpty()) where = where.and(WORK_ITEM.BOARD_COLUMN_ID.in(q.columnIds()));
        if (!q.categories().isEmpty() || q.noCategory()) {
            Condition category = q.categories().isEmpty()
                    ? DSL.falseCondition()
                    : DSL.coalesce(WORK_ITEM.WORKSPACE_STATUS, BOARD_COLUMN.CATEGORY)
                            .in(q.categories());
            if (q.noCategory()) category = category.or(backlog());
            where = where.and(category);
        }
        if (!q.labelIds().isEmpty())
            where = where.and(DSL.exists(DSL.selectOne()
                    .from(WORK_ITEM_LABEL)
                    .join(LABEL)
                    .on(LABEL.LABEL_ID.eq(WORK_ITEM_LABEL.LABEL_ID))
                    .where(WORK_ITEM_LABEL.WORK_ITEM_ID.eq(WORK_ITEM.WORK_ITEM_ID))
                    .and(WORK_ITEM_LABEL.LABEL_ID.in(q.labelIds()))
                    .and(LABEL.WORKSPACE_ID.eq(q.workspaceId()))
                    .and(LABEL.DELETED_AT.isNull())));
        if (!q.typeIds().isEmpty()) where = where.and(WORK_ITEM.WORK_ITEM_TYPE_ID.in(q.typeIds()));
        if (!q.priorities().isEmpty())
            where = where.and(WORK_ITEM.PRIORITY.in(
                    q.priorities().stream().map(Enum::name).toList()));
        if (!q.triggers().isEmpty())
            where = where.and(WORK_ITEM.TRIGGER_TYPE.in(
                    q.triggers().stream().map(Enum::name).toList()));
        if (!q.search().isEmpty()) where = where.and(WORK_ITEM.TITLE.containsIgnoreCase(q.search()));
        if (q.closed() != null)
            where = where.and(q.closed() ? WORK_ITEM.CLOSED_AT.isNotNull() : WORK_ITEM.CLOSED_AT.isNull());
        Condition dated = WORK_ITEM
                .START_DATE
                .isNotNull()
                .or(WORK_ITEM.DUE_DATE.isNotNull())
                .or(WORK_ITEM.STARTS_AT.isNotNull());
        if (q.hasDates() != null) where = where.and(q.hasDates() ? dated : DSL.not(dated));
        // An item spans start..due; with only one of them it is that single day. from/to keep items overlapping it.
        // A timed event spans startsAt..endsAt (or its start alone); the days asked for are the member's, so its
        // times are kept when they come within a day of them, and the screen places it on its own days.
        Condition timed = WORK_ITEM.STARTS_AT.isNotNull();
        if (q.from() != null)
            where = where.and(DSL.when(
                            timed,
                            DSL.coalesce(WORK_ITEM.ENDS_AT, WORK_ITEM.STARTS_AT)
                                    .ge(q.from().minusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)))
                    .otherwise(DSL.coalesce(WORK_ITEM.DUE_DATE, WORK_ITEM.START_DATE)
                            .ge(q.from()))
                    .isTrue());
        if (q.to() != null)
            where = where.and(DSL.when(
                            timed,
                            WORK_ITEM.STARTS_AT.lt(
                                    q.to().plusDays(2).atStartOfDay().toInstant(ZoneOffset.UTC)))
                    .otherwise(DSL.coalesce(WORK_ITEM.START_DATE, WORK_ITEM.DUE_DATE)
                            .le(q.to()))
                    .isTrue());
        return where;
    }

    @Override
    public List<ColumnCount> countByColumn(Query q) {
        var count = DSL.count().cast(Long.class).as("item_count");
        return dslContext
                .select(WORK_ITEM.BOARD_COLUMN_ID, count)
                .from(WORK_ITEM)
                .leftJoin(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .leftJoin(BOARD_COLUMN)
                .on(BOARD_COLUMN.BOARD_COLUMN_ID.eq(WORK_ITEM.BOARD_COLUMN_ID))
                .where(conditions(q))
                .and(WORK_ITEM.KIND.eq(WorkItem.Kind.task.name()))
                .groupBy(WORK_ITEM.BOARD_COLUMN_ID)
                .fetch(r -> new ColumnCount(r.get(WORK_ITEM.BOARD_COLUMN_ID), r.get(count)));
    }

    /** Tasks without a status (D-092): an event has no column either, but it is not waiting in the backlog. */
    private static Condition backlog() {
        return WORK_ITEM
                .BOARD_COLUMN_ID
                .isNull()
                .and(WORK_ITEM.WORKSPACE_STATUS.isNull())
                .and(WORK_ITEM.KIND.eq(WorkItem.Kind.task.name()));
    }

    private Optional<WorkItem> single(List<? extends Record> records) {
        return items(records).stream().findFirst();
    }

    private List<WorkItem> items(List<? extends Record> records) {
        var ids = records.stream().map(r -> r.get(WORK_ITEM.WORK_ITEM_ID)).collect(Collectors.toSet());
        var labels = labels(ids);
        var people = people(ids);
        return records.stream()
                .map(r -> item(
                        r,
                        labels.getOrDefault(r.get(WORK_ITEM.WORK_ITEM_ID), Set.of()),
                        people.getOrDefault(r.get(WORK_ITEM.WORK_ITEM_ID), List.of()).stream()
                                .map(Person::id)
                                .collect(Collectors.toSet())))
                .toList();
    }

    /** One query for the people of every item read together, each item's by name. */
    private Map<String, List<Person>> people(Set<String> workItemIds) {
        if (workItemIds.isEmpty()) return Map.of();
        Map<String, List<Person>> people = new HashMap<>();
        dslContext
                .select(WORK_ITEM_PERSON.WORK_ITEM_ID, IAM_USER.IAM_USER_ID, IAM_USER.NAME)
                .from(WORK_ITEM_PERSON)
                .join(IAM_USER)
                .on(IAM_USER.IAM_USER_ID.eq(WORK_ITEM_PERSON.IAM_USER_ID))
                .where(WORK_ITEM_PERSON.WORK_ITEM_ID.in(workItemIds))
                .orderBy(IAM_USER.NAME, IAM_USER.IAM_USER_ID)
                .forEach(r -> people.computeIfAbsent(r.value1(), id -> new ArrayList<>())
                        .add(new Person(r.value2(), r.value3())));
        return people;
    }

    /** One query for the label links of every item read together. */
    private Map<String, Set<String>> labels(Set<String> workItemIds) {
        if (workItemIds.isEmpty()) return Map.of();
        Map<String, Set<String>> labels = new HashMap<>();
        dslContext
                .select(WORK_ITEM_LABEL.WORK_ITEM_ID, WORK_ITEM_LABEL.LABEL_ID)
                .from(WORK_ITEM_LABEL)
                .where(WORK_ITEM_LABEL.WORK_ITEM_ID.in(workItemIds))
                .forEach(r -> labels.computeIfAbsent(r.value1(), id -> new HashSet<>())
                        .add(r.value2()));
        return labels;
    }

    private WorkItem item(Record r, Set<String> labelIds, Set<String> peopleIds) {
        return WorkItem.fromPersistence(
                        r.get(WORK_ITEM.WORK_ITEM_ID),
                        r.get(WORK_ITEM.PROJECT_ID),
                        r.get(WORK_ITEM.NUMBER),
                        WorkItem.Kind.valueOf(r.get(WORK_ITEM.KIND)),
                        details(r, peopleIds),
                        labelIds,
                        r.get(WORK_ITEM.BOARD_COLUMN_ID),
                        r.get(WORK_ITEM.POSITION).doubleValue(),
                        r.get(WORK_ITEM.CLOSED_AT),
                        r.get(WORK_ITEM.ARCHIVED_AT),
                        r.get(WORK_ITEM.RECURRENCE_ID),
                        r.get(WORK_ITEM.OCCURRENCE_ON),
                        r.get(WORK_ITEM.REMINDER_MINUTES),
                        r.get(WORK_ITEM.VERSION),
                        AuditRecords.read(r))
                .locate(r.get(WORK_ITEM.WORKSPACE_ID), r.get(WORK_ITEM.PUBLIC_REF), r.get(WORK_ITEM.WORKSPACE_STATUS))
                .typed(r.get(WORK_ITEM.WORK_ITEM_TYPE_ID));
    }

    private WorkItem.Details details(Record r, Set<String> peopleIds) {
        String priority = r.get(WORK_ITEM.PRIORITY);
        String trigger = r.get(WORK_ITEM.TRIGGER_TYPE);
        return new WorkItem.Details(
                r.get(WORK_ITEM.TITLE),
                r.get(WORK_ITEM.DESCRIPTION),
                priority == null ? null : WorkItem.Priority.valueOf(priority),
                trigger == null ? null : WorkItem.TriggerType.valueOf(trigger),
                peopleIds,
                r.get(WORK_ITEM.START_DATE),
                r.get(WORK_ITEM.DUE_DATE),
                r.get(WORK_ITEM.STARTS_AT),
                r.get(WORK_ITEM.ENDS_AT),
                Boolean.TRUE.equals(r.get(WORK_ITEM.ALL_DAY)));
    }
}
