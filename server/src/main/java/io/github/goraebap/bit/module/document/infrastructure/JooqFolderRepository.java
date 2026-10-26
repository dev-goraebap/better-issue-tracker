package io.github.goraebap.bit.module.document.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Document.DOCUMENT;
import static io.github.goraebap.bit.jooq.tables.Folder.FOLDER;

import io.github.goraebap.bit.module.document.domain.Folder;
import io.github.goraebap.bit.module.document.domain.FolderRepository;
import io.github.goraebap.bit.shared.persistence.AuditRecords;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqFolderRepository implements FolderRepository {
    private final DSLContext dslContext;

    @Override
    public Optional<Folder> findById(String workspaceId, String id) {
        return dslContext
                .selectFrom(FOLDER)
                .where(FOLDER.WORKSPACE_ID.eq(workspaceId))
                .and(FOLDER.FOLDER_ID.eq(id))
                .and(FOLDER.DELETED_AT.isNull())
                .fetchOptional(JooqFolderRepository::folder);
    }

    @Override
    public List<Folder> findAllByPart(String workspaceId, String projectId) {
        return dslContext
                .selectFrom(FOLDER)
                .where(FOLDER.WORKSPACE_ID.eq(workspaceId))
                .and(part(projectId))
                .and(FOLDER.DELETED_AT.isNull())
                .fetch(JooqFolderRepository::folder);
    }

    @Override
    public boolean existsContentByFolderId(String folderId) {
        return dslContext.fetchExists(
                        FOLDER, FOLDER.PARENT_FOLDER_ID.eq(folderId).and(FOLDER.DELETED_AT.isNull()))
                || dslContext.fetchExists(
                        DOCUMENT, DOCUMENT.FOLDER_ID.eq(folderId).and(DOCUMENT.DELETED_AT.isNull()));
    }

    @Override
    public void save(Folder f) {
        var r = dslContext.newRecord(FOLDER);
        r.setFolderId(f.id());
        r.setWorkspaceId(f.workspaceId());
        r.setProjectId(f.projectId());
        r.setParentFolderId(f.parentId());
        r.setName(f.name());
        r.setVersion(f.version());
        AuditRecords.write(r, f.audit());
        dslContext
                .insertInto(FOLDER)
                .set(r)
                .onConflict(FOLDER.FOLDER_ID)
                .doUpdate()
                .set(r)
                .execute();
    }

    static Condition part(String projectId) {
        return projectId == null ? FOLDER.PROJECT_ID.isNull() : FOLDER.PROJECT_ID.eq(projectId);
    }

    static Folder folder(Record r) {
        return Folder.fromPersistence(
                r.get(FOLDER.FOLDER_ID),
                r.get(FOLDER.WORKSPACE_ID),
                r.get(FOLDER.PROJECT_ID),
                r.get(FOLDER.PARENT_FOLDER_ID),
                r.get(FOLDER.NAME),
                r.get(FOLDER.VERSION),
                AuditRecords.read(r));
    }
}
