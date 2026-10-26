package io.github.goraebap.bit.module.issue.infrastructure;

import static io.github.goraebap.bit.jooq.tables.BoardColumn.BOARD_COLUMN;
import static io.github.goraebap.bit.jooq.tables.IamUser.IAM_USER;
import static io.github.goraebap.bit.jooq.tables.Issue.ISSUE;
import static io.github.goraebap.bit.jooq.tables.IssueLabel.ISSUE_LABEL;
import static io.github.goraebap.bit.jooq.tables.Label.LABEL;
import static io.github.goraebap.bit.jooq.tables.Project.PROJECT;
import static io.github.goraebap.bit.jooq.tables.ProjectKey.PROJECT_KEY;

import io.github.goraebap.bit.module.issue.domain.Issue;
import io.github.goraebap.bit.module.issue.domain.IssueRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
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
class JooqIssueRepository implements IssueRepository {
    private final DSLContext dslContext;

    @Override
    public long countAllById(String projectId, Set<String> ids) {
        if (ids.isEmpty()) return 0;
        return dslContext.fetchCount(
                ISSUE,
                ISSUE.PROJECT_ID.eq(projectId).and(ISSUE.ISSUE_ID.in(ids)).and(ISSUE.DELETED_AT.isNull()));
    }

    @Override
    public Optional<Issue> findById(String projectId, String id, boolean includeDeleted) {
        return single(dslContext
                .selectFrom(ISSUE)
                .where(ISSUE.PROJECT_ID.eq(projectId))
                .and(ISSUE.ISSUE_ID.eq(id))
                .and(includeDeleted ? DSL.noCondition() : ISSUE.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public Optional<Issue> findTarget(String workspaceId, String id) {
        return single(dslContext
                .select(ISSUE.fields())
                .from(ISSUE)
                .join(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(ISSUE.PROJECT_ID))
                .where(PROJECT.WORKSPACE_ID.eq(workspaceId))
                .and(PROJECT.DELETED_AT.isNull())
                .and(ISSUE.ISSUE_ID.eq(id))
                .and(ISSUE.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public Optional<Issue> findByNumber(String projectId, long number) {
        return single(dslContext
                .selectFrom(ISSUE)
                .where(ISSUE.PROJECT_ID.eq(projectId))
                .and(ISSUE.NUMBER.eq(number))
                .and(ISSUE.DELETED_AT.isNull())
                .fetch());
    }

    @Override
    public List<Issue> findColumnItems(String projectId, String columnId, boolean includeDeleted) {
        return items(dslContext
                .selectFrom(ISSUE)
                .where(ISSUE.PROJECT_ID.eq(projectId))
                .and(columnId == null ? ISSUE.BOARD_COLUMN_ID.isNull() : ISSUE.BOARD_COLUMN_ID.eq(columnId))
                .and(includeDeleted ? DSL.noCondition() : ISSUE.DELETED_AT.isNull())
                .orderBy(ISSUE.POSITION, ISSUE.ISSUE_ID)
                .fetch());
    }

    @Override
    public List<Row> findAll(Query q, Point p, int limit) {
        Condition where = conditions(q);
        boolean position = q.sort().equals("position");
        boolean ascending = q.direction().equals("ASC");
        if (p.id() != null) {
            Condition seek = position
                    ? (ascending ? ISSUE.POSITION.gt(p.position()) : ISSUE.POSITION.lt(p.position()))
                    : (ascending ? ISSUE.CREATED_AT.gt(p.time()) : ISSUE.CREATED_AT.lt(p.time()));
            Condition equal = position ? ISSUE.POSITION.eq(p.position()) : ISSUE.CREATED_AT.eq(p.time());
            where = where.and(seek.or(equal.and(ascending ? ISSUE.ISSUE_ID.gt(p.id()) : ISSUE.ISSUE_ID.lt(p.id()))));
        }
        var order = position
                ? (ascending ? ISSUE.POSITION.asc() : ISSUE.POSITION.desc())
                : (ascending ? ISSUE.CREATED_AT.asc() : ISSUE.CREATED_AT.desc());
        // board_column is a to-one join by primary key: the category filter needs it, so its value is read here too.
        var records = dslContext
                .select(ISSUE.fields())
                .select(PROJECT_KEY.KEY, IAM_USER.NAME.as("assignee_name"), BOARD_COLUMN.CATEGORY)
                .from(ISSUE)
                .join(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(ISSUE.PROJECT_ID))
                .join(PROJECT_KEY)
                .on(PROJECT_KEY.PROJECT_ID.eq(PROJECT.PROJECT_ID).and(PROJECT_KEY.IS_CURRENT.isTrue()))
                .leftJoin(IAM_USER)
                .on(IAM_USER.IAM_USER_ID.eq(ISSUE.ASSIGNEE_ID))
                .leftJoin(BOARD_COLUMN)
                .on(BOARD_COLUMN.BOARD_COLUMN_ID.eq(ISSUE.BOARD_COLUMN_ID))
                .where(where)
                .orderBy(order, ascending ? ISSUE.ISSUE_ID.asc() : ISSUE.ISSUE_ID.desc())
                .limit(limit)
                .fetch();
        var labels = labels(records.stream().map(r -> r.get(ISSUE.ISSUE_ID)).collect(Collectors.toSet()));
        return records.stream()
                .map(r -> new Row(
                        r.get(ISSUE.ISSUE_ID),
                        r.get(ISSUE.PROJECT_ID),
                        r.get(PROJECT_KEY.KEY),
                        r.get(ISSUE.NUMBER),
                        details(r),
                        labels.getOrDefault(r.get(ISSUE.ISSUE_ID), Set.of()),
                        r.get(ISSUE.BOARD_COLUMN_ID),
                        r.get(BOARD_COLUMN.CATEGORY),
                        r.get(ISSUE.POSITION).doubleValue(),
                        r.get(ISSUE.CLOSED_AT),
                        r.get(ISSUE.ARCHIVED_AT),
                        r.get(ISSUE.VERSION),
                        AuditRecords.read(r),
                        r.get("assignee_name", String.class)))
                .toList();
    }

    @Override
    public void save(Issue w) {
        var r = dslContext.newRecord(ISSUE);
        var d = w.details();
        r.setIssueId(w.id());
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
                .insertInto(ISSUE)
                .set(r)
                .onConflict(ISSUE.ISSUE_ID)
                .doUpdate()
                .set(r)
                .execute();
        saveLabels(w);
    }

    /** Removes links no longer in the set and adds new ones as the item's latest editor; kept links stay as they are. */
    private void saveLabels(Issue w) {
        dslContext
                .deleteFrom(ISSUE_LABEL)
                .where(ISSUE_LABEL.ISSUE_ID.eq(w.id()))
                .and(w.labelIds().isEmpty() ? DSL.noCondition() : ISSUE_LABEL.LABEL_ID.notIn(w.labelIds()))
                .execute();
        if (w.labelIds().isEmpty()) return;
        var insert = dslContext.insertInto(
                ISSUE_LABEL,
                ISSUE_LABEL.ISSUE_LABEL_ID,
                ISSUE_LABEL.ISSUE_ID,
                ISSUE_LABEL.LABEL_ID,
                ISSUE_LABEL.CREATED_AT,
                ISSUE_LABEL.CREATED_BY,
                ISSUE_LABEL.CREATED_BY_AGENT);
        var a = w.audit();
        for (String label : w.labelIds())
            insert = insert.values(Ids.newId(), w.id(), label, a.updatedAt(), a.updatedBy(), a.updatedByAgent());
        insert.onConflictDoNothing().execute();
    }

    private static Condition conditions(Query q) {
        Condition where = PROJECT.WORKSPACE_ID
                .eq(q.workspaceId())
                .and(PROJECT.DELETED_AT.isNull())
                .and(q.deleted() ? ISSUE.DELETED_AT.isNotNull() : ISSUE.DELETED_AT.isNull());
        if (!q.deleted()) where = where.and(q.archived() ? ISSUE.ARCHIVED_AT.isNotNull() : ISSUE.ARCHIVED_AT.isNull());
        if (q.projectId() != null) where = where.and(ISSUE.PROJECT_ID.eq(q.projectId()));
        else where = where.and(PROJECT.ARCHIVED_AT.isNull());
        if (!q.projectIds().isEmpty()) where = where.and(ISSUE.PROJECT_ID.in(q.projectIds()));
        if (q.assigneeId() != null) where = where.and(ISSUE.ASSIGNEE_ID.eq(q.assigneeId()));
        if (q.backlog()) where = where.and(ISSUE.BOARD_COLUMN_ID.isNull());
        else if (q.columnId() != null) where = where.and(ISSUE.BOARD_COLUMN_ID.eq(q.columnId()));
        if (!q.columnIds().isEmpty()) where = where.and(ISSUE.BOARD_COLUMN_ID.in(q.columnIds()));
        if (!q.categories().isEmpty() || q.noCategory()) {
            Condition category =
                    q.categories().isEmpty() ? DSL.falseCondition() : BOARD_COLUMN.CATEGORY.in(q.categories());
            if (q.noCategory()) category = category.or(ISSUE.BOARD_COLUMN_ID.isNull());
            where = where.and(category);
        }
        if (!q.labelIds().isEmpty())
            where = where.and(DSL.exists(DSL.selectOne()
                    .from(ISSUE_LABEL)
                    .join(LABEL)
                    .on(LABEL.LABEL_ID.eq(ISSUE_LABEL.LABEL_ID))
                    .where(ISSUE_LABEL.ISSUE_ID.eq(ISSUE.ISSUE_ID))
                    .and(ISSUE_LABEL.LABEL_ID.in(q.labelIds()))
                    .and(LABEL.WORKSPACE_ID.eq(q.workspaceId()))
                    .and(LABEL.DELETED_AT.isNull())));
        if (!q.priorities().isEmpty())
            where = where.and(
                    ISSUE.PRIORITY.in(q.priorities().stream().map(Enum::name).toList()));
        if (!q.triggers().isEmpty())
            where = where.and(
                    ISSUE.TRIGGER_TYPE.in(q.triggers().stream().map(Enum::name).toList()));
        if (!q.search().isEmpty()) where = where.and(ISSUE.TITLE.containsIgnoreCase(q.search()));
        if (q.closed() != null) where = where.and(q.closed() ? ISSUE.CLOSED_AT.isNotNull() : ISSUE.CLOSED_AT.isNull());
        Condition dated = ISSUE.START_DATE.isNotNull().or(ISSUE.DUE_DATE.isNotNull());
        if (q.hasDates() != null) where = where.and(q.hasDates() ? dated : DSL.not(dated));
        // An item spans start..due; with only one of them it is that single day. from/to keep items overlapping it.
        if (q.from() != null)
            where = where.and(DSL.coalesce(ISSUE.DUE_DATE, ISSUE.START_DATE).ge(q.from()));
        if (q.to() != null)
            where = where.and(DSL.coalesce(ISSUE.START_DATE, ISSUE.DUE_DATE).le(q.to()));
        return where;
    }

    @Override
    public List<ColumnCount> countByColumn(Query q) {
        var count = DSL.count().cast(Long.class).as("item_count");
        return dslContext
                .select(ISSUE.BOARD_COLUMN_ID, count)
                .from(ISSUE)
                .join(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(ISSUE.PROJECT_ID))
                .leftJoin(BOARD_COLUMN)
                .on(BOARD_COLUMN.BOARD_COLUMN_ID.eq(ISSUE.BOARD_COLUMN_ID))
                .where(conditions(q))
                .groupBy(ISSUE.BOARD_COLUMN_ID)
                .fetch(r -> new ColumnCount(r.get(ISSUE.BOARD_COLUMN_ID), r.get(count)));
    }

    private Optional<Issue> single(List<? extends Record> records) {
        return items(records).stream().findFirst();
    }

    private List<Issue> items(List<? extends Record> records) {
        var labels = labels(records.stream().map(r -> r.get(ISSUE.ISSUE_ID)).collect(Collectors.toSet()));
        return records.stream()
                .map(r -> item(r, labels.getOrDefault(r.get(ISSUE.ISSUE_ID), Set.of())))
                .toList();
    }

    /** One query for the label links of every item read together. */
    private Map<String, Set<String>> labels(Set<String> issueIds) {
        if (issueIds.isEmpty()) return Map.of();
        Map<String, Set<String>> labels = new HashMap<>();
        dslContext
                .select(ISSUE_LABEL.ISSUE_ID, ISSUE_LABEL.LABEL_ID)
                .from(ISSUE_LABEL)
                .where(ISSUE_LABEL.ISSUE_ID.in(issueIds))
                .forEach(r -> labels.computeIfAbsent(r.value1(), id -> new HashSet<>())
                        .add(r.value2()));
        return labels;
    }

    private Issue item(Record r, Set<String> labelIds) {
        return Issue.fromPersistence(
                r.get(ISSUE.ISSUE_ID),
                r.get(ISSUE.PROJECT_ID),
                r.get(ISSUE.NUMBER),
                details(r),
                labelIds,
                r.get(ISSUE.BOARD_COLUMN_ID),
                r.get(ISSUE.POSITION).doubleValue(),
                r.get(ISSUE.CLOSED_AT),
                r.get(ISSUE.ARCHIVED_AT),
                r.get(ISSUE.VERSION),
                AuditRecords.read(r));
    }

    private Issue.Details details(Record r) {
        String priority = r.get(ISSUE.PRIORITY);
        String trigger = r.get(ISSUE.TRIGGER_TYPE);
        return new Issue.Details(
                r.get(ISSUE.TITLE),
                r.get(ISSUE.DESCRIPTION),
                priority == null ? null : Issue.Priority.valueOf(priority),
                trigger == null ? null : Issue.TriggerType.valueOf(trigger),
                r.get(ISSUE.ASSIGNEE_ID),
                r.get(ISSUE.START_DATE),
                r.get(ISSUE.DUE_DATE));
    }
}
