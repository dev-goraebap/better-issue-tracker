package io.github.goraebap.bit.module.view.infrastructure;

import static io.github.goraebap.bit.jooq.tables.WorkItemView.WORK_ITEM_VIEW;
import static io.github.goraebap.bit.jooq.tables.WorkItemViewOrder.WORK_ITEM_VIEW_ORDER;
import static io.github.goraebap.bit.jooq.tables.WorkItemViewTweak.WORK_ITEM_VIEW_TWEAK;

import io.github.goraebap.bit.jooq.tables.records.WorkItemViewOrderRecord;
import io.github.goraebap.bit.jooq.tables.records.WorkItemViewRecord;
import io.github.goraebap.bit.module.view.domain.ViewOrder;
import io.github.goraebap.bit.module.view.domain.ViewRepository;
import io.github.goraebap.bit.module.view.domain.ViewTweak;
import io.github.goraebap.bit.module.view.domain.WorkItemView;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Repository
@RequiredArgsConstructor
class JooqViewRepository implements ViewRepository {
    private static final TypeReference<Map<String, String>> FILTERS = new TypeReference<>() {};
    private static final TypeReference<List<WorkItemView.Column>> COLUMNS = new TypeReference<>() {};
    private static final TypeReference<List<String>> KEYS = new TypeReference<>() {};
    private final DSLContext dslContext;
    private final JsonMapper jsonMapper;

    @Override
    public List<WorkItemView> findAllVisible(String workspaceId, String userId) {
        return dslContext
                .selectFrom(WORK_ITEM_VIEW)
                .where(WORK_ITEM_VIEW.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM_VIEW.DELETED_AT.isNull())
                .and(WORK_ITEM_VIEW.IS_PERSONAL.isFalse().or(WORK_ITEM_VIEW.OWNER_ID.eq(userId)))
                .orderBy(WORK_ITEM_VIEW.POSITION, WORK_ITEM_VIEW.CREATED_AT, WORK_ITEM_VIEW.WORK_ITEM_VIEW_ID)
                .fetch(this::view);
    }

    @Override
    public Optional<WorkItemView> findById(String workspaceId, String id) {
        return dslContext
                .selectFrom(WORK_ITEM_VIEW)
                .where(WORK_ITEM_VIEW.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM_VIEW.WORK_ITEM_VIEW_ID.eq(id))
                .and(WORK_ITEM_VIEW.DELETED_AT.isNull())
                .fetchOptional(this::view);
    }

    @Override
    public double nextPosition(String workspaceId) {
        Double max = dslContext
                .select(DSL.max(WORK_ITEM_VIEW.POSITION))
                .from(WORK_ITEM_VIEW)
                .where(WORK_ITEM_VIEW.WORKSPACE_ID.eq(workspaceId))
                .fetchOne(0, Double.class);
        return max == null ? 0 : Math.floor(max) + 1;
    }

    @Override
    public void save(WorkItemView view) {
        var r = record(view);
        dslContext
                .insertInto(WORK_ITEM_VIEW)
                .set(r)
                .onConflict(WORK_ITEM_VIEW.WORK_ITEM_VIEW_ID)
                .doUpdate()
                .set(r)
                .execute();
    }

    @Override
    public void saveAll(List<WorkItemView> views) {
        if (views.isEmpty()) return;
        dslContext
                .batch(views.stream()
                        .map(view -> {
                            var r = record(view);
                            return dslContext
                                    .insertInto(WORK_ITEM_VIEW)
                                    .set(r)
                                    .onConflict(WORK_ITEM_VIEW.WORK_ITEM_VIEW_ID)
                                    .doUpdate()
                                    .set(r);
                        })
                        .toList())
                .execute();
    }

    @Override
    public List<ViewTweak> findTweaks(String workspaceId, String userId) {
        return dslContext
                .selectFrom(WORK_ITEM_VIEW_TWEAK)
                .where(WORK_ITEM_VIEW_TWEAK.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM_VIEW_TWEAK.IAM_USER_ID.eq(userId))
                .orderBy(WORK_ITEM_VIEW_TWEAK.VIEW_KEY)
                .fetch(r -> {
                    var tweak = jsonMapper.readTree(r.getTweak());
                    var layout = tweak.path("layout");
                    var sort = tweak.path("sort");
                    var columns = tweak.path("columns");
                    var grouping = tweak.path("grouping");
                    return new ViewTweak(
                            r.getWorkspaceId(),
                            r.getIamUserId(),
                            r.getViewKey(),
                            layout.isMissingNode() ? null : WorkItemView.Layout.valueOf(layout.stringValue()),
                            sort.isMissingNode()
                                    ? null
                                    : new WorkItemView.Sort(
                                            WorkItemView.SortKey.valueOf(
                                                    sort.path("key").stringValue()),
                                            WorkItemView.Direction.valueOf(
                                                    sort.path("direction").stringValue())),
                            columns.isMissingNode() ? null : jsonMapper.convertValue(columns, COLUMNS),
                            grouping.isMissingNode() ? null : WorkItemView.Grouping.valueOf(grouping.stringValue()),
                            r.getUpdatedAt());
                });
    }

    @Override
    public void saveTweak(ViewTweak tweak) {
        var body = new LinkedHashMap<String, Object>();
        if (tweak.layout() != null) body.put("layout", tweak.layout().name());
        if (tweak.sort() != null)
            body.put(
                    "sort",
                    Map.of(
                            "key", tweak.sort().key().name(),
                            "direction", tweak.sort().direction().name()));
        if (tweak.columns() != null)
            body.put("columns", tweak.columns().stream().map(Enum::name).toList());
        if (tweak.grouping() != null) body.put("grouping", tweak.grouping().name());
        String json = jsonMapper.writeValueAsString(body);
        dslContext
                .insertInto(WORK_ITEM_VIEW_TWEAK)
                .set(WORK_ITEM_VIEW_TWEAK.WORKSPACE_ID, tweak.workspaceId())
                .set(WORK_ITEM_VIEW_TWEAK.IAM_USER_ID, tweak.userId())
                .set(WORK_ITEM_VIEW_TWEAK.VIEW_KEY, tweak.viewKey())
                .set(WORK_ITEM_VIEW_TWEAK.TWEAK, json)
                .set(WORK_ITEM_VIEW_TWEAK.UPDATED_AT, tweak.updatedAt())
                .onConflict(
                        WORK_ITEM_VIEW_TWEAK.WORKSPACE_ID,
                        WORK_ITEM_VIEW_TWEAK.IAM_USER_ID,
                        WORK_ITEM_VIEW_TWEAK.VIEW_KEY)
                .doUpdate()
                .set(WORK_ITEM_VIEW_TWEAK.TWEAK, json)
                .set(WORK_ITEM_VIEW_TWEAK.UPDATED_AT, tweak.updatedAt())
                .execute();
    }

    @Override
    public void deleteTweak(String workspaceId, String userId, String viewKey) {
        dslContext
                .deleteFrom(WORK_ITEM_VIEW_TWEAK)
                .where(WORK_ITEM_VIEW_TWEAK.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM_VIEW_TWEAK.IAM_USER_ID.eq(userId))
                .and(WORK_ITEM_VIEW_TWEAK.VIEW_KEY.eq(viewKey))
                .execute();
    }

    @Override
    public void deleteAllTweaksByViewKey(String workspaceId, String viewKey) {
        dslContext
                .deleteFrom(WORK_ITEM_VIEW_TWEAK)
                .where(WORK_ITEM_VIEW_TWEAK.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM_VIEW_TWEAK.VIEW_KEY.eq(viewKey))
                .execute();
    }

    private WorkItemViewRecord record(WorkItemView view) {
        var d = view.definition();
        var r = dslContext.newRecord(WORK_ITEM_VIEW);
        r.setWorkItemViewId(view.id());
        r.setWorkspaceId(view.workspaceId());
        r.setOwnerId(view.ownerId());
        r.setIsPersonal(view.personal());
        r.setName(d.name());
        r.setDescription(d.description());
        r.setIcon(d.icon());
        r.setColor(d.color());
        r.setLayout(d.layout().name());
        r.setFilters(jsonMapper.writeValueAsString(d.orderedFilters()));
        r.setSortKey(d.sort().key().name());
        r.setSortDirection(d.sort().direction().name());
        r.setColumns(jsonMapper.writeValueAsString(
                d.columns().stream().map(Enum::name).toList()));
        r.setGrouping(d.grouping().name());
        r.setPosition(view.position());
        r.setVersion(view.version());
        AuditRecords.write(r, view.audit());
        return r;
    }

    private WorkItemView view(Record r) {
        var definition = new WorkItemView.Definition(
                r.get(WORK_ITEM_VIEW.NAME),
                r.get(WORK_ITEM_VIEW.DESCRIPTION),
                r.get(WORK_ITEM_VIEW.ICON),
                r.get(WORK_ITEM_VIEW.COLOR),
                WorkItemView.Layout.valueOf(r.get(WORK_ITEM_VIEW.LAYOUT)),
                jsonMapper.readValue(r.get(WORK_ITEM_VIEW.FILTERS), FILTERS),
                new WorkItemView.Sort(
                        WorkItemView.SortKey.valueOf(r.get(WORK_ITEM_VIEW.SORT_KEY)),
                        WorkItemView.Direction.valueOf(r.get(WORK_ITEM_VIEW.SORT_DIRECTION))),
                jsonMapper.readValue(r.get(WORK_ITEM_VIEW.COLUMNS), COLUMNS),
                WorkItemView.Grouping.valueOf(r.get(WORK_ITEM_VIEW.GROUPING)));
        return WorkItemView.fromPersistence(
                r.get(WORK_ITEM_VIEW.WORK_ITEM_VIEW_ID),
                r.get(WORK_ITEM_VIEW.WORKSPACE_ID),
                r.get(WORK_ITEM_VIEW.OWNER_ID),
                r.get(WORK_ITEM_VIEW.IS_PERSONAL),
                definition,
                r.get(WORK_ITEM_VIEW.POSITION),
                r.get(WORK_ITEM_VIEW.VERSION),
                AuditRecords.read(r));
    }

    @Override
    public List<ViewOrder> findOrders(String workspaceId) {
        return dslContext
                .selectFrom(WORK_ITEM_VIEW_ORDER)
                .where(WORK_ITEM_VIEW_ORDER.WORKSPACE_ID.eq(workspaceId))
                .orderBy(WORK_ITEM_VIEW_ORDER.SCOPE)
                .fetch(this::order);
    }

    @Override
    public Optional<ViewOrder> findOrder(String workspaceId, String scope) {
        return dslContext
                .selectFrom(WORK_ITEM_VIEW_ORDER)
                .where(WORK_ITEM_VIEW_ORDER.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM_VIEW_ORDER.SCOPE.eq(scope))
                .fetchOptional(this::order);
    }

    @Override
    public void saveOrder(ViewOrder order) {
        String keys = jsonMapper.writeValueAsString(order.viewKeys());
        dslContext
                .insertInto(WORK_ITEM_VIEW_ORDER)
                .set(WORK_ITEM_VIEW_ORDER.WORKSPACE_ID, order.workspaceId())
                .set(WORK_ITEM_VIEW_ORDER.SCOPE, order.scope())
                .set(WORK_ITEM_VIEW_ORDER.VIEW_KEYS, keys)
                .set(WORK_ITEM_VIEW_ORDER.UPDATED_AT, order.updatedAt())
                .set(WORK_ITEM_VIEW_ORDER.UPDATED_BY, order.updatedBy())
                .set(WORK_ITEM_VIEW_ORDER.UPDATED_BY_AGENT, order.updatedByAgent())
                .onConflict(WORK_ITEM_VIEW_ORDER.WORKSPACE_ID, WORK_ITEM_VIEW_ORDER.SCOPE)
                .doUpdate()
                .set(WORK_ITEM_VIEW_ORDER.VIEW_KEYS, keys)
                .set(WORK_ITEM_VIEW_ORDER.UPDATED_AT, order.updatedAt())
                .set(WORK_ITEM_VIEW_ORDER.UPDATED_BY, order.updatedBy())
                .set(WORK_ITEM_VIEW_ORDER.UPDATED_BY_AGENT, order.updatedByAgent())
                .execute();
    }

    private ViewOrder order(WorkItemViewOrderRecord r) {
        return new ViewOrder(
                r.getWorkspaceId(),
                r.getScope(),
                jsonMapper.readValue(r.getViewKeys(), KEYS),
                r.getUpdatedAt(),
                r.getUpdatedBy(),
                r.getUpdatedByAgent());
    }
}
