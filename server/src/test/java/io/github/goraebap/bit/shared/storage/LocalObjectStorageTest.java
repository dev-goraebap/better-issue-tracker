package io.github.goraebap.bit.shared.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Proxy;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

class LocalObjectStorageTest {
    private static final String SECRET = "local-storage-test-secret-at-least-32-characters";
    private static final Instant NOW = Instant.parse("2026-10-26T00:00:00Z");

    @TempDir
    Path folder;

    @Test
    void aSignedUploadStoresExactlyWhatItAllowsAndOpensUntilItExpires() {
        var storage = new LocalObjectStorage(folder, SECRET, Clock.fixed(NOW, ZoneOffset.UTC));
        byte[] bytes = "hello".getBytes(StandardCharsets.UTF_8);
        var upload = storage.presignUpload("uploads/../../a.txt", "text/plain", bytes.length, Duration.ofMinutes(10));
        assertThat(upload.headers()).containsEntry("Content-Type", "text/plain");

        var params = params(upload.url().getRawQuery());
        assertThatThrownBy(() -> storage.put(params, "text/html", bytes.length, new ByteArrayInputStream(bytes)))
                .isInstanceOf(LocalObjectStorage.Refused.class);
        assertThatThrownBy(() -> storage.put(params, "text/plain", 4, new ByteArrayInputStream(bytes)))
                .isInstanceOf(LocalObjectStorage.Refused.class);
        var forged = new LinkedHashMap<>(params);
        forged.put("size", "9999");
        assertThatThrownBy(() -> storage.put(forged, "text/plain", 9999, new ByteArrayInputStream(bytes)))
                .isInstanceOf(LocalObjectStorage.Refused.class);

        storage.put(params, "text/plain", bytes.length, new ByteArrayInputStream(bytes));
        assertThat(storage.find("uploads/../../a.txt")).hasValue(new ObjectStorage.StoredObject(5, "text/plain"));
        assertThat(storage.readStart("uploads/../../a.txt", 2)).isEqualTo("he".getBytes(StandardCharsets.UTF_8));
        // Whatever the key holds, the file stays inside the folder.
        try (var files = java.nio.file.Files.walk(folder)) {
            assertThat(files.filter(java.nio.file.Files::isRegularFile)).allMatch(file -> file.startsWith(folder));
        } catch (java.io.IOException e) {
            throw new java.io.UncheckedIOException(e);
        }

        var open = params(
                storage.presignDownload("uploads/../../a.txt", "인사 말.txt", "text/plain", false, Duration.ofMinutes(5))
                        .getRawQuery());
        assertThat(storage.get(open)).hasValueSatisfying(download -> {
            assertThat(download.contentType()).isEqualTo("text/plain");
            assertThat(download.disposition()).isEqualTo("inline; filename*=UTF-8''%EC%9D%B8%EC%82%AC%20%EB%A7%90.txt");
        });
        var later = new LocalObjectStorage(folder, SECRET, Clock.fixed(NOW.plusSeconds(301), ZoneOffset.UTC));
        assertThatThrownBy(() -> later.get(open)).isInstanceOf(LocalObjectStorage.Refused.class);
        var otherServer = new LocalObjectStorage(
                folder, "another-secret-for-local-storage-at-least-32", Clock.fixed(NOW, ZoneOffset.UTC));
        assertThatThrownBy(() -> otherServer.get(open)).isInstanceOf(LocalObjectStorage.Refused.class);

        storage.delete("uploads/../../a.txt");
        storage.delete("uploads/../../a.txt");
        assertThat(storage.find("uploads/../../a.txt")).isEmpty();
    }

    @Test
    void theServerPutsWhatItHoldsWholeOrNotAtAll() throws Exception {
        var storage = new LocalObjectStorage(folder, SECRET, Clock.fixed(NOW, ZoneOffset.UTC));
        byte[] bytes = "body{}".getBytes(StandardCharsets.UTF_8);
        storage.put("blobs/sha256/ab", "text/css", bytes.length, new ByteArrayInputStream(bytes));
        assertThat(storage.find("blobs/sha256/ab")).hasValue(new ObjectStorage.StoredObject(6, "text/css"));
        try (var in = storage.open("blobs/sha256/ab")) {
            assertThat(in.readAllBytes()).isEqualTo(bytes);
        }

        assertThatThrownBy(() -> storage.put("blobs/sha256/cd", "text/css", 99, new ByteArrayInputStream(bytes)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(storage.find("blobs/sha256/cd")).isEmpty();
    }

    @Test
    void anS3PutSendsTheTypeAndLengthUnderThePrefix() {
        var sent = new java.util.ArrayList<PutObjectRequest>();
        var client = (S3Client) Proxy.newProxyInstance(
                S3Client.class.getClassLoader(), new Class<?>[] {S3Client.class}, (proxy, method, args) -> {
                    if (method.getName().equals("putObject")
                            && args.length == 2
                            && args[0] instanceof PutObjectRequest request
                            && args[1] instanceof RequestBody) {
                        sent.add(request);
                        return PutObjectResponse.builder().build();
                    }
                    throw new UnsupportedOperationException(method.getName());
                });
        var storage = new S3ObjectStorage(client, null, "bucket", "bit/");
        byte[] bytes = "alert(1)".getBytes(StandardCharsets.UTF_8);
        storage.put("blobs/sha256/ef", "text/javascript", bytes.length, new ByteArrayInputStream(bytes));
        assertThat(sent).singleElement().satisfies(request -> {
            assertThat(request.bucket()).isEqualTo("bucket");
            assertThat(request.key()).isEqualTo("bit/blobs/sha256/ef");
            assertThat(request.contentType()).isEqualTo("text/javascript");
            assertThat(request.contentLength()).isEqualTo(8L);
        });
    }

    @Test
    void theCheckMakesTheFolderAndWritesIntoIt() {
        var storage = new LocalObjectStorage(folder.resolve("files"), SECRET, Clock.systemUTC());
        storage.check();
        assertThat(folder.resolve("files")).isDirectory().isEmptyDirectory();
    }

    private static Map<String, String> params(String query) {
        Map<String, String> params = new LinkedHashMap<>();
        for (String pair : query.split("&")) {
            int equals = pair.indexOf('=');
            params.put(
                    pair.substring(0, equals), URLDecoder.decode(pair.substring(equals + 1), StandardCharsets.UTF_8));
        }
        return params;
    }
}
