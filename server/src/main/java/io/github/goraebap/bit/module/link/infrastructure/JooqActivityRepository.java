package io.github.goraebap.bit.module.link.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Activity.ACTIVITY;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.Activity;
import io.github.goraebap.bit.module.link.domain.ActivityRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.JSON;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqActivityRepository implements ActivityRepository {
    private final DSLContext dslContext;

    @Override
    public void saveAll(List<Activity> activities) {
        var records = activities.stream()
                .map(a -> {
                    var r = dslContext.newRecord(ACTIVITY);
                    r.setActivityId(a.id());
                    r.setWorkspaceId(a.workspaceId());
                    r.setProjectId(a.projectId());
                    r.setTargetType(a.targetType().name());
                    r.setTargetId(a.targetId());
                    r.setType(a.type());
                    r.setActorId(a.actorId());
                    r.setActorAgent(a.actorAgent());
                    r.setPayload(JSON.valueOf(a.payload()));
                    r.setOccurredAt(a.occurredAt());
                    return r;
                })
                .toList();
        if (!records.isEmpty()) dslContext.batchInsert(records).execute();
    }

    @Override
    public List<Activity> findAllByTarget(
            UUID workspaceId, TargetType type, UUID targetId, Instant afterTime, UUID afterId, int limit) {
        return dslContext
                .selectFrom(ACTIVITY)
                .where(ACTIVITY.WORKSPACE_ID.eq(workspaceId))
                .and(ACTIVITY.TARGET_TYPE.eq(type.name()))
                .and(ACTIVITY.TARGET_ID.eq(targetId))
                .and(ACTIVITY.TYPE.notIn("comment_created", "comment_changed", "comment_deleted", "comment_restored"))
                .and(
                        afterTime == null
                                ? DSL.noCondition()
                                : ACTIVITY.OCCURRED_AT
                                        .gt(afterTime)
                                        .or(ACTIVITY.OCCURRED_AT.eq(afterTime).and(ACTIVITY.ACTIVITY_ID.gt(afterId))))
                .orderBy(ACTIVITY.OCCURRED_AT, ACTIVITY.ACTIVITY_ID)
                .limit(limit)
                .fetch(r -> new Activity(
                        r.getActivityId(),
                        r.getWorkspaceId(),
                        r.getProjectId(),
                        TargetType.valueOf(r.getTargetType()),
                        r.getTargetId(),
                        r.getType(),
                        r.getActorId(),
                        r.getActorAgent(),
                        r.getPayload() == null ? null : r.getPayload().data(),
                        r.getOccurredAt()));
    }
}
