package io.github.goraebap.bit.shared.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
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
