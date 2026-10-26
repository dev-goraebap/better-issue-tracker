package io.github.goraebap.bit.shared.storage;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where files live (D-029, D-090): S3-compatible storage when endpoint is set (AWS S3, Cloudflare R2, MinIO), otherwise
 * files under localRoot on this machine. publicEndpoint is where browsers reach signed URLs and may differ from the
 * endpoint the server uses, for example behind a proxy. keyPrefix is the folder of the bucket this installation keeps
 * its objects in; stored keys leave it out. maxFileMb is the most one attached file may weigh.
 */
@ConfigurationProperties("app.storage")
public record StorageProperties(
        String endpoint,
        String publicEndpoint,
        String region,
        String bucket,
        String accessKey,
        String secretKey,
        String keyPrefix,
        Path localRoot,
        int maxFileMb) {
    public static final int DEFAULT_MAX_FILE_MB = 20;

    public StorageProperties {
        localRoot = localRoot == null ? Path.of("./data/files") : localRoot;
        maxFileMb = maxFileMb < 1 ? DEFAULT_MAX_FILE_MB : maxFileMb;
    }

    public boolean s3() {
        return present(endpoint);
    }

    public long maxFileBytes() {
        return maxFileMb * 1024L * 1024L;
    }

    static boolean present(String value) {
        return value != null && !value.isBlank();
    }
}
