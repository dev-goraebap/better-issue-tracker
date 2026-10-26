package io.github.goraebap.bit.module.file.domain;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The formats a file may take (D-090): documents, pictures, archives and plain text, but no recordings and no SVG, whose
 * scripts would need sanitizing first. The format comes from the file name's extension, since browsers often report
 * HWP or Office files as a generic type, and the stored bytes must then start the way that format does. Pictures are
 * not decoded when attached; they are served under the type named here, never as a page.
 */
public enum FileFormat {
    PDF("application/pdf", Signature.PDF, false, "pdf"),
    JPEG("image/jpeg", Signature.JPEG, true, "jpg", "jpeg"),
    PNG("image/png", Signature.PNG, true, "png"),
    WEBP("image/webp", Signature.WEBP, true, "webp"),
    GIF("image/gif", Signature.GIF, true, "gif"),
    HWP("application/x-hwp", Signature.OLE, false, "hwp"),
    HWPX("application/vnd.hancom.hwpx", Signature.ZIP, false, "hwpx"),
    DOC("application/msword", Signature.OLE, false, "doc"),
    DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document", Signature.ZIP, false, "docx"),
    XLS("application/vnd.ms-excel", Signature.OLE, false, "xls"),
    XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Signature.ZIP, false, "xlsx"),
    PPT("application/vnd.ms-powerpoint", Signature.OLE, false, "ppt"),
    PPTX("application/vnd.openxmlformats-officedocument.presentationml.presentation", Signature.ZIP, false, "pptx"),
    ZIP("application/zip", Signature.ZIP, false, "zip"),
    MARKDOWN("text/markdown", Signature.TEXT, false, "md", "markdown"),
    TXT("text/plain", Signature.TEXT, false, "txt", "log"),
    CSV("text/csv", Signature.TEXT, false, "csv");

    /** Bytes read from the start of a stored file, enough for every signature below. */
    public static final int SIGNATURE_LENGTH = 12;

    private final String contentType;
    private final Signature signature;
    private final boolean image;
    private final List<String> extensions;

    FileFormat(String contentType, Signature signature, boolean image, String... extensions) {
        this.contentType = contentType;
        this.signature = signature;
        this.image = image;
        this.extensions = List.of(extensions);
    }

    public static Optional<FileFormat> ofFilename(String filename) {
        if (filename == null) return Optional.empty();
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return Optional.empty();
        String extension = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(format -> format.extensions.contains(extension))
                .findFirst();
    }

    public static Optional<FileFormat> ofContentType(String contentType) {
        return Arrays.stream(values())
                .filter(format -> format.contentType.equals(contentType))
                .findFirst();
    }

    public String contentType() {
        return contentType;
    }

    public String extension() {
        return extensions.get(0);
    }

    public boolean image() {
        return image;
    }

    /** Whether the first bytes of a file are those of this format. */
    public boolean matches(byte[] start) {
        return signature.matches(start);
    }

    private enum Signature {
        PDF(0, "%PDF-".getBytes(StandardCharsets.US_ASCII)),
        JPEG(0, bytes(0xFF, 0xD8, 0xFF)),
        PNG(0, bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)),
        GIF(0, "GIF8".getBytes(StandardCharsets.US_ASCII)),
        /** RIFF containers; the format name sits after the size field. */
        WEBP(8, "WEBP".getBytes(StandardCharsets.US_ASCII)),
        /** Compound documents: HWP 5, DOC, XLS and PPT. */
        OLE(0, bytes(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1)),
        /** Zip containers: HWPX, DOCX, XLSX, PPTX and plain zips. */
        ZIP(0, bytes(0x50, 0x4B, 0x03, 0x04)),
        /** Plain text (Markdown, CSV, logs): no fixed start, only no NUL byte where a binary file would have one. */
        TEXT(0, new byte[0]);

        private final int offset;
        private final byte[] expected;

        Signature(int offset, byte[] expected) {
            this.offset = offset;
            this.expected = expected;
        }

        boolean matches(byte[] start) {
            if (start == null) return false;
            if (this == TEXT) {
                for (byte value : start) if (value == 0) return false;
                return true;
            }
            if (start.length < offset + expected.length) return false;
            if (this == WEBP && !(start[0] == 'R' && start[1] == 'I' && start[2] == 'F' && start[3] == 'F'))
                return false;
            for (int i = 0; i < expected.length; i++) if (start[offset + i] != expected[i]) return false;
            return true;
        }

        private static byte[] bytes(int... values) {
            byte[] result = new byte[values.length];
            for (int i = 0; i < values.length; i++) result[i] = (byte) values[i];
            return result;
        }
    }
}
