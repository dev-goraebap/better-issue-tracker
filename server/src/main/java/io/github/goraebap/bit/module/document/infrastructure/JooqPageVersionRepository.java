package io.github.goraebap.bit.module.document.infrastructure;

import static io.github.goraebap.bit.jooq.tables.PageVersion.PAGE_VERSION;
import static io.github.goraebap.bit.jooq.tables.PageVersionFile.PAGE_VERSION_FILE;

import io.github.goraebap.bit.module.document.domain.PageVersion;
import io.github.goraebap.bit.module.document.domain.PageVersionRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqPageVersionRepository implements PageVersionRepository {
    private final DSLContext dslContext;

    @Override
    public void save(PageVersion version) {
        dslContext
                .insertInto(PAGE_VERSION)
                .set(PAGE_VERSION.PAGE_VERSION_ID, version.id())
                .set(PAGE_VERSION.DOCUMENT_ID, version.documentId())
                .set(PAGE_VERSION.NUMBER, version.number())
                .set(PAGE_VERSION.ENTRY, version.entry().value())
                .set(PAGE_VERSION.NOTE, version.meta().note())
                .set(PAGE_VERSION.BASE_COMMIT, version.meta().baseCommit())
                .set(PAGE_VERSION.UPLOAD_ID, version.uploadId())
                .set(PAGE_VERSION.CREATED_AT, version.createdAt())
                .set(PAGE_VERSION.CREATED_BY, version.createdBy())
                .set(PAGE_VERSION.CREATED_BY_AGENT, version.createdByAgent())
                .execute();
        var insert = dslContext.insertInto(
                PAGE_VERSION_FILE,
                PAGE_VERSION_FILE.PAGE_VERSION_ID,
                PAGE_VERSION_FILE.PATH,
                PAGE_VERSION_FILE.BLOB_ID,
                PAGE_VERSION_FILE.BYTE_SIZE,
                PAGE_VERSION_FILE.CONTENT_TYPE,
                PAGE_VERSION_FILE.INJECT_AT);
        for (var file : version.files())
            insert = insert.values(
                    version.id(),
                    file.path().value(),
                    file.blobId(),
                    file.size(),
                    file.type().contentType(),
                    file.injectAt());
        insert.execute();
    }

    @Override
    public Optional<PageVersion.Made> findByUploadId(String uploadId) {
        return dslContext
                .select(PAGE_VERSION.PAGE_VERSION_ID, PAGE_VERSION.DOCUMENT_ID, PAGE_VERSION.NUMBER)
                .from(PAGE_VERSION)
                .where(PAGE_VERSION.UPLOAD_ID.eq(uploadId))
                .fetchOptional(r -> new PageVersion.Made(r.value1(), r.value2(), r.value3()));
    }

    @Override
    public int findLatestNumber(String documentId) {
        Integer latest = dslContext
                .select(DSL.max(PAGE_VERSION.NUMBER))
                .from(PAGE_VERSION)
                .where(PAGE_VERSION.DOCUMENT_ID.eq(documentId))
                .fetchOne(0, Integer.class);
        return latest == null ? 0 : latest;
    }
}
