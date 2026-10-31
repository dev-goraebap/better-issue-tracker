package io.github.goraebap.bit.module.manual.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Manual.MANUAL;
import static io.github.goraebap.bit.jooq.tables.Project.PROJECT;

import io.github.goraebap.bit.module.manual.application.ManualQuery;
import io.github.goraebap.bit.module.manual.application.ManualViews;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqManualQuery implements ManualQuery {
    private final DSLContext dslContext;

    @Override
    public List<ManualViews.Summary> list(
            String workspaceId, String projectId, Search search, String cursor, int limit) {
        var pages = DSL.field("json_array_length({0}, '$.pages')", Integer.class, MANUAL.CONTENT);
        org.jooq.Field<String> sorted = "title".equals(search.sort())
                ? DSL.lower(MANUAL.TITLE)
                : DSL.field("cast({0} as varchar)", String.class, MANUAL.UPDATED_AT);
        org.jooq.Field<String> at = dslContext
                .select(sorted)
                .from(MANUAL)
                .where(MANUAL.WORKSPACE_ID.eq(workspaceId))
                .and(MANUAL.MANUAL_ID.eq(cursor))
                .asField();
        var after = search.ascending()
                ? sorted.gt(at).or(sorted.eq(at).and(MANUAL.MANUAL_ID.gt(cursor)))
                : sorted.lt(at).or(sorted.eq(at).and(MANUAL.MANUAL_ID.lt(cursor)));
        return dslContext
                .select(
                        MANUAL.MANUAL_ID,
                        MANUAL.PROJECT_ID,
                        PROJECT.NAME,
                        MANUAL.TITLE,
                        MANUAL.DESCRIPTION,
                        MANUAL.ICON,
                        MANUAL.COLOR,
                        pages,
                        MANUAL.VERSION,
                        MANUAL.CREATED_AT,
                        MANUAL.UPDATED_AT)
                .from(MANUAL)
                .leftJoin(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(MANUAL.PROJECT_ID))
                .where(filter(workspaceId, projectId, search))
                .and(cursor == null ? DSL.noCondition() : after)
                .orderBy(
                        search.ascending() ? sorted.asc() : sorted.desc(),
                        search.ascending() ? MANUAL.MANUAL_ID.asc() : MANUAL.MANUAL_ID.desc())
                .limit(limit)
                .fetch(r -> new ManualViews.Summary(
                        r.get(MANUAL.MANUAL_ID),
                        r.get(MANUAL.PROJECT_ID),
                        r.get(PROJECT.NAME) == null ? "워크스페이스" : r.get(PROJECT.NAME),
                        r.get(MANUAL.TITLE),
                        r.get(MANUAL.DESCRIPTION),
                        r.get(MANUAL.ICON),
                        r.get(MANUAL.COLOR),
                        r.get(pages),
                        r.get(MANUAL.VERSION),
                        r.get(MANUAL.CREATED_AT),
                        r.get(MANUAL.UPDATED_AT),
                        false));
    }

    @Override
    public int count(String workspaceId, String projectId, Search search) {
        Integer count = dslContext
                .selectCount()
                .from(MANUAL)
                .leftJoin(PROJECT)
                .on(PROJECT.PROJECT_ID.eq(MANUAL.PROJECT_ID))
                .where(filter(workspaceId, projectId, search))
                .fetchOne(0, int.class);
        return count == null ? 0 : count;
    }

    private static org.jooq.Condition filter(String workspaceId, String projectId, Search search) {
        var condition = MANUAL.WORKSPACE_ID
                .eq(workspaceId)
                .and(MANUAL.DELETED_AT.isNull())
                .and(MANUAL.PROJECT_ID.isNull().or(PROJECT.DELETED_AT.isNull().and(PROJECT.PROJECT_ID.isNotNull())));
        if (projectId != null) condition = condition.and(MANUAL.PROJECT_ID.eq(projectId));
        if (search.scope() != null)
            condition = condition.and(
                    "workspace".equals(search.scope())
                            ? MANUAL.PROJECT_ID.isNull()
                            : MANUAL.PROJECT_ID.eq(search.scope()));
        if (search.color() != null) condition = condition.and(MANUAL.COLOR.equalIgnoreCase(search.color()));
        if (search.query() != null && !search.query().isBlank())
            condition = condition.and(MANUAL.TITLE
                    .containsIgnoreCase(search.query())
                    .or(MANUAL.DESCRIPTION.containsIgnoreCase(search.query())));
        return condition;
    }
}
