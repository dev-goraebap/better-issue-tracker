package io.github.goraebap.bit.module.document.domain;

import java.util.List;

/** A bundle whose files are kept: what a version is made from. */
public record StoredBundle(PagePath entry, List<PageFile> files, PageText text, List<String> warnings) {
    public StoredBundle {
        files = List.copyOf(files);
        warnings = List.copyOf(warnings);
    }
}
