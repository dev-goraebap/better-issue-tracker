package io.github.goraebap.bit.module.document.domain;

import java.util.Objects;

/** One file of a version. Its blob is absent exactly when it is empty; injectAt is set exactly for HTML. */
public record PageFile(PagePath path, PageFileType type, long size, String blobId, Long injectAt) {
    public PageFile {
        Objects.requireNonNull(path);
        Objects.requireNonNull(type);
        if (size < 0 || (blobId == null) != (size == 0))
            throw new IllegalArgumentException("A page file has a blob exactly when it is not empty: " + path.value());
        if ((injectAt != null) != type.html() || (injectAt != null && (injectAt < 0 || injectAt > size)))
            throw new IllegalArgumentException("Only an HTML file has a place for BIT's tags: " + path.value());
    }
}
