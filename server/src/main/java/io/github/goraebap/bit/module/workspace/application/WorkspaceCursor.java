package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

final class WorkspaceCursor {
    private WorkspaceCursor() {}

    record Point(Instant time, UUID id) {}

    static Point decode(String raw, String scope, int size) {
        if (size < 1 || size > 100) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        if (raw == null) return new Point(null, null);
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(raw), StandardCharsets.UTF_8).split("\\|", -1);
            if (parts.length != 3 || !parts[0].equals(scope)) throw new IllegalArgumentException("cursor");
            return new Point(Instant.parse(parts[1]), UUID.fromString(parts[2]));
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }

    static String encode(String scope, Instant time, UUID id) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((scope + "|" + time + "|" + id).getBytes(StandardCharsets.UTF_8));
    }
}
