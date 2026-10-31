package io.github.goraebap.bit.module.document.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.error.DomainRuleViolation;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class PageDocumentTest {
    private static final Instant NOW = Instant.parse("2026-10-31T00:00:00Z");

    @Test
    void aPageRefusesABodyChangeButTakesItsTitleAndLabels() {
        var page = Document.createPage(
                "Ws00000001", null, null, "시안", Set.of(), new PageText("본문 글자"), "U000000001", null, NOW);
        assertThat(page.kind()).isEqualTo(DocumentKind.page);
        assertThat(page.body()).isEqualTo("본문 글자");
        assertThatThrownBy(() -> page.revise("시안", "고친 본문", Set.of(), "U000000001", null, NOW))
                .isInstanceOf(PageBodyIsDerived.class)
                .hasMessageContaining("update_page");
        assertThat(page.body()).isEqualTo("본문 글자");
        page.revise("시안 (확정)", "본문 글자", Set.of("L000000001"), "U000000001", null, NOW);
        assertThat(page.title()).isEqualTo("시안 (확정)");
        assertThat(page.version()).isEqualTo(1);

        page.publish(new PageText("두 번째"), "U000000001", "codex", NOW);
        assertThat(page.body()).isEqualTo("두 번째");
        assertThat(page.version()).isEqualTo(2);
        page.publish(new PageText("두 번째"), "U000000001", "codex", NOW);
        assertThat(page.version()).as("a new version always moves the document").isEqualTo(3);
    }

    @Test
    void onlyCreatePageMakesAPageAndOnlyAPageHasVersions() {
        var markdown = Document.create("Ws00000001", null, null, "메모", "# 제목", Set.of(), "U000000001", null, NOW);
        assertThat(markdown.kind()).isEqualTo(DocumentKind.markdown);
        markdown.revise("메모", "고침", Set.of(), "U000000001", null, NOW);
        assertThat(markdown.body()).isEqualTo("고침");
        assertThatThrownBy(() -> markdown.publish(new PageText("x"), "U000000001", null, NOW))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void filesAndVersionNotesKeepTheirShape() {
        var html = PagePath.parse("index.html");
        assertThat(new PageFile(PagePath.parse("empty.css"), PageFileType.CSS, 0, null, null).blobId())
                .isNull();
        assertThatThrownBy(() -> new PageFile(html, PageFileType.HTML, 0, "B000000001", 0L))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PageFile(html, PageFileType.HTML, 10, "B000000001", null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PageFile(html, PageFileType.HTML, 10, "B000000001", 11L))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PageFile(PagePath.parse("a.css"), PageFileType.CSS, 10, "B000000001", 0L))
                .isInstanceOf(IllegalArgumentException.class);

        var meta = new PageVersionMeta("  카드 간격 줄임 ", "625C75F");
        assertThat(meta.note()).isEqualTo("카드 간격 줄임");
        assertThat(meta.baseCommit()).isEqualTo("625c75f");
        assertThat(new PageVersionMeta(" ", "")).isEqualTo(new PageVersionMeta(null, null));
        assertThatThrownBy(() -> new PageVersionMeta("두\n줄", null)).isInstanceOf(DomainRuleViolation.class);
        assertThatThrownBy(() -> new PageVersionMeta("x".repeat(201), null)).isInstanceOf(DomainRuleViolation.class);
        assertThatThrownBy(() -> new PageVersionMeta(null, "abc")).isInstanceOf(DomainRuleViolation.class);
        assertThatThrownBy(() -> new PageVersionMeta(null, "zzzzzzz")).isInstanceOf(DomainRuleViolation.class);

        var bundle = new StoredBundle(
                html,
                List.of(new PageFile(html, PageFileType.HTML, 10, "B000000001", 0L)),
                new PageText(""),
                List.of());
        var first = PageVersion.next("D000000001", 0, bundle, meta, "Up00000001", "U000000001", null, NOW);
        assertThat(first.number()).isEqualTo(1);
        assertThat(PageVersion.next("D000000001", 4, bundle, meta, "Up00000002", "U000000001", null, NOW)
                        .number())
                .isEqualTo(5);
        var made = new PageVersion.Made(first.id(), "D000000001", 2);
        assertThat(made.requireOf("D000000001")).isEqualTo(made);
        assertThatThrownBy(() -> made.requireOf("D000000002")).isInstanceOf(DomainRuleViolation.class);
        assertThatThrownBy(made::requireFirst).isInstanceOf(DomainRuleViolation.class);
    }
}
