package io.github.goraebap.bit.module.file.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.DomainRuleViolation;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;

/**
 * A file a member is sending to storage before it belongs to anything. It becomes an attachment when the owning
 * command, such as saving a work item, takes it; one nobody takes within KEPT is removed with its bytes.
 */
@Getter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor(staticName = "fromPersistence")
public class PendingUpload {
    public static final int FILENAME_MAX = 256;
    /** How long an upload waits for its owner before cleanup removes it. */
    public static final Duration KEPT = Duration.ofDays(1);

    @EqualsAndHashCode.Include
    private final String id;

    private final String blobId;
    private final String uploaderId;
    private final String uploaderAgent;
    private final String filename;
    private final FileFormat format;
    private final UploadPurpose purpose;
    private final long size;
    private final String storageKey;
    private final Instant createdAt;
    /** How the picture looks, as the browser measured it; empty for other files. */
    private final ImageTraits traits;

    /**
     * An upload whose format and size suit its purpose. attachmentBytes is the installation's limit for one attached
     * file (STORAGE_MAX_FILE_MB).
     */
    public static PendingUpload create(
            String filename,
            long size,
            String uploaderId,
            String uploaderAgent,
            Instant now,
            UploadPurpose purpose,
            ImageTraits traits,
            long attachmentBytes) {
        String name = validFilename(filename);
        FileFormat format = FileFormat.ofFilename(name)
                .filter(purpose::accepts)
                .orElseThrow(() -> new DomainRuleViolation(
                        purpose == UploadPurpose.picture ? "사진은 JPEG로 올려 주세요" : "올릴 수 없는 파일 형식입니다"));
        if (size <= 0) throw new DomainRuleViolation("빈 파일은 올릴 수 없습니다");
        long limit = purpose.maxBytes(attachmentBytes);
        if (size > limit) throw new DomainRuleViolation("파일은 " + UploadPurpose.limitText(limit) + "까지 올릴 수 있습니다");
        String blobId = Ids.newId();
        var month = now.atZone(ZoneOffset.UTC);
        String key =
                "uploads/%d/%02d/%s.%s".formatted(month.getYear(), month.getMonthValue(), blobId, format.extension());
        return new PendingUpload(
                Ids.newId(),
                blobId,
                uploaderId,
                uploaderAgent,
                name,
                format,
                purpose,
                size,
                key,
                now,
                format.image() ? traits : ImageTraits.NONE);
    }

    public boolean uploadedBy(String userId) {
        return uploaderId.equals(userId);
    }

    public boolean expired(Instant now) {
        return !createdAt.plus(KEPT).isAfter(now);
    }

    private static String validFilename(String raw) {
        if (raw == null || raw.isBlank()) throw new DomainRuleViolation("파일 이름이 필요합니다");
        // Keep only the last path segment some browsers send, and drop control characters.
        String name = raw.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1)
                .replaceAll("\\p{Cntrl}", "")
                .trim();
        if (name.isEmpty() || name.length() > FILENAME_MAX)
            throw new DomainRuleViolation("파일 이름은 1~" + FILENAME_MAX + "자여야 합니다");
        return name;
    }
}
