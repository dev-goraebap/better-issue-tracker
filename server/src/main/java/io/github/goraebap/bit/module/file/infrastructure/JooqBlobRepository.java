package io.github.goraebap.bit.module.file.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Blob.BLOB;

import io.github.goraebap.bit.module.file.domain.BlobRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Clock;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqBlobRepository implements BlobRepository {
    private final DSLContext dslContext;
    private final Clock clock;

    @Override
    public Map<String, String> findIdsByStorageKey(Collection<String> storageKeys) {
        if (storageKeys.isEmpty()) return Map.of();
        return dslContext
                .select(BLOB.STORAGE_KEY, BLOB.BLOB_ID)
                .from(BLOB)
                .where(BLOB.STORAGE_KEY.in(storageKeys))
                .fetchMap(BLOB.STORAGE_KEY, BLOB.BLOB_ID);
    }

    @Override
    public void saveAllIfAbsent(List<KeptObject> objects, String actor, String agent) {
        if (objects.isEmpty()) return;
        var now = clock.instant();
        var insert = dslContext.insertInto(
                BLOB,
                BLOB.BLOB_ID,
                BLOB.STORAGE_KEY,
                BLOB.FILENAME,
                BLOB.CONTENT_TYPE,
                BLOB.BYTE_SIZE,
                BLOB.CREATED_AT,
                BLOB.CREATED_BY,
                BLOB.CREATED_BY_AGENT,
                BLOB.UPDATED_AT,
                BLOB.UPDATED_BY,
                BLOB.UPDATED_BY_AGENT);
        for (var object : objects)
            insert = insert.values(
                    Ids.newId(),
                    object.storageKey(),
                    object.filename(),
                    object.contentType(),
                    object.size(),
                    now,
                    actor,
                    agent,
                    now,
                    actor,
                    agent);
        // One statement, so the rows land together; a key another request kept first stays that request's blob.
        insert.onConflict(BLOB.STORAGE_KEY).doNothing().execute();
    }

    @Override
    public Optional<String> findStorageKeyById(String blobId) {
        return dslContext
                .select(BLOB.STORAGE_KEY)
                .from(BLOB)
                .where(BLOB.BLOB_ID.eq(blobId))
                .and(BLOB.DELETED_AT.isNull())
                .fetchOptional(BLOB.STORAGE_KEY);
    }
}
