package io.github.goraebap.bit.module.workitem.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Link.LINK;
import static io.github.goraebap.bit.jooq.tables.WorkItem.WORK_ITEM;
import static io.github.goraebap.bit.jooq.tables.WorkItemType.WORK_ITEM_TYPE;
import static io.github.goraebap.bit.jooq.tables.WorkItemTypeParent.WORK_ITEM_TYPE_PARENT;

import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workitem.domain.WorkItemType;
import io.github.goraebap.bit.module.workitem.domain.WorkItemTypeRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
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
class JooqWorkItemTypeRepository implements WorkItemTypeRepository {
    private static final String SUBTASK_OF = "subtask_of";
    private final DSLContext dslContext;

    @Override
    public List<WorkItemType> findAllByWorkspaceId(String workspaceId) {
        return types(WORK_ITEM_TYPE.WORKSPACE_ID.eq(workspaceId).and(WORK_ITEM_TYPE.DELETED_AT.isNull()));
    }

    @Override
    public List<WorkItemType> findAllById(String workspaceId, Set<String> ids) {
        if (ids.isEmpty()) return List.of();
        return types(WORK_ITEM_TYPE.WORKSPACE_ID.eq(workspaceId).and(WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID.in(ids)));
    }

    @Override
    public Optional<WorkItemType> findById(String workspaceId, String id) {
        return types(WORK_ITEM_TYPE
                        .WORKSPACE_ID
                        .eq(workspaceId)
                        .and(WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID.eq(id))
                        .and(WORK_ITEM_TYPE.DELETED_AT.isNull()))
                .stream()
                .findFirst();
    }

    @Override
    public Optional<WorkItemType> findDefault(String workspaceId) {
        return types(WORK_ITEM_TYPE
                        .WORKSPACE_ID
                        .eq(workspaceId)
                        .and(WORK_ITEM_TYPE.IS_DEFAULT.isTrue())
                        .and(WORK_ITEM_TYPE.DELETED_AT.isNull()))
                .stream()
                .findFirst();
    }

    @Override
    public boolean existsByNameAndIdNot(String workspaceId, String name, String id) {
        return dslContext.fetchExists(
                WORK_ITEM_TYPE,
                WORK_ITEM_TYPE
                        .WORKSPACE_ID
                        .eq(workspaceId)
                        .and(DSL.lower(WORK_ITEM_TYPE.NAME).eq(name.strip().toLowerCase(Locale.ROOT)))
                        .and(WORK_ITEM_TYPE.DELETED_AT.isNull())
                        .and(id == null ? DSL.noCondition() : WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID.ne(id)));
    }

    @Override
    public Map<String, Long> countWorkItemsByType(String workspaceId) {
        var count = DSL.count().cast(Long.class).as("item_count");
        return dslContext
                .select(WORK_ITEM.WORK_ITEM_TYPE_ID, count)
                .from(WORK_ITEM)
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM.WORK_ITEM_TYPE_ID.isNotNull())
                .and(WORK_ITEM.DELETED_AT.isNull())
                .groupBy(WORK_ITEM.WORK_ITEM_TYPE_ID)
                .fetchMap(WORK_ITEM.WORK_ITEM_TYPE_ID, count);
    }

    @Override
    public long countWorkItemsByTypeId(String workspaceId, String typeId) {
        return dslContext.fetchCount(
                WORK_ITEM,
                WORK_ITEM
                        .WORKSPACE_ID
                        .eq(workspaceId)
                        .and(WORK_ITEM.WORK_ITEM_TYPE_ID.eq(typeId))
                        .and(WORK_ITEM.DELETED_AT.isNull()));
    }

    /**
     * Reads the subtask_of links the link module keeps (D-104): a count that decides whether a rule may change, read
     * where both tables are, as a screen's count would be (backend 04). The parent counts even when it was deleted,
     * since its link stays.
     */
    @Override
    public long countWorkItemsBreaking(
            String workspaceId, String typeId, boolean parentRequired, Set<String> parentTypeIds) {
        var parent = WORK_ITEM.as("parent");
        Condition wrongParent = parent.KIND
                .eq(WorkItem.Kind.event.name())
                .or(parent.WORK_ITEM_TYPE_ID.isNull())
                .or(parentTypeIds.isEmpty() ? DSL.trueCondition() : parent.WORK_ITEM_TYPE_ID.notIn(parentTypeIds));
        Condition breaking = LINK.LINK_ID.isNotNull().and(wrongParent);
        if (parentRequired) breaking = breaking.or(LINK.LINK_ID.isNull());
        return dslContext.fetchCount(dslContext
                .selectOne()
                .from(WORK_ITEM)
                .leftJoin(LINK)
                .on(LINK.WORKSPACE_ID
                        .eq(WORK_ITEM.WORKSPACE_ID)
                        .and(LINK.FROM_TYPE.eq("work_item"))
                        .and(LINK.FROM_ID.eq(WORK_ITEM.WORK_ITEM_ID))
                        .and(LINK.RELATION.eq(SUBTASK_OF))
                        .and(LINK.DELETED_AT.isNull()))
                .leftJoin(parent)
                .on(parent.WORK_ITEM_ID.eq(LINK.TO_ID))
                .where(WORK_ITEM.WORKSPACE_ID.eq(workspaceId))
                .and(WORK_ITEM.WORK_ITEM_TYPE_ID.eq(typeId))
                .and(WORK_ITEM.KIND.eq(WorkItem.Kind.task.name()))
                .and(WORK_ITEM.DELETED_AT.isNull())
                .and(breaking));
    }

    @Override
    public void save(WorkItemType type) {
        saveAll(List.of(type));
    }

    /** In the order given, so a default handed from one type to another never has two at once. */
    @Override
    public void saveAll(List<WorkItemType> types) {
        for (var t : types) {
            var r = dslContext.newRecord(WORK_ITEM_TYPE);
            r.setWorkItemTypeId(t.id());
            r.setWorkspaceId(t.workspaceId());
            r.setName(t.name());
            r.setIcon(t.icon());
            r.setColor(t.color());
            r.setPosition(t.position());
            r.setIsDefault(t.isDefault());
            r.setParentRequired(t.parentRequired());
            r.setVersion(t.version());
            AuditRecords.write(r, t.audit());
            dslContext
                    .insertInto(WORK_ITEM_TYPE)
                    .set(r)
                    .onConflict(WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID)
                    .doUpdate()
                    .set(r)
                    .execute();
        }
        // Parents go after every type of the set is in, since types of one set may name each other.
        for (var t : types) saveParents(t);
    }

    @Override
    public void reorder(String workspaceId, List<String> ids, String actor, String agent, Instant now) {
        for (int position = 0; position < ids.size(); position++)
            dslContext
                    .update(WORK_ITEM_TYPE)
                    .set(WORK_ITEM_TYPE.POSITION, position)
                    .set(WORK_ITEM_TYPE.VERSION, WORK_ITEM_TYPE.VERSION.add(1))
                    .set(WORK_ITEM_TYPE.UPDATED_AT, now)
                    .set(WORK_ITEM_TYPE.UPDATED_BY, actor)
                    .set(WORK_ITEM_TYPE.UPDATED_BY_AGENT, agent)
                    .where(WORK_ITEM_TYPE.WORKSPACE_ID.eq(workspaceId))
                    .and(WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID.eq(ids.get(position)))
                    .execute();
    }

    /** As a work item's labels: parents no longer allowed go, new ones come as the type's latest editor's. */
    private void saveParents(WorkItemType t) {
        var parents = t.parentTypeIds();
        dslContext
                .deleteFrom(WORK_ITEM_TYPE_PARENT)
                .where(WORK_ITEM_TYPE_PARENT.WORK_ITEM_TYPE_ID.eq(t.id()))
                .and(
                        parents.isEmpty()
                                ? DSL.noCondition()
                                : WORK_ITEM_TYPE_PARENT.PARENT_WORK_ITEM_TYPE_ID.notIn(parents))
                .execute();
        if (parents.isEmpty()) return;
        var insert = dslContext.insertInto(
                WORK_ITEM_TYPE_PARENT,
                WORK_ITEM_TYPE_PARENT.WORK_ITEM_TYPE_PARENT_ID,
                WORK_ITEM_TYPE_PARENT.WORK_ITEM_TYPE_ID,
                WORK_ITEM_TYPE_PARENT.PARENT_WORK_ITEM_TYPE_ID,
                WORK_ITEM_TYPE_PARENT.CREATED_AT,
                WORK_ITEM_TYPE_PARENT.CREATED_BY,
                WORK_ITEM_TYPE_PARENT.CREATED_BY_AGENT);
        var a = t.audit();
        for (String parent : parents)
            insert = insert.values(Ids.newId(), t.id(), parent, a.updatedAt(), a.updatedBy(), a.updatedByAgent());
        insert.onConflictDoNothing().execute();
    }

    private List<WorkItemType> types(Condition condition) {
        var records = dslContext
                .selectFrom(WORK_ITEM_TYPE)
                .where(condition)
                .orderBy(WORK_ITEM_TYPE.POSITION, DSL.lower(WORK_ITEM_TYPE.NAME), WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID)
                .fetch();
        var ids = records.stream()
                .map(r -> r.get(WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID))
                .collect(Collectors.toSet());
        Map<String, Set<String>> parents = new HashMap<>();
        // Only live parents: a deleted type is left out of every set it was in.
        if (!ids.isEmpty())
            dslContext
                    .select(WORK_ITEM_TYPE_PARENT.WORK_ITEM_TYPE_ID, WORK_ITEM_TYPE_PARENT.PARENT_WORK_ITEM_TYPE_ID)
                    .from(WORK_ITEM_TYPE_PARENT)
                    .join(WORK_ITEM_TYPE)
                    .on(WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID.eq(WORK_ITEM_TYPE_PARENT.PARENT_WORK_ITEM_TYPE_ID))
                    .where(WORK_ITEM_TYPE_PARENT.WORK_ITEM_TYPE_ID.in(ids))
                    .and(WORK_ITEM_TYPE.DELETED_AT.isNull())
                    .forEach(r -> parents.computeIfAbsent(r.value1(), id -> new HashSet<>())
                            .add(r.value2()));
        return records.stream()
                .map(r -> type(r, parents.getOrDefault(r.get(WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID), Set.of())))
                .toList();
    }

    private WorkItemType type(Record r, Set<String> parents) {
        return WorkItemType.fromPersistence(
                r.get(WORK_ITEM_TYPE.WORK_ITEM_TYPE_ID),
                r.get(WORK_ITEM_TYPE.WORKSPACE_ID),
                r.get(WORK_ITEM_TYPE.NAME),
                r.get(WORK_ITEM_TYPE.ICON),
                r.get(WORK_ITEM_TYPE.COLOR),
                r.get(WORK_ITEM_TYPE.POSITION),
                Boolean.TRUE.equals(r.get(WORK_ITEM_TYPE.IS_DEFAULT)),
                Boolean.TRUE.equals(r.get(WORK_ITEM_TYPE.PARENT_REQUIRED)),
                parents,
                r.get(WORK_ITEM_TYPE.VERSION),
                AuditRecords.read(r));
    }
}
