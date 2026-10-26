package io.github.goraebap.bit.module.file.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.file.DocumentFiles;
import io.github.goraebap.bit.shared.error.DomainRuleViolation;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PendingUploadTest {
    private static final Instant NOW = Instant.parse("2026-10-26T00:00:00Z");
    private static final long LIMIT = 20L * 1024 * 1024;

    @Test
    void theExtensionDecidesTheFormatAndTheLimitTheSize() {
        var upload = create("C:\\fakepath\\보고서.HWP", 100, UploadPurpose.attachment, ImageTraits.NONE);
        assertThat(upload.filename()).isEqualTo("보고서.HWP");
        assertThat(upload.format()).isEqualTo(FileFormat.HWP);
        assertThat(upload.storageKey()).matches("uploads/2026/10/[A-Za-z][A-Za-z0-9]{9}\\.hwp");
        assertThat(upload.expired(NOW.plusSeconds(86_399))).isFalse();
        assertThat(upload.expired(NOW.plusSeconds(86_400))).isTrue();

        assertThatThrownBy(() -> create("a.svg", 1, UploadPurpose.attachment, ImageTraits.NONE))
                .isInstanceOf(DomainRuleViolation.class);
        assertThatThrownBy(() -> create("a.mp3", 1, UploadPurpose.attachment, ImageTraits.NONE))
                .isInstanceOf(DomainRuleViolation.class);
        assertThatThrownBy(() -> create("noextension", 1, UploadPurpose.attachment, ImageTraits.NONE))
                .isInstanceOf(DomainRuleViolation.class);
        assertThatThrownBy(() -> create("a.pdf", LIMIT + 1, UploadPurpose.attachment, ImageTraits.NONE))
                .hasMessageContaining("20MB");
        assertThatThrownBy(() -> create("me.png", 10, UploadPurpose.picture, ImageTraits.NONE))
                .hasMessageContaining("JPEG");
        assertThatThrownBy(() -> create("me.jpg", 1024 * 1024 + 1, UploadPurpose.picture, ImageTraits.NONE))
                .hasMessageContaining("1MB");
    }

    @Test
    void onlyPicturesKeepWhatTheBrowserMeasured() {
        var traits = ImageTraits.of("#AABBCC", 4, 3);
        assertThat(create("a.webp", 10, UploadPurpose.attachment, traits).traits())
                .isEqualTo(new ImageTraits("#aabbcc", 4, 3));
        assertThat(create("a.pdf", 10, UploadPurpose.attachment, traits).traits())
                .isEqualTo(ImageTraits.NONE);
        assertThatThrownBy(() -> ImageTraits.of("blue", null, null)).isInstanceOf(DomainRuleViolation.class);
        assertThatThrownBy(() -> ImageTraits.of(null, 4, null)).isInstanceOf(DomainRuleViolation.class);
    }

    @Test
    void storedBytesMustStartAsTheirFormatDoes() {
        assertThat(FileFormat.PDF.matches("%PDF-1.7".getBytes(StandardCharsets.US_ASCII)))
                .isTrue();
        assertThat(FileFormat.PNG.matches("<html>".getBytes(StandardCharsets.US_ASCII)))
                .isFalse();
        assertThat(FileFormat.WEBP.matches("RIFF\0\0\0\0WEBP".getBytes(StandardCharsets.US_ASCII)))
                .isTrue();
        assertThat(FileFormat.WEBP.matches("RIFF\0\0\0\0WAVE".getBytes(StandardCharsets.US_ASCII)))
                .isFalse();
        assertThat(FileFormat.TXT.matches("plain log".getBytes(StandardCharsets.US_ASCII)))
                .isTrue();
        assertThat(FileFormat.CSV.matches(new byte[] {'a', 0, 'b'})).isFalse();
        assertThat(FileFormat.DOCX.matches(new byte[] {0x50, 0x4B, 0x03, 0x04})).isTrue();
    }

    @Test
    void textsPointAtTheirFilesByAttachmentId() {
        String text = "![화면.png](attachment:Abcdefghij) and [자료.pdf](attachment:Zyxwvutsr0) and "
                + "![again](attachment:Abcdefghij) but not [x](attachment:0bad) or [y](https://example.test)";
        assertThat(DocumentFiles.referencedIn(text)).containsExactly("Abcdefghij", "Zyxwvutsr0");
        assertThat(DocumentFiles.repoint(text, Map.of("Abcdefghij", "Newnewnew1")))
                .contains("![화면.png](attachment:Newnewnew1)", "![again](attachment:Newnewnew1)")
                .contains("[자료.pdf](attachment:Zyxwvutsr0)");
    }

    private static PendingUpload create(String filename, long size, UploadPurpose purpose, ImageTraits traits) {
        return PendingUpload.create(filename, size, "Uploader01", null, NOW, purpose, traits, LIMIT);
    }
}
