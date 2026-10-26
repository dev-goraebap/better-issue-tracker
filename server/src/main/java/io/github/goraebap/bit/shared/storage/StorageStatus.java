package io.github.goraebap.bit.shared.storage;

import java.time.Instant;

/**
 * What the server found when it started: which storage the settings name, and whether it answered (D-090). Files are
 * off while available is false; a storage that did not answer never falls back to the local folder, since files would
 * then be split between two places. problem says what to fix and never holds a key.
 */
public record StorageStatus(
        Adapter adapter,
        String bucket,
        String endpoint,
        String keyPrefix,
        boolean available,
        String problem,
        Instant checkedAt,
        long maxFileBytes) {
    public enum Adapter {
        LOCAL,
        S3
    }
}
