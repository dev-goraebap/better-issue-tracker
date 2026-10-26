package io.github.goraebap.bit.shared.storage;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** The Content-Disposition a signed download opens with: shown in place, or saved, under the file's own name. */
final class Disposition {
    private Disposition() {}

    static String of(String filename, boolean download) {
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        return (download ? "attachment" : "inline") + "; filename*=UTF-8''" + encoded;
    }
}
