package io.github.goraebap.bit.module.document.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Document.DOCUMENT;
import static io.github.goraebap.bit.jooq.tables.PageVersion.PAGE_VERSION;
import static io.github.goraebap.bit.jooq.tables.PageVersionFile.PAGE_VERSION_FILE;

import io.github.goraebap.bit.module.document.application.PageQuery;
import io.github.goraebap.bit.module.document.application.PageViews;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqPageQuery implements PageQuery {
    private final DSLContext dslContext;

    @Override
    public List<PageViews.VersionSummary> versions(String documentId) {
        return dslContext
                .selectFrom(PAGE_VERSION)
                .where(PAGE_VERSION.DOCUMENT_ID.eq(documentId))
                .orderBy(PAGE_VERSION.NUMBER.desc())
                .fetch(JooqPageQuery::summary);
    }

    @Override
    public Optional<PageViews.VersionSummary> version(String documentId, int number) {
        return dslContext
                .selectFrom(PAGE_VERSION)
                .where(PAGE_VERSION.DOCUMENT_ID.eq(documentId))
                .and(PAGE_VERSION.NUMBER.eq(number))
                .fetchOptional(JooqPageQuery::summary);
    }

    @Override
    public List<StoredFile> files(String versionId) {
        return dslContext
                .selectFrom(PAGE_VERSION_FILE)
                .where(PAGE_VERSION_FILE.PAGE_VERSION_ID.eq(versionId))
                .orderBy(PAGE_VERSION_FILE.PATH)
                .fetch(JooqPageQuery::file);
    }

    @Override
    public Optional<StoredFile> served(String versionId, String path) {
        return dslContext
                .select(PAGE_VERSION_FILE.fields())
                .from(PAGE_VERSION_FILE)
                .join(PAGE_VERSION)
                .on(PAGE_VERSION.PAGE_VERSION_ID.eq(PAGE_VERSION_FILE.PAGE_VERSION_ID))
                .where(PAGE_VERSION_FILE.PAGE_VERSION_ID.eq(versionId))
                .and(PAGE_VERSION_FILE.PATH.eq(path))
                .and(livePage())
                .fetchOptional(JooqPageQuery::file);
    }

    @Override
    public Optional<String> entry(String versionId) {
        return dslContext
                .select(PAGE_VERSION.ENTRY)
                .from(PAGE_VERSION)
                .where(PAGE_VERSION.PAGE_VERSION_ID.eq(versionId))
                .and(livePage())
                .fetchOptional(PAGE_VERSION.ENTRY);
    }

    private static Condition livePage() {
        return DSL.exists(DSL.selectOne()
                .from(DOCUMENT)
                .where(DOCUMENT.DOCUMENT_ID.eq(PAGE_VERSION.DOCUMENT_ID))
                .and(DOCUMENT.DELETED_AT.isNull()));
    }

    private static PageViews.VersionSummary summary(Record r) {
        return new PageViews.VersionSummary(
                r.get(PAGE_VERSION.PAGE_VERSION_ID),
                r.get(PAGE_VERSION.NUMBER),
                r.get(PAGE_VERSION.ENTRY),
                r.get(PAGE_VERSION.NOTE),
                r.get(PAGE_VERSION.BASE_COMMIT),
                r.get(PAGE_VERSION.CREATED_AT),
                r.get(PAGE_VERSION.CREATED_BY),
                r.get(PAGE_VERSION.CREATED_BY_AGENT));
    }

    private static StoredFile file(Record r) {
        return new StoredFile(
                r.get(PAGE_VERSION_FILE.PATH),
                r.get(PAGE_VERSION_FILE.CONTENT_TYPE),
                r.get(PAGE_VERSION_FILE.BYTE_SIZE),
                r.get(PAGE_VERSION_FILE.BLOB_ID),
                r.get(PAGE_VERSION_FILE.INJECT_AT));
    }
}
