package io.github.goraebap.bit.module.document.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PageBundleTest {
    @Test
    void aSingleSharedTopFolderIsStrippedWithAWarning() {
        var bundle = PageBundle.of(files("out/index.html", "out/css/a.css"), Optional.empty(), List.of());
        assertThat(bundle.files()).extracting(file -> file.path().value()).containsExactly("css/a.css", "index.html");
        assertThat(bundle.entry().value()).isEqualTo("index.html");
        assertThat(bundle.warnings()).singleElement().asString().contains("out/");
    }

    @Test
    void aTopFolderWithAFileBesideItIsKept() {
        var bundle = PageBundle.of(files("out/index.html", "readme.css"), Optional.empty(), List.of());
        assertThat(bundle.files())
                .extracting(file -> file.path().value())
                .containsExactly("out/index.html", "readme.css");
        assertThat(bundle.warnings()).isEmpty();
    }

    @Test
    void pathsThatDifferOnlyByCaseOrAreFileAndFolderAreRefused() {
        assertThatThrownBy(() -> PageBundle.of(files("A.html", "a.html"), Optional.empty(), List.of()))
                .isInstanceOf(PageBundleRejected.class)
                .hasMessageContaining("A.html");
        assertThatThrownBy(() -> PageBundle.of(files("index.html", "img", "img/a.png"), Optional.empty(), List.of()))
                .isInstanceOf(PageBundleRejected.class)
                .hasMessageContaining("파일이면서 폴더");
    }

    @Test
    void theEntryIsTheGivenFileElseIndexElseTheOnlyHtml() {
        assertThat(PageBundle.of(files("index.html", "b.html"), Optional.of("b.html"), List.of())
                        .entry()
                        .value())
                .isEqualTo("b.html");
        assertThat(PageBundle.of(files("out/index.html", "out/b.html"), Optional.of("out/b.html"), List.of())
                        .entry()
                        .value())
                .as("an entry named with the stripped folder still finds its file")
                .isEqualTo("b.html");
        assertThat(PageBundle.of(files("docs/guide.html", "a.css"), Optional.empty(), List.of())
                        .entry()
                        .value())
                .isEqualTo("docs/guide.html");
        assertThatThrownBy(() -> PageBundle.of(files("a.html", "b.html"), Optional.empty(), List.of()))
                .isInstanceOf(PageBundleRejected.class)
                .hasMessageContaining("a.html, b.html");
        assertThatThrownBy(() -> PageBundle.of(files("a.html", "s.css"), Optional.of("s.css"), List.of()))
                .isInstanceOf(PageBundleRejected.class)
                .hasMessageContaining("HTML이 아닙니다");
        assertThatThrownBy(() -> PageBundle.of(files("a.html"), Optional.of("x.html"), List.of()))
                .isInstanceOf(PageBundleRejected.class)
                .hasMessageContaining("a.html");
        assertThatThrownBy(() -> PageBundle.of(files("a.css"), Optional.empty(), List.of()))
                .isInstanceOf(PageBundleRejected.class);
        assertThatThrownBy(() -> PageBundle.of(List.of(), Optional.empty(), List.of()))
                .isInstanceOf(PageBundleRejected.class);
    }

    private static List<SpooledFile> files(String... paths) {
        return Arrays.stream(paths)
                .map(PagePath::parse)
                .map(path ->
                        new SpooledFile(path, PageFileType.of(path).orElse(PageFileType.PNG), 1, Path.of("unused")))
                .toList();
    }
}
