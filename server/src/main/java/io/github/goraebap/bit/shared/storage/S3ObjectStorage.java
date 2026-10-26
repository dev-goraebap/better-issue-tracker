package io.github.goraebap.bit.shared.storage;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * ObjectStorage on an S3-compatible service: AWS S3, Cloudflare R2 or MinIO (D-029). The presigner uses the endpoint
 * browsers reach. Every key is put under the installation's prefix in the bucket, so the keys the modules store stay
 * the same whichever bucket or folder holds them.
 */
public final class S3ObjectStorage implements ObjectStorage, AutoCloseable {
    /** Headers the browser sets itself and refuses to take from scripts. */
    private static final Set<String> BROWSER_HEADERS = Set.of("host", "content-length");

    private static final Duration CHECK_TIMEOUT = Duration.ofSeconds(10);

    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;
    private final String prefix;

    public S3ObjectStorage(S3Client client, S3Presigner presigner, String bucket, String prefix) {
        this.client = client;
        this.presigner = presigner;
        this.bucket = bucket;
        this.prefix = prefix == null ? "" : prefix;
    }

    @Override
    public void close() {
        presigner.close();
        client.close();
    }

    @Override
    public PresignedUpload presignUpload(String key, String contentType, long size, Duration ttl) {
        // Signing the type and length makes the storage refuse a different body than the one declared.
        var presigned = presigner.presignPutObject(request -> request.signatureDuration(ttl)
                .putObjectRequest(PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(at(key))
                        .contentType(contentType)
                        .contentLength(size)
                        .build()));
        Map<String, String> headers = new LinkedHashMap<>();
        presigned.signedHeaders().forEach((name, values) -> {
            if (!BROWSER_HEADERS.contains(name.toLowerCase(Locale.ROOT)) && !values.isEmpty())
                headers.put(name, values.get(0));
        });
        return new PresignedUpload(
                URI.create(presigned.url().toString()),
                presigned.httpRequest().method().name(),
                headers,
                presigned.expiration());
    }

    @Override
    public URI presignDownload(String key, String filename, String contentType, boolean download, Duration ttl) {
        var presigned = presigner.presignGetObject(request -> request.signatureDuration(ttl)
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(at(key))
                        .responseContentType(contentType)
                        .responseContentDisposition(Disposition.of(filename, download))
                        .build()));
        return URI.create(presigned.url().toString());
    }

    @Override
    public Optional<StoredObject> find(String key) {
        try {
            var head = client.headObject(
                    HeadObjectRequest.builder().bucket(bucket).key(at(key)).build());
            return Optional.of(new StoredObject(head.contentLength(), head.contentType()));
        } catch (NoSuchKeyException e) {
            return Optional.empty();
        } catch (S3Exception e) {
            if (e.statusCode() == 404) return Optional.empty();
            throw e;
        }
    }

    @Override
    public byte[] readStart(String key, int length) {
        return client.getObject(
                        GetObjectRequest.builder()
                                .bucket(bucket)
                                .key(at(key))
                                .range("bytes=0-" + (length - 1))
                                .build(),
                        ResponseTransformer.toBytes())
                .asByteArray();
    }

    @Override
    public InputStream open(String key) {
        return client.getObject(
                GetObjectRequest.builder().bucket(bucket).key(at(key)).build());
    }

    @Override
    public void delete(String key) {
        client.deleteObject(request -> request.bucket(bucket).key(at(key)));
    }

    /** The bucket answers with these keys; a wrong key, bucket or address fails here rather than on the first upload. */
    @Override
    public void check() {
        client.headBucket(request ->
                request.bucket(bucket).overrideConfiguration(config -> config.apiCallTimeout(CHECK_TIMEOUT)));
    }

    private String at(String key) {
        return prefix + key;
    }
}
