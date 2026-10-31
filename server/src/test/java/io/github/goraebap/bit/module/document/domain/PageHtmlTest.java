package io.github.goraebap.bit.module.document.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class PageHtmlTest {
    private static final PagePath INDEX = PagePath.parse("index.html");

    @Test
    void bitsTagsGoAfterTheOpeningTagsAndNeverBeforeTheDoctype() {
        assertThat(at("<!doctype html><html lang=\"ko\"><head><title>x"))
                .isEqualTo(after("<head>", "<!doctype html><html lang=\"ko\"><head><title>x"));
        assertThat(at("﻿<!DOCTYPE html>\n<HTML>\n<HEAD data-x=\"a>b\">\n<title>"))
                .isEqualTo(bytes("﻿<!DOCTYPE html>\n<HTML>\n<HEAD data-x=\"a>b\">").length);
        assertThat(at("<!-- made by an agent --><!doctype html><body>"))
                .isEqualTo(bytes("<!-- made by an agent --><!doctype html>").length);
        assertThat(at("<!doctype html><html><body>x")).isEqualTo(bytes("<!doctype html><html>").length);
        assertThat(at("<p>fragment</p>")).isZero();
        assertThat(at("<header>x</header>")).as("a header is not a head").isZero();
        assertThat(at("﻿<p>")).isEqualTo(3);
        String longComment = "<!doctype html><!--" + "x".repeat(70_000) + "--><html><head>";
        assertThat(at(longComment)).isEqualTo(bytes(longComment).length);
        assertThat(at("<!doctype html><!-- never closed")).isEqualTo(bytes("<!doctype html>").length);
        assertThat(at("")).isZero();
    }

    @Test
    void aDataBitIdRepeatedInOneFileIsRefusedNamingTheFileAndTheId() {
        String html = "<section data-bit-id=\"intro\"></section><div data-bit-id=\"intro\"></div>";
        assertThatThrownBy(() -> PageHtml.inspect(PagePath.parse("docs/a.html"), bytes(html), false))
                .isInstanceOf(PageBundleRejected.class)
                .hasMessageContaining("docs/a.html")
                .hasMessageContaining("intro");
        var facts = PageHtml.inspect(INDEX, bytes("<div data-bit-id=\"a\"></div><div data-bit-id=\"b\"></div>"), false);
        assertThat(facts.text()).isEmpty();
    }

    @Test
    void theEntryTextLeavesOutScriptAndStyleAndExternalAddressesAreListed() {
        String html = "<!doctype html><html><head>"
                + "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/gh/orioncactus/pretendard/pretendard.css\">"
                + "<style>@import url('//fonts.example/x.css'); body{background:url(img/bg.png)}</style>"
                + "<script src=\"app.js\"></script><script>var hidden = '보이지 않음';</script></head>"
                + "<body><h1>문서함   시안</h1>\n<p>카드 <b>간격</b></p>"
                + "<a href=\"https://example.com\">바깥 링크</a><img srcset=\"https://img.example/a.png 2x, b.png 1x\">"
                + "</body></html>";
        var facts = PageHtml.inspect(INDEX, bytes(html), true);
        assertThat(facts.text())
                .hasValueSatisfying(text -> assertThat(text.value()).isEqualTo("문서함 시안 카드 간격 바깥 링크"));
        assertThat(facts.externalUrls())
                .containsExactlyInAnyOrder(
                        "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/pretendard.css",
                        "//fonts.example/x.css",
                        "https://img.example/a.png");
        assertThat(facts.injectAt()).isEqualTo(bytes("<!doctype html><html><head>").length);
    }

    @Test
    void theTextIsCutToWhatABodyHolds() {
        var text = new PageText("가".repeat(Document.BODY_MAX + 10));
        assertThat(text.value()).hasSize(Document.BODY_MAX);
        assertThat(new PageText("a".repeat(Document.BODY_MAX - 1) + "😀").value())
                .as("a surrogate pair is never split")
                .hasSize(Document.BODY_MAX - 1);
    }

    private static int at(String html) {
        return PageHtml.injectAt(bytes(html));
    }

    private static int after(String tag, String html) {
        return bytes(html.substring(0, html.indexOf(tag) + tag.length())).length;
    }

    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }
}
