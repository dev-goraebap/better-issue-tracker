package io.github.goraebap.bit.module.document.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.text.Normalizer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PagePathTest {
    @ParameterizedTest
    @ValueSource(
            strings = {
                "../a.html",
                "a/../b.html",
                "./a.html",
                "/a.html",
                "C:/a.html",
                "a//b.html",
                "a\\b.html",
                "a;b.html",
                "a%2Fb.html",
                "100%.png",
                "a?.html",
                "a#b.html",
                "a:b.html",
                "a|b.html",
                "a[1].png",
                ".env",
                "css/.hidden.css",
                "dir/",
                "a\u0000.html",
                "a\nb.html"
            })
    void refusesWhatCannotBeLoadedByARelativeUrlAsWritten(String raw) {
        assertThatThrownBy(() -> PagePath.parse(raw))
                .isInstanceOf(PageBundleRejected.class)
                .hasMessageContaining("zip 안");
    }

    @Test
    void refusesOverlongPathsAndNames() {
        assertThatThrownBy(() -> PagePath.parse("a/".repeat(257) + "b.html")).isInstanceOf(PageBundleRejected.class);
        assertThatThrownBy(() -> PagePath.parse("x".repeat(256) + ".css")).isInstanceOf(PageBundleRejected.class);
    }

    @Test
    void acceptsKoreanNamesInNfcSpacesAndDeepFolders() {
        String decomposed = Normalizer.normalize("img/로고.png", Normalizer.Form.NFD);
        var path = PagePath.parse(decomposed);
        assertThat(path.value()).isEqualTo("img/로고.png");
        assertThat(path.fileName()).isEqualTo("로고.png");
        assertThat(path.extension()).isEqualTo("png");
        assertThat(PagePath.parse("a b.html").value()).isEqualTo("a b.html");
        var deep = PagePath.parse("deep/x/y/Z.CSS");
        assertThat(deep.extension()).isEqualTo("css");
        assertThat(deep.firstSegment()).isEqualTo("deep");
        assertThat(deep.withoutFirstSegment().value()).isEqualTo("x/y/Z.CSS");
        assertThat(deep.folded()).isEqualTo("deep/x/y/z.css");
        assertThat(deep.foldedFolders()).containsExactly("deep", "deep/x", "deep/x/y");
    }

    @Test
    void junkFromArchiversIsRecognised() {
        assertThat(PagePath.isJunk("__MACOSX/out/._index.html")).isTrue();
        assertThat(PagePath.isJunk("out/.DS_Store")).isTrue();
        assertThat(PagePath.isJunk("img/Thumbs.db")).isTrue();
        assertThat(PagePath.isJunk("desktop.ini")).isTrue();
        assertThat(PagePath.isJunk("out/._app.js")).isTrue();
        assertThat(PagePath.isJunk("out/index.html")).isFalse();
    }

    @Test
    void eachAllowedExtensionHasItsTypeAndOthersNone() {
        assertThat(PageFileType.of(PagePath.parse("a.HTM"))).hasValue(PageFileType.HTML);
        assertThat(PageFileType.of(PagePath.parse("a.mjs"))).hasValue(PageFileType.JS);
        assertThat(PageFileType.of(PagePath.parse("a.jpeg"))).hasValue(PageFileType.JPEG);
        assertThat(PageFileType.of(PagePath.parse("f.woff2"))).hasValue(PageFileType.WOFF2);
        assertThat(PageFileType.HTML.contentType()).isEqualTo("text/html;charset=utf-8");
        assertThat(PageFileType.SVG.text()).isTrue();
        assertThat(PageFileType.PNG.text()).isFalse();
        for (String refused : new String[] {"a.exe", "a.php", "a.js.map", "README"})
            assertThat(PageFileType.of(PagePath.parse(refused))).as(refused).isEmpty();
    }
}
