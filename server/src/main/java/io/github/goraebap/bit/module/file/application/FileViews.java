package io.github.goraebap.bit.module.file.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.net.URI;
import java.time.Instant;
import java.util.Map;

public final class FileViews {
    private FileViews() {}

    /**
     * Where to send the bytes: the browser sends the file with method to url, setting headers, before expiresAt. id is
     * what the owning command, such as saving an issue, takes to bind the file, and what a text points at as
     * {@code attachment:<id>} before it is saved.
     */
    @Schema(requiredProperties = {"id", "url", "method", "headers", "expiresAt"})
    public record UploadTicket(String id, URI url, String method, Map<String, String> headers, Instant expiresAt) {
        public UploadTicket {
            headers = Map.copyOf(headers);
        }
    }

    /**
     * The storage the server found when it started, for the instance admin (D-090). Keys are never shown; endpoint is
     * the address's scheme and host only.
     */
    @Schema(requiredProperties = {"adapter", "available", "checkedAt", "maxFileBytes"})
    public record Storage(
            @Schema(description = "local(데이터 볼륨) 또는 s3(S3 호환: AWS S3·R2·MinIO)")
            String adapter,

            String bucket,
            String endpoint,
            String keyPrefix,
            boolean available,
            @Schema(description = "쓸 수 없을 때 고칠 것") String problem,
            Instant checkedAt,
            long maxFileBytes) {}

    /** A stored file as the query reads it. */
    public record StoredFile(
            String id,
            String ownerId,
            String filename,
            String contentType,
            long size,
            String storageKey,
            String dominantColor,
            Integer width,
            Integer height) {}
}
