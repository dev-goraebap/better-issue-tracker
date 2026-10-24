package io.github.goraebap.bit.module.workitem.infrastructure;

import static io.github.goraebap.bit.jooq.tables.BoardColumn.BOARD_COLUMN;
import static io.github.goraebap.bit.jooq.tables.IamUser.IAM_USER;
import static io.github.goraebap.bit.jooq.tables.Label.LABEL;
import static io.github.goraebap.bit.jooq.tables.Project.PROJECT;
import static io.github.goraebap.bit.jooq.tables.ProjectKey.PROJECT_KEY;
import static io.github.goraebap.bit.jooq.tables.WorkItem.WORK_ITEM;
import static io.github.goraebap.bit.jooq.tables.WorkItemLabel.WORK_ITEM_LABEL;

import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
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

    @Override
    public long countAllById(UUID projectId, Set<UUID> ids) {
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
    public Optional<WorkItem> findById(UUID projectId, UUID id, boolean includeDeleted) {
        return single(dslContext
                .selectFrom(WORK_ITEM)
                .where(WORK_ITEM.PROJECT_ID.eq(projectId))
                .and(WORK_ITEM.WORK_ITEM_ID.eq(id))
                .and(includeDeleted ? DSL.noCondition() : WORK_ITEM.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public Optional<WorkItem> findTarget(UUID workspaceId, UUID id) {
        return single(dslContext
                .select(WORK_ITEM.fields())
                .from(WORK_ITEM)
                .join(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .where(PROJECT.WORKSPACE_ID.eq(workspaceId))
                .and(PROJECT.DELETED_AT.isNull())
                .and(WORK_ITEM.WORK_ITEM_ID.eq(id))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public Optional<WorkItem> findByNumber(UUID projectId, long number) {
        return single(dslContext
                .selectFrom(WORK_ITEM)
                .where(WORK_ITEM.PROJECT_ID.eq(projectId))
                .and(WORK_ITEM.NUMBER.eq(number))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public List<WorkItem> findColumnItems(UUID projectId, UUID columnId, boolean includeDeleted) {
        return items(dslContext
                .selectFrom(WORK_ITEM)
                .where(WORK_ITEM.PROJECT_ID.eq(projectId))
                .and(columnId == null ? WORK_ITEM.BOARD_COLUMN_ID.isNull() : WORK_ITEM.BOARD_COLUMN_ID.eq(columnId))
                .and(includeDeleted ? DSL.noCondition() : WORK_ITEM.DELETED_AT.isNull())
                .orderBy(WORK_ITEM.POSITION, WORK_ITEM.WORK_ITEM_ID)
                .fetch());
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
                .select(PROJECT_KEY.KEY, IAM_USER.NAME.as("assignee_name"), BOARD_COLUMN.CATEGORY)
                .from(WORK_ITEM)
                .join(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .join(PROJECT_KEY)
                .on(PROJECT_KEY.PROJECT_ID.eq(PROJECT.PROJECT_ID).and(PROJECT_KEY.IS_CURRENT.isTrue()))
                .leftJoin(IAM_USER)
                .on(IAM_USER.IAM_USER_ID.eq(WORK_ITEM.ASSIGNEE_ID))
                .leftJoin(BOARD_COLUMN)
                .on(BOARD_COLUMN.BOARD_COLUMN_ID.eq(WORK_ITEM.BOARD_COLUMN_ID))
                .where(where)
                .orderBy(order, ascending ? WORK_ITEM.WORK_ITEM_ID.asc() : WORK_ITEM.WORK_ITEM_ID.desc())
                .limit(limit)
                .fetch();
        var labels =
                labels(records.stream().map(r -> r.get(WORK_ITEM.WORK_ITEM_ID)).collect(Collectors.toSet()));
        return records.stream()
                .map(r -> new Row(
                        r.get(WORK_ITEM.WORK_ITEM_ID),
                        r.get(WORK_ITEM.PROJECT_ID),
                        r.get(PROJECT_KEY.KEY),
                        r.get(WORK_ITEM.NUMBER),
                        details(r),
                        labels.getOrDefault(r.get(WORK_ITEM.WORK_ITEM_ID), Set.of()),
                        r.get(WORK_ITEM.BOARD_COLUMN_ID),
                        r.get(BOARD_COLUMN.CATEGORY),
                        r.get(WORK_ITEM.POSITION).doubleValue(),
                        r.get(WORK_ITEM.CLOSED_AT),
                        r.get(WORK_ITEM.ARCHIVED_AT),
                        r.get(WORK_ITEM.VERSION),
                        AuditRecords.read(r),
                        r.get("assignee_name", String.class)))
                .toList();
    }

    @Override
    public void save(WorkItem w) {
        var r = dslContext.newRecord(WORK_ITEM);
        var d = w.details();
        r.setWorkItemId(w.id());
        r.setProjectId(w.projectId());
        r.setNumber(w.number());
        r.setTitle(d.title());
        r.setDescription(d.description());
        r.setBoardColumnId(w.columnId());
        r.setPosition(w.position());
        r.setPriority(d.priority() == null ? null : d.priority().name());
        r.setTriggerType(d.triggerType() == null ? null : d.triggerType().name());
        r.setAssigneeId(d.assigneeId());
        r.setStartDate(d.startDate());
        r.setDueDate(d.dueDate());
        r.setClosedAt(w.closedAt());
        r.setArchivedAt(w.archivedAt());
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
        for (UUID label : w.labelIds())
            insert = insert.values(UUID.randomUUID(), w.id(), label, a.updatedAt(), a.updatedBy(), a.updatedByAgent());
        insert.onConflictDoNothing().execute();
    }

    private static Condition conditions(Query q) {
        Condition where = PROJECT.WORKSPACE_ID
                .eq(q.workspaceId())
                .and(PROJECT.DELETED_AT.isNull())
                .and(q.deleted() ? WORK_ITEM.DELETED_AT.isNotNull() : WORK_ITEM.DELETED_AT.isNull());
        if (!q.deleted())
            where = where.and(q.archived() ? WORK_ITEM.ARCHIVED_AT.isNotNull() : WORK_ITEM.ARCHIVED_AT.isNull());
        if (q.projectId() != null) where = where.and(WORK_ITEM.PROJECT_ID.eq(q.projectId()));
        else where = where.and(PROJECT.ARCHIVED_AT.isNull());
        if (!q.projectIds().isEmpty()) where = where.and(WORK_ITEM.PROJECT_ID.in(q.projectIds()));
        if (q.assigneeId() != null) where = where.and(WORK_ITEM.ASSIGNEE_ID.eq(q.assigneeId()));
        if (q.backlog()) where = where.and(WORK_ITEM.BOARD_COLUMN_ID.isNull());
        else if (q.columnId() != null) where = where.and(WORK_ITEM.BOARD_COLUMN_ID.eq(q.columnId()));
        if (!q.columnIds().isEmpty()) where = where.and(WORK_ITEM.BOARD_COLUMN_ID.in(q.columnIds()));
        if (!q.categories().isEmpty() || q.noCategory()) {
            Condition category =
                    q.categories().isEmpty() ? DSL.falseCondition() : BOARD_COLUMN.CATEGORY.in(q.categories());
            if (q.noCategory()) category = category.or(WORK_ITEM.BOARD_COLUMN_ID.isNull());
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
        if (!q.priorities().isEmpty())
            where = where.and(WORK_ITEM.PRIORITY.in(
                    q.priorities().stream().map(Enum::name).toList()));
        if (!q.triggers().isEmpty())
            where = where.and(WORK_ITEM.TRIGGER_TYPE.in(
                    q.triggers().stream().map(Enum::name).toList()));
        if (!q.search().isEmpty()) where = where.and(WORK_ITEM.TITLE.containsIgnoreCase(q.search()));
        if (q.closed() != null)
            where = where.and(q.closed() ? WORK_ITEM.CLOSED_AT.isNotNull() : WORK_ITEM.CLOSED_AT.isNull());
        Condition dated = WORK_ITEM.START_DATE.isNotNull().or(WORK_ITEM.DUE_DATE.isNotNull());
        if (q.hasDates() != null) where = where.and(q.hasDates() ? dated : DSL.not(dated));
        // An item spans start..due; with only one of them it is that single day. from/to keep items overlapping it.
        if (q.from() != null)
            where = where.and(
                    DSL.coalesce(WORK_ITEM.DUE_DATE, WORK_ITEM.START_DATE).ge(q.from()));
        if (q.to() != null)
            where = where.and(
                    DSL.coalesce(WORK_ITEM.START_DATE, WORK_ITEM.DUE_DATE).le(q.to()));
        return where;
    }

    @Override
    public List<ColumnCount> countByColumn(Query q) {
        var count = DSL.count().cast(Long.class).as("item_count");
        return dslContext
                .select(WORK_ITEM.BOARD_COLUMN_ID, count)
                .from(WORK_ITEM)
                .join(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(WORK_ITEM.PROJECT_ID))
                .leftJoin(BOARD_COLUMN)
                .on(BOARD_COLUMN.BOARD_COLUMN_ID.eq(WORK_ITEM.BOARD_COLUMN_ID))
                .where(conditions(q))
                .groupBy(WORK_ITEM.BOARD_COLUMN_ID)
                .fetch(r -> new ColumnCount(r.get(WORK_ITEM.BOARD_COLUMN_ID), r.get(count)));
    }

    private Optional<WorkItem> single(List<? extends Record> records) {
        return items(records).stream().findFirst();
    }

    private List<WorkItem> items(List<? extends Record> records) {
        var labels =
                labels(records.stream().map(r -> r.get(WORK_ITEM.WORK_ITEM_ID)).collect(Collectors.toSet()));
        return records.stream()
                .map(r -> item(r, labels.getOrDefault(r.get(WORK_ITEM.WORK_ITEM_ID), Set.of())))
                .toList();
    }

    /** One query for the label links of every item read together. */
    private Map<UUID, Set<UUID>> labels(Set<UUID> workItemIds) {
        if (workItemIds.isEmpty()) return Map.of();
        Map<UUID, Set<UUID>> labels = new HashMap<>();
        dslContext
                .select(WORK_ITEM_LABEL.WORK_ITEM_ID, WORK_ITEM_LABEL.LABEL_ID)
                .from(WORK_ITEM_LABEL)
                .where(WORK_ITEM_LABEL.WORK_ITEM_ID.in(workItemIds))
                .forEach(r -> labels.computeIfAbsent(r.value1(), id -> new HashSet<>())
                        .add(r.value2()));
        return labels;
    }

    private WorkItem item(Record r, Set<UUID> labelIds) {
        return WorkItem.fromPersistence(
                r.get(WORK_ITEM.WORK_ITEM_ID),
                r.get(WORK_ITEM.PROJECT_ID),
                r.get(WORK_ITEM.NUMBER),
                details(r),
                labelIds,
                r.get(WORK_ITEM.BOARD_COLUMN_ID),
                r.get(WORK_ITEM.POSITION).doubleValue(),
                r.get(WORK_ITEM.CLOSED_AT),
                r.get(WORK_ITEM.ARCHIVED_AT),
                r.get(WORK_ITEM.VERSION),
                AuditRecords.read(r));
    }

    private WorkItem.Details details(Record r) {
        String priority = r.get(WORK_ITEM.PRIORITY);
        String trigger = r.get(WORK_ITEM.TRIGGER_TYPE);
        return new WorkItem.Details(
                r.get(WORK_ITEM.TITLE),
                r.get(WORK_ITEM.DESCRIPTION),
                priority == null ? null : WorkItem.Priority.valueOf(priority),
                trigger == null ? null : WorkItem.TriggerType.valueOf(trigger),
                r.get(WORK_ITEM.ASSIGNEE_ID),
                r.get(WORK_ITEM.START_DATE),
                r.get(WORK_ITEM.DUE_DATE));
    }
}
