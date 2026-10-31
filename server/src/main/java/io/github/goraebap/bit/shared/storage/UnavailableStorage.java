package io.github.goraebap.bit.shared.storage;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;

/**
 * Stands in when the S3 settings are incomplete, so the server still starts with files off (D-030). Callers check
 * StorageStatus first; reaching this is a programming error.
 */
final class UnavailableStorage implements ObjectStorage {
    private final String problem;

    UnavailableStorage(String problem) {
        this.problem = problem;
    }

    @Override
    public PresignedUpload presignUpload(String key, String contentType, long size, Duration ttl) {
        throw refused();
    }

    @Override
    public URI presignDownload(String key, String filename, String contentType, boolean download, Duration ttl) {
        throw refused();
    }

    @Override
    public Optional<StoredObject> find(String key) {
        throw refused();
    }

    @Override
    public byte[] readStart(String key, int length) {
        throw refused();
    }

    @Override
    public InputStream open(String key) {
        throw refused();
    }

    @Override
    public void put(String key, String contentType, long size, InputStream body) {
        throw refused();
    }

    @Override
    public void delete(String key) {
        throw refused();
    }

    @Override
    public void check() {
        throw refused();
    }

    private IllegalStateException refused() {
        return new IllegalStateException(problem);
    }
}
