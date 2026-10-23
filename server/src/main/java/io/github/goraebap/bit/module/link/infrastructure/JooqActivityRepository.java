package io.github.goraebap.bit.module.link.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Activity.ACTIVITY;

import io.github.goraebap.bit.module.link.domain.Activity;
import io.github.goraebap.bit.module.link.domain.ActivityRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.JSON;
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
}
