package io.github.goraebap.bit.module.file.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Attachment.ATTACHMENT;
import static io.github.goraebap.bit.jooq.tables.Blob.BLOB;

import io.github.goraebap.bit.module.file.FileOwner;
import io.github.goraebap.bit.module.file.application.FileQuery;
import io.github.goraebap.bit.module.file.application.FileViews;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqFileQuery implements FileQuery {
    private final DSLContext dslContext;

    @Override
    public List<FileViews.StoredFile> findByOwners(FileOwner owner, Collection<String> ownerIds) {
        if (ownerIds.isEmpty()) return List.of();
        return select(ATTACHMENT.OWNER_TYPE.eq(owner.value()).and(ATTACHMENT.OWNER_ID.in(ownerIds)));
    }

    @Override
    public Optional<FileViews.StoredFile> findOne(FileOwner owner, String ownerId, String attachmentId) {
        return select(ATTACHMENT
                        .OWNER_TYPE
                        .eq(owner.value())
                        .and(ATTACHMENT.OWNER_ID.eq(ownerId))
                        .and(ATTACHMENT.ATTACHMENT_ID.eq(attachmentId)))
                .stream()
                .findFirst();
    }

    private List<FileViews.StoredFile> select(Condition condition) {
        return dslContext
                .select(
                        ATTACHMENT.ATTACHMENT_ID,
                        ATTACHMENT.OWNER_ID,
                        BLOB.FILENAME,
                        BLOB.CONTENT_TYPE,
                        BLOB.BYTE_SIZE,
                        BLOB.STORAGE_KEY,
                        BLOB.DOMINANT_COLOR,
                        BLOB.WIDTH,
                        BLOB.HEIGHT)
                .from(ATTACHMENT)
                .join(BLOB)
                .on(BLOB.BLOB_ID.eq(ATTACHMENT.BLOB_ID))
                .where(condition)
                .and(ATTACHMENT.DELETED_AT.isNull())
                .and(BLOB.DELETED_AT.isNull())
                .orderBy(ATTACHMENT.OWNER_ID, ATTACHMENT.POSITION, ATTACHMENT.CREATED_AT, ATTACHMENT.ATTACHMENT_ID)
                .fetch(JooqFileQuery::file);
    }

    private static FileViews.StoredFile file(Record row) {
        return new FileViews.StoredFile(
                row.get(ATTACHMENT.ATTACHMENT_ID),
                row.get(ATTACHMENT.OWNER_ID),
                row.get(BLOB.FILENAME),
                row.get(BLOB.CONTENT_TYPE),
                row.get(BLOB.BYTE_SIZE),
                row.get(BLOB.STORAGE_KEY),
                row.get(BLOB.DOMINANT_COLOR),
                row.get(BLOB.WIDTH),
                row.get(BLOB.HEIGHT));
    }
}
