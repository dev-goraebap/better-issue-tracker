package io.github.goraebap.bit.module.document.application;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

/**
 * Pretendard for pages, from the copy BIT's own screens ship (client/package.json pretendard): its dynamic-subset CSS
 * with the faces pointed at /pages/_fonts/ and declared under both family names the CDN snippets use, so a page made
 * with either finds it. Without the folder (app.page-fonts) fonts are off and pages fall back to system fonts.
 */
@Slf4j
@Component
class PageFonts {
    static final String CSS = "pretendard.css";
    static final String SOURCE_CSS = "pretendardvariable-dynamic-subset.css";
    static final String SUBSETS = "woff2-dynamic-subset/";

    private static final Pattern FONT = Pattern.compile("PretendardVariable\\.subset\\.\\d{1,3}\\.woff2");
    private static final String VARIABLE = "font-family: 'Pretendard Variable';";

    private final Resource location;
    private final String css;

    PageFonts(@Value("${app.page-fonts:}") String location, ResourceLoader resourceLoader) {
        this.location = location.isBlank() ? null : resourceLoader.getResource(withSlash(location));
        this.css = read(this.location);
    }

    Optional<String> css() {
        return Optional.ofNullable(css);
    }

    /** A listed subset file that exists in the folder; any other name has none. */
    Optional<Resource> font(String name) {
        if (css == null || !FONT.matcher(name).matches()) return Optional.empty();
        try {
            var font = location.createRelative(SUBSETS + name);
            return font.isReadable() ? Optional.of(font) : Optional.empty();
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    private static String read(Resource location) {
        if (location == null) {
            log.warn("페이지 글꼴 폴더(app.page-fonts)가 없어 페이지는 시스템 글꼴로 보입니다");
            return null;
        }
        try {
            String source = location.createRelative(SOURCE_CSS).getContentAsString(StandardCharsets.UTF_8);
            String pointed = source.replace("url(./" + SUBSETS, "url(/pages/_fonts/");
            if (!pointed.contains(VARIABLE)) throw new IOException("no 'Pretendard Variable' faces in " + SOURCE_CSS);
            return pointed + "\n" + pointed.replace(VARIABLE, "font-family: 'Pretendard';");
        } catch (IOException e) {
            log.warn("페이지 글꼴을 읽지 못해 페이지는 시스템 글꼴로 보입니다: {}", location, e);
            return null;
        }
    }

    private static String withSlash(String location) {
        return location.endsWith("/") ? location : location + "/";
    }
}
