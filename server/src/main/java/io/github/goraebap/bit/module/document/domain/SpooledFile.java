package io.github.goraebap.bit.module.document.domain;

import java.nio.file.Path;

/** One unpacked bundle file waiting on local disk before it is kept. */
public record SpooledFile(PagePath path, PageFileType type, long size, Path spooled) {
    public SpooledFile withPath(PagePath other) {
        return new SpooledFile(other, type, size, spooled);
    }
}
