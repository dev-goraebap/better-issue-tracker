package io.github.goraebap.bit.module.file.domain;

import io.github.goraebap.bit.module.file.FileOwner;
import io.github.goraebap.bit.shared.error.DomainRuleViolation;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;

/**
 * A stored file bound to what owns it, such as a work item. The owning module decides who may open it. The file itself is
 * the blob the upload wrote.
 */
@Getter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor(staticName = "fromPersistence")
public class Attachment {
    @EqualsAndHashCode.Include
    private final String id;

    private final String blobId;
    private final FileOwner owner;
    private final String ownerId;
    private final int position;
    private final String filename;
    private final FileFormat format;
    private final long size;
    private final String storageKey;
    private final String createdBy;
    private final String createdByAgent;
    private final ImageTraits traits;

    /**
     * Binds an upload to its owner once the storage holds size bytes starting as its format does; start is the
     * beginning of the stored file and attachmentBytes the installation's limit. The file keeps its upload's id, so a
     * text written before it is saved can already point at it ({@code attachment:<id>}).
     */
    public static Attachment bind(
            PendingUpload upload,
            FileOwner owner,
            String ownerId,
            int position,
            long size,
            byte[] start,
            long attachmentBytes) {
        if (owner == null || ownerId == null) throw new DomainRuleViolation("첨부할 대상이 없습니다");
        // The stored bytes may not exceed the limit, whatever size the browser announced.
        if (size <= 0 || size > attachmentBytes)
            throw new DomainRuleViolation("파일은 " + UploadPurpose.limitText(attachmentBytes) + "까지 올릴 수 있습니다");
        if (!upload.format().matches(start)) throw new DomainRuleViolation(upload.filename() + "의 내용이 파일 형식과 맞지 않습니다");
        return new Attachment(
                upload.id(),
                upload.blobId(),
                owner,
                ownerId,
                position,
                upload.filename(),
                upload.format(),
                size,
                upload.storageKey(),
                upload.uploaderId(),
                upload.uploaderAgent(),
                upload.traits());
    }

    /**
     * Refuses an upload that cannot be a picture before its bytes are read: a picture is a JPEG no larger than
     * PICTURE_BYTES, whose stored bytes start as a JPEG does.
     */
    public static void requirePicture(PendingUpload upload, long size, byte[] start) {
        if (!UploadPurpose.picture.accepts(upload.format())) throw new DomainRuleViolation("사진은 JPEG로 올려 주세요");
        if (size <= 0 || size > UploadPurpose.PICTURE_BYTES)
            throw new DomainRuleViolation(
                    "사진은 " + UploadPurpose.limitText(UploadPurpose.PICTURE_BYTES) + "까지 올릴 수 있습니다");
        if (!upload.format().matches(start)) throw new DomainRuleViolation(upload.filename() + "의 내용이 파일 형식과 맞지 않습니다");
    }

    /**
     * Binds an upload as the owner's only picture, a square of side pixels. width and height are what decoding the
     * stored bytes gave, not what the browser said. The picture keeps its upload's id.
     */
    public static Attachment bindPicture(
            PendingUpload upload,
            FileOwner owner,
            String ownerId,
            long size,
            byte[] start,
            int width,
            int height,
            int side) {
        if (owner == null || ownerId == null) throw new DomainRuleViolation("첨부할 대상이 없습니다");
        requirePicture(upload, size, start);
        if (width != side || height != side) throw new DomainRuleViolation("사진은 %d×%d 크기여야 합니다".formatted(side, side));
        return new Attachment(
                upload.id(),
                upload.blobId(),
                owner,
                ownerId,
                0,
                upload.filename(),
                upload.format(),
                size,
                upload.storageKey(),
                upload.uploaderId(),
                upload.uploaderAgent(),
                upload.traits().measured(width, height));
    }
}
