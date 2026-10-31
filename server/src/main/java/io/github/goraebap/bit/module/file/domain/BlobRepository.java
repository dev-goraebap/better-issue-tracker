package io.github.goraebap.bit.module.file.domain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Blobs kept without an attachment, such as a page version's files: content-addressed, never discarded. */
public interface BlobRepository {
    /** A blob to keep once its bytes are in storage under storageKey. */
    record KeptObject(String storageKey, String filename, String contentType, long size) {}

    /** The ids of the blobs stored under the given keys, by key; keys without a blob are left out. */
    Map<String, String> findIdsByStorageKey(Collection<String> storageKeys);

    /** Adds a blob for each object whose key has none yet; a key that already has one keeps it. */
    void saveAllIfAbsent(List<KeptObject> objects, String actor, String agent);

    Optional<String> findStorageKeyById(String blobId);
}
