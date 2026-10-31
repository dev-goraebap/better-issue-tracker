package io.github.goraebap.bit.module.document.domain;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/** The kinds of file a page bundle may hold, by extension, and the type each is served as. Text kinds are UTF-8. */
public enum PageFileType {
    HTML("text/html;charset=utf-8", true, "html", "htm"),
    CSS("text/css;charset=utf-8", true, "css"),
    JS("text/javascript;charset=utf-8", true, "js", "mjs"),
    JSON("application/json;charset=utf-8", true, "json"),
    SVG("image/svg+xml", true, "svg"),
    PNG("image/png", false, "png"),
    JPEG("image/jpeg", false, "jpg", "jpeg"),
    GIF("image/gif", false, "gif"),
    WEBP("image/webp", false, "webp"),
    AVIF("image/avif", false, "avif"),
    ICO("image/x-icon", false, "ico"),
    WOFF2("font/woff2", false, "woff2"),
    WOFF("font/woff", false, "woff"),
    TTF("font/ttf", false, "ttf"),
    OTF("font/otf", false, "otf");

    private final String contentType;
    private final boolean text;
    private final List<String> extensions;

    PageFileType(String contentType, boolean text, String... extensions) {
        this.contentType = contentType;
        this.text = text;
        this.extensions = List.of(extensions);
    }

    public static Optional<PageFileType> of(PagePath path) {
        String extension = path.extension();
        return Arrays.stream(values())
                .filter(type -> type.extensions.contains(extension))
                .findFirst();
    }

    /** The extensions a bundle may hold, for a refusal's message. */
    public static String allowed() {
        return Arrays.stream(values()).flatMap(type -> type.extensions.stream()).collect(Collectors.joining(", "));
    }

    public boolean html() {
        return this == HTML;
    }

    /** Checked as strict UTF-8 while unpacking; a byte order mark is allowed. */
    public boolean text() {
        return text;
    }

    public String contentType() {
        return contentType;
    }
}
