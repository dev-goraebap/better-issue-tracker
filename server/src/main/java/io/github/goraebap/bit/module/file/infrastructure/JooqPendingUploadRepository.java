package io.github.goraebap.bit.module.file.infrastructure;

import static io.github.goraebap.bit.jooq.tables.PendingUpload.PENDING_UPLOAD;

import io.github.goraebap.bit.jooq.tables.records.PendingUploadRecord;
import io.github.goraebap.bit.module.file.domain.FileFormat;
import io.github.goraebap.bit.module.file.domain.ImageTraits;
import io.github.goraebap.bit.module.file.domain.PendingUpload;
import io.github.goraebap.bit.module.file.domain.PendingUploadRepository;
import io.github.goraebap.bit.module.file.domain.UploadPurpose;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqPendingUploadRepository implements PendingUploadRepository {
    private final DSLContext dslContext;

    @Override
    public void save(PendingUpload upload) {
        dslContext
                .insertInto(PENDING_UPLOAD)
                .set(PENDING_UPLOAD.PENDING_UPLOAD_ID, upload.id())
                .set(PENDING_UPLOAD.BLOB_ID, upload.blobId())
                .set(PENDING_UPLOAD.STORAGE_KEY, upload.storageKey())
                .set(PENDING_UPLOAD.PURPOSE, upload.purpose().name())
                .set(PENDING_UPLOAD.FILENAME, upload.filename())
                .set(PENDING_UPLOAD.CONTENT_TYPE, upload.format().contentType())
                .set(PENDING_UPLOAD.BYTE_SIZE, upload.size())
                .set(PENDING_UPLOAD.DOMINANT_COLOR, upload.traits().dominantColor())
                .set(PENDING_UPLOAD.WIDTH, upload.traits().width())
                .set(PENDING_UPLOAD.HEIGHT, upload.traits().height())
                .set(PENDING_UPLOAD.CREATED_AT, upload.createdAt())
                .set(PENDING_UPLOAD.CREATED_BY, upload.uploaderId())
                .set(PENDING_UPLOAD.CREATED_BY_AGENT, upload.uploaderAgent())
                .execute();
    }

    @Override
    public List<PendingUpload> findAllById(Collection<String> ids) {
        if (ids.isEmpty()) return List.of();
        return dslContext
                .selectFrom(PENDING_UPLOAD)
                .where(PENDING_UPLOAD.PENDING_UPLOAD_ID.in(ids))
                .fetch(JooqPendingUploadRepository::upload);
    }

    @Override
    public List<PendingUpload> findAllCreatedBefore(Instant instant, int limit) {
        return dslContext
                .selectFrom(PENDING_UPLOAD)
                .where(PENDING_UPLOAD.CREATED_AT.lt(instant))
                .orderBy(PENDING_UPLOAD.CREATED_AT, PENDING_UPLOAD.PENDING_UPLOAD_ID)
                .limit(limit)
                .fetch(JooqPendingUploadRepository::upload);
    }

    @Override
    public void deleteAllById(Collection<String> ids) {
        if (ids.isEmpty()) return;
        dslContext
                .deleteFrom(PENDING_UPLOAD)
                .where(PENDING_UPLOAD.PENDING_UPLOAD_ID.in(ids))
                .execute();
    }

    /** A format this server no longer accepts reads as PDF, whose signature the stored bytes then fail. */
    private static PendingUpload upload(PendingUploadRecord row) {
        var format = FileFormat.ofFilename(row.getFilename())
                .or(() -> FileFormat.ofContentType(row.getContentType()))
                .orElse(FileFormat.PDF);
        return PendingUpload.fromPersistence(
                row.getPendingUploadId(),
                row.getBlobId(),
                row.getCreatedBy(),
                row.getCreatedByAgent(),
                row.getFilename(),
                format,
                UploadPurpose.valueOf(row.getPurpose()),
                row.getByteSize(),
                row.getStorageKey(),
                row.getCreatedAt(),
                new ImageTraits(row.getDominantColor(), row.getWidth(), row.getHeight()));
    }
}
