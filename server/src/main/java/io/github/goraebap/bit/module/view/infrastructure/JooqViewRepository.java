package io.github.goraebap.bit.module.view.infrastructure;

import static io.github.goraebap.bit.jooq.tables.IssueView.ISSUE_VIEW;
import static io.github.goraebap.bit.jooq.tables.IssueViewTweak.ISSUE_VIEW_TWEAK;

import io.github.goraebap.bit.jooq.tables.records.IssueViewRecord;
import io.github.goraebap.bit.module.view.domain.IssueView;
import io.github.goraebap.bit.module.view.domain.ViewRepository;
import io.github.goraebap.bit.module.view.domain.ViewTweak;
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
    private static final TypeReference<List<IssueView.Column>> COLUMNS = new TypeReference<>() {};
    private final DSLContext dslContext;
    private final JsonMapper jsonMapper;

    @Override
    public List<IssueView> findAllVisible(String workspaceId, String userId) {
        return dslContext
                .selectFrom(ISSUE_VIEW)
                .where(ISSUE_VIEW.WORKSPACE_ID.eq(workspaceId))
                .and(ISSUE_VIEW.DELETED_AT.isNull())
                .and(ISSUE_VIEW.IS_PERSONAL.isFalse().or(ISSUE_VIEW.OWNER_ID.eq(userId)))
                .orderBy(ISSUE_VIEW.POSITION, ISSUE_VIEW.CREATED_AT, ISSUE_VIEW.ISSUE_VIEW_ID)
                .fetch(this::view);
    }

    @Override
    public Optional<IssueView> findById(String workspaceId, String id) {
        return dslContext
                .selectFrom(ISSUE_VIEW)
                .where(ISSUE_VIEW.WORKSPACE_ID.eq(workspaceId))
                .and(ISSUE_VIEW.ISSUE_VIEW_ID.eq(id))
                .and(ISSUE_VIEW.DELETED_AT.isNull())
                .fetchOptional(this::view);
    }

    @Override
    public double nextPosition(String workspaceId) {
        Double max = dslContext
                .select(DSL.max(ISSUE_VIEW.POSITION))
                .from(ISSUE_VIEW)
                .where(ISSUE_VIEW.WORKSPACE_ID.eq(workspaceId))
                .fetchOne(0, Double.class);
        return max == null ? 0 : Math.floor(max) + 1;
    }

    @Override
    public void save(IssueView view) {
        var r = record(view);
        dslContext
                .insertInto(ISSUE_VIEW)
                .set(r)
                .onConflict(ISSUE_VIEW.ISSUE_VIEW_ID)
                .doUpdate()
                .set(r)
                .execute();
    }

    @Override
    public void saveAll(List<IssueView> views) {
        if (views.isEmpty()) return;
        dslContext
                .batch(views.stream()
                        .map(view -> {
                            var r = record(view);
                            return dslContext
                                    .insertInto(ISSUE_VIEW)
                                    .set(r)
                                    .onConflict(ISSUE_VIEW.ISSUE_VIEW_ID)
                                    .doUpdate()
                                    .set(r);
                        })
                        .toList())
                .execute();
    }

    @Override
    public List<ViewTweak> findTweaks(String workspaceId, String userId) {
        return dslContext
                .selectFrom(ISSUE_VIEW_TWEAK)
                .where(ISSUE_VIEW_TWEAK.WORKSPACE_ID.eq(workspaceId))
                .and(ISSUE_VIEW_TWEAK.IAM_USER_ID.eq(userId))
                .orderBy(ISSUE_VIEW_TWEAK.VIEW_KEY)
                .fetch(r -> {
                    var tweak = jsonMapper.readTree(r.getTweak());
                    var layout = tweak.path("layout");
                    var sort = tweak.path("sort");
                    var columns = tweak.path("columns");
                    return new ViewTweak(
                            r.getWorkspaceId(),
                            r.getIamUserId(),
                            r.getViewKey(),
                            layout.isMissingNode() ? null : IssueView.Layout.valueOf(layout.stringValue()),
                            sort.isMissingNode()
                                    ? null
                                    : new IssueView.Sort(
                                            IssueView.SortKey.valueOf(
                                                    sort.path("key").stringValue()),
                                            IssueView.Direction.valueOf(
                                                    sort.path("direction").stringValue())),
                            columns.isMissingNode() ? null : jsonMapper.convertValue(columns, COLUMNS),
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
        String json = jsonMapper.writeValueAsString(body);
        dslContext
                .insertInto(ISSUE_VIEW_TWEAK)
                .set(ISSUE_VIEW_TWEAK.WORKSPACE_ID, tweak.workspaceId())
                .set(ISSUE_VIEW_TWEAK.IAM_USER_ID, tweak.userId())
                .set(ISSUE_VIEW_TWEAK.VIEW_KEY, tweak.viewKey())
                .set(ISSUE_VIEW_TWEAK.TWEAK, json)
                .set(ISSUE_VIEW_TWEAK.UPDATED_AT, tweak.updatedAt())
                .onConflict(ISSUE_VIEW_TWEAK.WORKSPACE_ID, ISSUE_VIEW_TWEAK.IAM_USER_ID, ISSUE_VIEW_TWEAK.VIEW_KEY)
                .doUpdate()
                .set(ISSUE_VIEW_TWEAK.TWEAK, json)
                .set(ISSUE_VIEW_TWEAK.UPDATED_AT, tweak.updatedAt())
                .execute();
    }

    @Override
    public void deleteTweak(String workspaceId, String userId, String viewKey) {
        dslContext
                .deleteFrom(ISSUE_VIEW_TWEAK)
                .where(ISSUE_VIEW_TWEAK.WORKSPACE_ID.eq(workspaceId))
                .and(ISSUE_VIEW_TWEAK.IAM_USER_ID.eq(userId))
                .and(ISSUE_VIEW_TWEAK.VIEW_KEY.eq(viewKey))
                .execute();
    }

    @Override
    public void deleteAllTweaksByViewKey(String workspaceId, String viewKey) {
        dslContext
                .deleteFrom(ISSUE_VIEW_TWEAK)
                .where(ISSUE_VIEW_TWEAK.WORKSPACE_ID.eq(workspaceId))
                .and(ISSUE_VIEW_TWEAK.VIEW_KEY.eq(viewKey))
                .execute();
    }

    private IssueViewRecord record(IssueView view) {
        var d = view.definition();
        var r = dslContext.newRecord(ISSUE_VIEW);
        r.setIssueViewId(view.id());
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
        r.setPosition(view.position());
        r.setVersion(view.version());
        AuditRecords.write(r, view.audit());
        return r;
    }

    private IssueView view(Record r) {
        var definition = new IssueView.Definition(
                r.get(ISSUE_VIEW.NAME),
                r.get(ISSUE_VIEW.DESCRIPTION),
                r.get(ISSUE_VIEW.ICON),
                r.get(ISSUE_VIEW.COLOR),
                IssueView.Layout.valueOf(r.get(ISSUE_VIEW.LAYOUT)),
                jsonMapper.readValue(r.get(ISSUE_VIEW.FILTERS), FILTERS),
                new IssueView.Sort(
                        IssueView.SortKey.valueOf(r.get(ISSUE_VIEW.SORT_KEY)),
                        IssueView.Direction.valueOf(r.get(ISSUE_VIEW.SORT_DIRECTION))),
                jsonMapper.readValue(r.get(ISSUE_VIEW.COLUMNS), COLUMNS));
        return IssueView.fromPersistence(
                r.get(ISSUE_VIEW.ISSUE_VIEW_ID),
                r.get(ISSUE_VIEW.WORKSPACE_ID),
                r.get(ISSUE_VIEW.OWNER_ID),
                r.get(ISSUE_VIEW.IS_PERSONAL),
                definition,
                r.get(ISSUE_VIEW.POSITION),
                r.get(ISSUE_VIEW.VERSION),
                AuditRecords.read(r));
    }
}
