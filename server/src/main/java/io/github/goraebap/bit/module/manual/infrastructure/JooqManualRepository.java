package io.github.goraebap.bit.module.manual.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Manual.MANUAL;

import io.github.goraebap.bit.module.manual.domain.Manual;
import io.github.goraebap.bit.module.manual.domain.ManualContent;
import io.github.goraebap.bit.module.manual.domain.ManualRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

@Repository
@RequiredArgsConstructor
class JooqManualRepository implements ManualRepository {
    private final DSLContext dslContext;
    private final JsonMapper jsonMapper;

    @Override
    public Optional<Manual> findById(String workspaceId, String id) {
        return dslContext
                .selectFrom(MANUAL)
                .where(MANUAL.WORKSPACE_ID.eq(workspaceId))
                .and(MANUAL.MANUAL_ID.eq(id))
                .and(MANUAL.DELETED_AT.isNull())
                .fetchOptional(r -> Manual.fromPersistence(
                        r.getManualId(),
                        r.getWorkspaceId(),
                        r.getProjectId(),
                        r.getTitle(),
                        r.getDescription(),
                        r.getIcon(),
                        r.getColor(),
                        jsonMapper.readValue(r.getContent(), ManualContent.class),
                        r.getVersion(),
                        AuditRecords.read(r)));
    }

    @Override
    public boolean existsById(String id) {
        return dslContext.fetchExists(MANUAL, MANUAL.MANUAL_ID.eq(id));
    }

    @Override
    public void save(Manual manual) {
        var row = dslContext.newRecord(MANUAL);
        row.setManualId(manual.id());
        row.setWorkspaceId(manual.workspaceId());
        row.setProjectId(manual.projectId());
        row.setTitle(manual.title());
        row.setDescription(manual.description());
        row.setIcon(manual.icon());
        row.setColor(manual.color());
        row.setContent(jsonMapper.writeValueAsString(manual.content()));
        row.setVersion(manual.version());
        AuditRecords.write(row, manual.audit());
        dslContext
                .insertInto(MANUAL)
                .set(row)
                .onConflict(MANUAL.MANUAL_ID)
                .doUpdate()
                .set(row)
                .execute();
    }
}
