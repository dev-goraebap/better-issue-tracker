package io.github.goraebap.bit.module.link.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Link.LINK;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.Link;
import io.github.goraebap.bit.module.link.domain.LinkRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqLinkRepository implements LinkRepository {
    private final DSLContext dslContext;

    @Override
    public Optional<Link> findById(String workspaceId, String id) {
        return dslContext
                .selectFrom(LINK)
                .where(LINK.WORKSPACE_ID.eq(workspaceId))
                .and(LINK.LINK_ID.eq(id))
                .fetchOptional(this::link);
    }

    @Override
    public Optional<Link> findActive(String workspaceId, Link.Edge edge) {
        return dslContext
                .selectFrom(LINK)
                .where(LINK.WORKSPACE_ID.eq(workspaceId))
                .and(LINK.FROM_TYPE.eq(edge.fromType().name()))
                .and(LINK.FROM_ID.eq(edge.fromId()))
                .and(LINK.TO_TYPE.eq(edge.toType().name()))
                .and(LINK.TO_ID.eq(edge.toId()))
                .and(LINK.RELATION.eq(edge.relation()))
                .and(LINK.DELETED_AT.isNull())
                .fetchOptional(this::link);
    }

    @Override
    public List<Link> findAllActive(String workspaceId, List<Link.Edge> edges) {
        if (edges.isEmpty()) return List.of();
        org.jooq.Condition condition = DSL.falseCondition();
        for (var edge : edges)
            condition = condition.or(LINK.FROM_TYPE
                    .eq(edge.fromType().name())
                    .and(LINK.FROM_ID.eq(edge.fromId()))
                    .and(LINK.TO_TYPE.eq(edge.toType().name()))
                    .and(LINK.TO_ID.eq(edge.toId()))
                    .and(LINK.RELATION.eq(edge.relation())));
        return dslContext
                .selectFrom(LINK)
                .where(LINK.WORKSPACE_ID.eq(workspaceId))
                .and(LINK.DELETED_AT.isNull())
                .and(condition)
                .fetch(this::link);
    }

    @Override
    public boolean hasParent(String workspaceId, String id) {
        return dslContext.fetchExists(dslContext
                .selectOne()
                .from(LINK)
                .where(LINK.WORKSPACE_ID.eq(workspaceId))
                .and(LINK.FROM_ID.eq(id))
                .and(LINK.RELATION.eq("subtask_of"))
                .and(LINK.DELETED_AT.isNull()));
    }

    @Override
    public boolean hasReplacement(String workspaceId, String id) {
        return dslContext.fetchExists(dslContext
                .selectOne()
                .from(LINK)
                .where(LINK.WORKSPACE_ID.eq(workspaceId))
                .and(LINK.TO_ID.eq(id))
                .and(LINK.RELATION.eq("supersedes"))
                .and(LINK.DELETED_AT.isNull()));
    }

    @Override
    public boolean pathExists(String workspaceId, String relation, String fromId, String toId) {
        // UNION (not UNION ALL) also terminates if imported data already contains a cycle.
        return Boolean.TRUE.equals(dslContext
                .fetchSingle("""
            WITH RECURSIVE reachable(id) AS (
                SELECT to_id FROM link WHERE workspace_id=? AND relation=? AND from_id=? AND deleted_at IS NULL
                UNION
                SELECT edge.to_id FROM link edge JOIN reachable r ON edge.from_id=r.id
                WHERE edge.workspace_id=? AND edge.relation=? AND edge.deleted_at IS NULL
            ) SELECT EXISTS(SELECT 1 FROM reachable WHERE id=?) AS found
            """, workspaceId, relation, fromId, workspaceId, relation, toId)
                .get("found", Boolean.class));
    }

    @Override
    public void save(Link link) {
        saveAll(List.of(link));
    }

    @Override
    public void saveAll(List<Link> links) {
        if (!links.isEmpty())
            dslContext.batch(links.stream().map(this::saveQuery).toList()).execute();
    }

    private org.jooq.Query saveQuery(Link link) {
        var r = dslContext.newRecord(LINK);
        var edge = link.edge();
        r.setLinkId(link.id());
        r.setWorkspaceId(link.workspaceId());
        r.setFromType(edge.fromType().name());
        r.setFromId(edge.fromId());
        r.setToType(edge.toType().name());
        r.setToId(edge.toId());
        r.setRelation(edge.relation());
        r.setCreatedAt(link.createdAt());
        r.setCreatedBy(link.createdBy());
        r.setCreatedByAgent(link.createdByAgent());
        r.setDeletedAt(link.deletedAt());
        r.setDeletedBy(link.deletedBy());
        r.setDeletedByAgent(link.deletedByAgent());
        return dslContext
                .insertInto(LINK)
                .set(r)
                .onConflict(LINK.LINK_ID)
                .doUpdate()
                .set(r);
    }

    private Link link(Record r) {
        return Link.fromPersistence(
                r.get(LINK.LINK_ID),
                r.get(LINK.WORKSPACE_ID),
                new Link.Edge(
                        TargetType.valueOf(r.get(LINK.FROM_TYPE)),
                        r.get(LINK.FROM_ID),
                        r.get(LINK.RELATION),
                        TargetType.valueOf(r.get(LINK.TO_TYPE)),
                        r.get(LINK.TO_ID)),
                r.get(LINK.CREATED_AT),
                r.get(LINK.CREATED_BY),
                r.get(LINK.CREATED_BY_AGENT),
                r.get(LINK.DELETED_AT),
                r.get(LINK.DELETED_BY),
                r.get(LINK.DELETED_BY_AGENT));
    }
}
