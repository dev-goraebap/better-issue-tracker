package io.github.goraebap.bit.module.file.domain;

import io.github.goraebap.bit.module.file.FileOwner;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;

public interface AttachmentRepository {
    /** Stores each attachment with the blob it points to. */
    void saveAll(List<Attachment> attachments);

    /** Marks the owner's given attachments deleted; their bytes stay until storage is cleaned. */
    void deleteOfOwner(FileOwner owner, String ownerId, Collection<String> attachmentIds, String actor, String agent);

    /**
     * Marks the given attachments' blobs discarded, meaning their bytes must go from storage, unless another attachment
     * still kept shares the blob; returns the storage keys of the blobs discarded.
     */
    List<String> discardBlobs(Collection<String> attachmentIds, String actor, String agent);

    /**
     * Gives another owner its own attachment for each of the given ones of an owner, under the new ids given, sharing
     * the same blob; ids the owner does not keep are skipped. They go after the new owner's files, in the order given.
     */
    void copy(
            FileOwner owner,
            String fromOwnerId,
            String toOwnerId,
            Map<String, String> newIds,
            String actor,
            String agent);

    /** Storage keys of blobs discarded since the given time, to delete again in case an earlier delete failed. */
    List<String> discardedKeysSince(Instant since, int limit);
}
