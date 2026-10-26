package io.github.goraebap.bit.shared.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Which storage the settings make, and how a storage that cannot be used turns files off instead of the server. */
class StorageConfigTest {
    private static final String SECRET = "storage-config-test-secret-at-least-32-characters";
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-26T00:00:00Z"), ZoneOffset.UTC);

    private final StorageConfig storageConfig = new StorageConfig();

    @TempDir
    Path folder;

    @Test
    void withoutAnEndpointFilesStayOnTheDataVolume() {
        var properties = properties(null, null, null, null, null);
        var storage = storageConfig.objectStorage(properties, SECRET, CLOCK);
        assertThat(storage).isInstanceOf(LocalObjectStorage.class);
        var status = storageConfig.storageStatus(storage, properties, CLOCK);
        assertThat(status.adapter()).isEqualTo(StorageStatus.Adapter.LOCAL);
        assertThat(status.available()).isTrue();
        assertThat(status.problem()).isNull();
        assertThat(status.bucket()).isNull();
        assertThat(status.maxFileBytes()).isEqualTo(20L * 1024 * 1024);
    }

    @Test
    void incompleteS3SettingsTurnFilesOffAndNameWhatIsMissing() {
        var properties = properties("https://account.r2.cloudflarestorage.com", "bit", null, " ", null);
        var storage = storageConfig.objectStorage(properties, SECRET, CLOCK);
        var status = storageConfig.storageStatus(storage, properties, CLOCK);
        assertThat(status.adapter()).isEqualTo(StorageStatus.Adapter.S3);
        assertThat(status.available()).isFalse();
        assertThat(status.problem()).contains("STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY");
        assertThat(status.endpoint()).isEqualTo("https://account.r2.cloudflarestorage.com");
    }

    @Test
    void anS3StorageThatDoesNotAnswerTurnsFilesOffWithoutFallingBackToTheVolume() {
        var properties = properties("http://127.0.0.1:1", "bit", "key-id", "key-secret", "bit/prod/");
        var storage = storageConfig.objectStorage(properties, SECRET, CLOCK);
        assertThat(storage).isInstanceOf(S3ObjectStorage.class);
        var status = storageConfig.storageStatus(storage, properties, CLOCK);
        assertThat(status.available()).isFalse();
        assertThat(status.problem()).contains("STORAGE_ENDPOINT");
        assertThat(status.problem()).doesNotContain("key-secret");
        assertThat(status.keyPrefix()).isEqualTo("bit/prod/");
        ((S3ObjectStorage) storage).close();
    }

    @Test
    void s3SignsTheUploadForTheBrowsersAddressUnderThePrefix() {
        var properties = new StorageProperties(
                "http://minio:9000",
                "https://files.example.test",
                "us-east-1",
                "bit",
                "key-id",
                "key-secret",
                "bit/prod/",
                folder,
                5);
        try (var storage = (S3ObjectStorage) storageConfig.objectStorage(properties, SECRET, CLOCK)) {
            var upload = storage.presignUpload("uploads/2026/10/Abc.png", "image/png", 42, Duration.ofMinutes(10));
            assertThat(upload.method()).isEqualTo("PUT");
            assertThat(upload.url().toString())
                    .startsWith("https://files.example.test/bit/bit/prod/uploads/2026/10/Abc.png?")
                    .contains("X-Amz-Signature=");
            assertThat(upload.headers()).containsEntry("content-type", "image/png");
            assertThat(upload.headers().keySet()).noneMatch(name -> name.equalsIgnoreCase("host"));
            var open = storage.presignDownload(
                    "uploads/a.pdf", "보고서 1.pdf", "application/pdf", true, Duration.ofMinutes(5));
            assertThat(open.toString()).contains("response-content-disposition=attachment");
        }
        assertThat(properties.maxFileBytes()).isEqualTo(5L * 1024 * 1024);
    }

    private StorageProperties properties(
            String endpoint, String bucket, String accessKey, String secretKey, String keyPrefix) {
        return new StorageProperties(endpoint, null, "auto", bucket, accessKey, secretKey, keyPrefix, folder, 0);
    }
}
