package io.github.goraebap.bit.module.document.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Document.DOCUMENT;
import static io.github.goraebap.bit.jooq.tables.DocumentLabel.DOCUMENT_LABEL;

import io.github.goraebap.bit.module.document.domain.Document;
import io.github.goraebap.bit.module.document.domain.DocumentRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqDocumentRepository implements DocumentRepository {
    private final DSLContext dslContext;

    @Override
    public Optional<Document> findById(String workspaceId, String id, boolean includeDeleted) {
        return dslContext
                .selectFrom(DOCUMENT)
                .where(DOCUMENT.WORKSPACE_ID.eq(workspaceId))
                .and(DOCUMENT.DOCUMENT_ID.eq(id))
                .and(includeDeleted ? DSL.noCondition() : DOCUMENT.DELETED_AT.isNull())
                .fetchOptional(r -> Document.fromPersistence(
                        r.getDocumentId(),
                        r.getWorkspaceId(),
                        r.getProjectId(),
                        r.getFolderId(),
                        r.getTitle(),
                        r.getBody(),
                        new HashSet<>(dslContext
                                .select(DOCUMENT_LABEL.LABEL_ID)
                                .from(DOCUMENT_LABEL)
                                .where(DOCUMENT_LABEL.DOCUMENT_ID.eq(id))
                                .fetch(DOCUMENT_LABEL.LABEL_ID)),
                        r.getVersion(),
                        AuditRecords.read(r)));
    }

    @Override
    public int countAllById(String workspaceId, String projectId, Set<String> ids) {
        if (ids.isEmpty()) return 0;
        return dslContext.fetchCount(
                DOCUMENT,
                DOCUMENT.WORKSPACE_ID
                        .eq(workspaceId)
                        .and(DOCUMENT.PROJECT_ID.eq(projectId))
                        .and(DOCUMENT.DOCUMENT_ID.in(ids))
                        .and(DOCUMENT.DELETED_AT.isNull()));
    }

    @Override
    public void save(Document d) {
        var r = dslContext.newRecord(DOCUMENT);
        r.setDocumentId(d.id());
        r.setWorkspaceId(d.workspaceId());
        r.setProjectId(d.projectId());
        r.setFolderId(d.folderId());
        r.setTitle(d.title());
        r.setBody(d.body());
        r.setVersion(d.version());
        AuditRecords.write(r, d.audit());
        dslContext
                .insertInto(DOCUMENT)
                .set(r)
                .onConflict(DOCUMENT.DOCUMENT_ID)
                .doUpdate()
                .set(r)
                .execute();
        dslContext
                .deleteFrom(DOCUMENT_LABEL)
                .where(DOCUMENT_LABEL.DOCUMENT_ID.eq(d.id()))
                .and(d.labelIds().isEmpty() ? DSL.noCondition() : DOCUMENT_LABEL.LABEL_ID.notIn(d.labelIds()))
                .execute();
        if (d.labelIds().isEmpty()) return;
        var insert = dslContext.insertInto(
                DOCUMENT_LABEL,
                DOCUMENT_LABEL.DOCUMENT_LABEL_ID,
                DOCUMENT_LABEL.DOCUMENT_ID,
                DOCUMENT_LABEL.LABEL_ID,
                DOCUMENT_LABEL.CREATED_AT,
                DOCUMENT_LABEL.CREATED_BY,
                DOCUMENT_LABEL.CREATED_BY_AGENT);
        var a = d.audit();
        for (String label : d.labelIds())
            insert = insert.values(Ids.newId(), d.id(), label, a.updatedAt(), a.updatedBy(), a.updatedByAgent());
        insert.onConflictDoNothing().execute();
    }
}
