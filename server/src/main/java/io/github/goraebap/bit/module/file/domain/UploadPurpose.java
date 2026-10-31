package io.github.goraebap.bit.module.file.domain;

/**
 * What an upload is for, which decides the formats and size it may have (D-090): a file attached to a work item or a
 * comment, up to the installation's limit (STORAGE_MAX_FILE_MB), a member's or workspace's picture, which the browser
 * has already cut to a small square JPEG, or a page's bundle (D-113): one zip, up to the attachment limit, that only a
 * page command reads and that never becomes an attachment.
 */
public enum UploadPurpose {
    attachment,
    picture,
    page;

    public static final long PICTURE_BYTES = 1024L * 1024;

    /** Whether the format may be sent for this purpose. */
    public boolean accepts(FileFormat format) {
        return switch (this) {
            case attachment -> true;
            case picture -> format == FileFormat.JPEG;
            case page -> format == FileFormat.ZIP;
        };
    }

    /** The most an upload for this purpose may weigh, given the installation's limit for attachments. */
    public long maxBytes(long attachmentBytes) {
        return this == picture ? PICTURE_BYTES : attachmentBytes;
    }

    /** How the limit reads to a member, such as 20MB. */
    public static String limitText(long bytes) {
        long megabytes = bytes / (1024L * 1024);
        return megabytes >= 1 && bytes % (1024L * 1024) == 0 ? megabytes + "MB" : (bytes / 1024) + "KB";
    }
}
