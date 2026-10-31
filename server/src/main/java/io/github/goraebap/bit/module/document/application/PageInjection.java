package io.github.goraebap.bit.module.document.application;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * BIT's own tags, spliced into every text/html response at the offset found when the version was made. Without the
 * font link a page never asks for /pages/_fonts/, since the CDN link it was made with is blocked.
 */
final class PageInjection {
    static final byte[] BYTES =
            "<link rel=\"stylesheet\" href=\"/pages/_fonts/pretendard.css\">".getBytes(StandardCharsets.UTF_8);

    private PageInjection() {}

    /** Copies in to out, writing BYTES after exactly injectAt bytes; none when injectAt is null. */
    static void splice(InputStream in, OutputStream out, Long injectAt) throws IOException {
        if (injectAt == null) {
            in.transferTo(out);
            return;
        }
        long left = injectAt;
        byte[] buffer = new byte[8192];
        while (left > 0) {
            int read = in.read(buffer, 0, (int) Math.min(buffer.length, left));
            if (read < 0) throw new IOException("The stored file is shorter than its place for BIT's tags");
            out.write(buffer, 0, read);
            left -= read;
        }
        out.write(BYTES);
        in.transferTo(out);
    }
}
