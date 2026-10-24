package io.github.goraebap.bit.module.project.infrastructure;

import static io.github.goraebap.bit.jooq.tables.BoardColumn.BOARD_COLUMN;
import static io.github.goraebap.bit.jooq.tables.Project.PROJECT;
import static io.github.goraebap.bit.jooq.tables.ProjectKey.PROJECT_KEY;

import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.project.domain.BoardColumn;
import io.github.goraebap.bit.module.project.domain.Project;
import io.github.goraebap.bit.module.project.domain.ProjectKey;
import io.github.goraebap.bit.module.project.domain.ProjectRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqProjectRepository implements ProjectRepository {
    private final DSLContext dslContext;

    @Override
    public Optional<Project> findById(UUID workspaceId, UUID projectId, boolean includeDeleted) {
        return dslContext
                .selectFrom(PROJECT)
                .where(PROJECT.PROJECT_ID.eq(projectId))
                .and(PROJECT.WORKSPACE_ID.eq(workspaceId))
                .and(includeDeleted ? DSL.noCondition() : PROJECT.DELETED_AT.isNull())
                .fetchOptional(this::project);
    }

    @Override
    public Optional<Key> findKey(UUID workspaceId, String key) {
        return dslContext
                .selectFrom(PROJECT_KEY)
                .where(PROJECT_KEY.WORKSPACE_ID.eq(workspaceId))
                .and(PROJECT_KEY.KEY.eq(key))
                .fetchOptional(r -> new Key(r.getProjectId(), r.getIsCurrent()));
    }

    @Override
    public String currentKey(UUID projectId) {
        return dslContext
                .select(PROJECT_KEY.KEY)
                .from(PROJECT_KEY)
                .where(PROJECT_KEY.PROJECT_ID.eq(projectId))
                .and(PROJECT_KEY.IS_CURRENT.isTrue())
                .fetchSingle(PROJECT_KEY.KEY);
    }

    @Override
    public List<Row> findAll(UUID workspaceId, String status, String query, Instant time, UUID id, int limit) {
        var state =
                switch (status) {
                    case "deleted" -> PROJECT.DELETED_AT.isNotNull();
                    case "archived" -> PROJECT.DELETED_AT.isNull().and(PROJECT.ARCHIVED_AT.isNotNull());
                    default -> PROJECT.DELETED_AT.isNull().and(PROJECT.ARCHIVED_AT.isNull());
                };
        return dslContext
                .select(PROJECT.fields())
                .select(PROJECT_KEY.KEY)
                .from(PROJECT)
                .join(PROJECT_KEY)
                .on(PROJECT_KEY.PROJECT_ID.eq(PROJECT.PROJECT_ID).and(PROJECT_KEY.IS_CURRENT.isTrue()))
                .where(PROJECT.WORKSPACE_ID.eq(workspaceId))
                .and(state)
                .and(
                        query.isEmpty()
                                ? DSL.noCondition()
                                : PROJECT.NAME.containsIgnoreCase(query).or(PROJECT_KEY.KEY.containsIgnoreCase(query)))
                .and(
                        time == null
                                ? DSL.noCondition()
                                : PROJECT.CREATED_AT
                                        .lt(time)
                                        .or(PROJECT.CREATED_AT.eq(time).and(PROJECT.PROJECT_ID.lt(id))))
                .orderBy(PROJECT.CREATED_AT.desc(), PROJECT.PROJECT_ID.desc())
                .limit(limit)
                .fetch(r -> new Row(
                        r.get(PROJECT.PROJECT_ID),
                        r.get(PROJECT.WORKSPACE_ID),
                        r.get(PROJECT.NAME),
                        r.get(PROJECT_KEY.KEY),
                        r.get(PROJECT.DESCRIPTION),
                        r.get(PROJECT.ARCHIVED_AT),
                        r.get(PROJECT.VERSION),
                        AuditRecords.read(r)));
    }

    @Override
    public int nextPosition(UUID workspaceId) {
        Integer max = dslContext
                .select(DSL.max(PROJECT.POSITION))
                .from(PROJECT)
                .where(PROJECT.WORKSPACE_ID.eq(workspaceId))
                .fetchOne(0, Integer.class);
        return max == null ? 0 : Math.incrementExact(max);
    }

    @Override
    public void save(Project p) {
        var r = dslContext.newRecord(PROJECT);
        r.setProjectId(p.id());
        r.setWorkspaceId(p.workspaceId());
        r.setName(p.name());
        r.setDescription(p.description());
        r.setPosition(p.position());
        r.setLastWorkItemNumber(p.lastWorkItemNumber());
        r.setLastDecisionNumber(p.lastDecisionNumber());
        r.setLastSessionNumber(p.lastSessionNumber());
        r.setArchivedAt(p.archivedAt());
        r.setVersion(p.version());
        AuditRecords.write(r, p.audit());
        dslContext
                .insertInto(PROJECT)
                .set(r)
                .onConflict(PROJECT.PROJECT_ID)
                .doUpdate()
                .set(r)
                .execute();
    }

    @Override
    public void switchKey(UUID workspaceId, UUID projectId, ProjectKey key, Instant now) {
        var existing = findKey(workspaceId, key.value());
        if (existing.isPresent()
                && existing.get().projectId().equals(projectId)
                && existing.get().current()) return;
        dslContext
                .update(PROJECT_KEY)
                .set(PROJECT_KEY.IS_CURRENT, false)
                .where(PROJECT_KEY.PROJECT_ID.eq(projectId))
                .and(PROJECT_KEY.IS_CURRENT.isTrue())
                .execute();
        if (existing.isPresent()) {
            if (!existing.get().projectId().equals(projectId))
                throw new IllegalStateException("Key belongs to another project");
            dslContext
                    .update(PROJECT_KEY)
                    .set(PROJECT_KEY.IS_CURRENT, true)
                    .where(PROJECT_KEY.WORKSPACE_ID.eq(workspaceId))
                    .and(PROJECT_KEY.KEY.eq(key.value()))
                    .execute();
        } else {
            dslContext
                    .insertInto(PROJECT_KEY)
                    .set(PROJECT_KEY.PROJECT_KEY_ID, UUID.randomUUID())
                    .set(PROJECT_KEY.PROJECT_ID, projectId)
                    .set(PROJECT_KEY.WORKSPACE_ID, workspaceId)
                    .set(PROJECT_KEY.KEY, key.value())
                    .set(PROJECT_KEY.IS_CURRENT, true)
                    .set(PROJECT_KEY.CREATED_AT, now)
                    .execute();
        }
    }

    @Override
    public List<BoardColumn> findColumns(UUID projectId) {
        return dslContext
                .selectFrom(BOARD_COLUMN)
                .where(BOARD_COLUMN.PROJECT_ID.eq(projectId))
                .and(BOARD_COLUMN.DELETED_AT.isNull())
                .orderBy(BOARD_COLUMN.POSITION, BOARD_COLUMN.BOARD_COLUMN_ID)
                .fetch(this::column);
    }

    @Override
    public Optional<BoardColumn> findColumn(UUID projectId, UUID columnId) {
        return dslContext
                .selectFrom(BOARD_COLUMN)
                .where(BOARD_COLUMN.PROJECT_ID.eq(projectId))
                .and(BOARD_COLUMN.BOARD_COLUMN_ID.eq(columnId))
                .and(BOARD_COLUMN.DELETED_AT.isNull())
                .fetchOptional(this::column);
    }

    @Override
    public void save(BoardColumn c) {
        var r = dslContext.newRecord(BOARD_COLUMN);
        r.setBoardColumnId(c.id());
        r.setProjectId(c.projectId());
        r.setName(c.name());
        r.setColor(c.color());
        r.setPosition(c.position());
        r.setIsFinal(c.finalColumn());
        r.setCategory(c.category().name());
        r.setVersion(c.version());
        AuditRecords.write(r, c.audit());
        dslContext
                .insertInto(BOARD_COLUMN)
                .set(r)
                .onConflict(BOARD_COLUMN.BOARD_COLUMN_ID)
                .doUpdate()
                .set(r)
                .execute();
    }

    private Project project(Record r) {
        return Project.fromPersistence(
                r.get(PROJECT.PROJECT_ID),
                r.get(PROJECT.WORKSPACE_ID),
                r.get(PROJECT.NAME),
                r.get(PROJECT.DESCRIPTION),
                r.get(PROJECT.POSITION),
                r.get(PROJECT.LAST_WORK_ITEM_NUMBER),
                r.get(PROJECT.LAST_DECISION_NUMBER),
                r.get(PROJECT.LAST_SESSION_NUMBER),
                r.get(PROJECT.ARCHIVED_AT),
                r.get(PROJECT.VERSION),
                AuditRecords.read(r));
    }

    private BoardColumn column(Record r) {
        return BoardColumn.fromPersistence(
                r.get(BOARD_COLUMN.BOARD_COLUMN_ID),
                r.get(BOARD_COLUMN.PROJECT_ID),
                r.get(BOARD_COLUMN.NAME),
                r.get(BOARD_COLUMN.COLOR),
                r.get(BOARD_COLUMN.POSITION),
                r.get(BOARD_COLUMN.IS_FINAL),
                ColumnCategory.valueOf(r.get(BOARD_COLUMN.CATEGORY)),
                r.get(BOARD_COLUMN.VERSION),
                AuditRecords.read(r));
    }
}
