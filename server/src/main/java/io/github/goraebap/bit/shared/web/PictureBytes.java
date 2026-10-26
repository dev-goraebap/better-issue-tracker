package io.github.goraebap.bit.shared.web;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * A picture's bytes for an avatar or a logo (D-090). Its address holds its id and a new picture gets a new id, so a
 * browser may keep the bytes for as long as it likes; they stay private to the signed-in browser.
 */
public final class PictureBytes {
    static final Duration CACHED = Duration.ofDays(365);

    private PictureBytes() {}

    /** Reads the stream whole and closes it. */
    public static ResponseEntity<byte[]> of(String contentType, InputStream body) {
        try (body) {
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .cacheControl(CacheControl.maxAge(CACHED).cachePrivate().immutable())
                    .body(body.readAllBytes());
        } catch (IOException failure) {
            throw new UncheckedIOException(failure);
        }
    }
}
