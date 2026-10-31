package io.github.goraebap.bit.module.document.domain;

/**
 * How much one bundle may unpack to, from the installation's attachment limit (2026-10-30 user decision): the zip itself
 * is held to that limit by its upload, the unpacked files to UNPACK_RATIO times it, and one HTML file, which is read
 * whole, to the limit again.
 */
public record PageLimits(long unpackedBytes, int files, long htmlBytes) {
    public static final int FILES = 500;
    public static final int UNPACK_RATIO = 5;

    public static PageLimits forAttachmentLimit(long attachmentBytes) {
        return new PageLimits(attachmentBytes * UNPACK_RATIO, FILES, attachmentBytes);
    }
}
