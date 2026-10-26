package io.github.goraebap.bit.shared.storage;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/**
 * Plain object I/O on the private bucket or folder. It knows nothing of who may read what: callers authorize first and
 * hand out the short-lived URLs this gives.
 */
public interface ObjectStorage {

    /** A URL the browser sends the bytes to with the given method and headers before expiresAt. */
    record PresignedUpload(URI url, String method, Map<String, String> headers, Instant expiresAt) {
        public PresignedUpload {
            headers = Map.copyOf(headers);
        }
    }

    /** What the storage holds for a key. */
    record StoredObject(long size, String contentType) {}

    PresignedUpload presignUpload(String key, String contentType, long size, Duration ttl);

    /** A URL that opens the object under the given name; download asks the browser to save it rather than show it. */
    URI presignDownload(String key, String filename, String contentType, boolean download, Duration ttl);

    Optional<StoredObject> find(String key);

    /** The first bytes of the object, at most length of them, to tell its real format. */
    byte[] readStart(String key, int length);

    /** The whole object as a stream; the caller closes it. */
    InputStream open(String key);

    /** Removes the object; removing one that is not there succeeds. */
    void delete(String key);

    /** Fails with what is wrong when the storage cannot be reached or written, so the server can turn files off. */
    void check();
}
