package io.github.goraebap.bit.module.file;

import java.util.Arrays;
import java.util.Locale;

/**
 * What a file may belong to (D-090). The owning module decides who may open its files; the file module only keeps the
 * link. Artifact versions point at their blob directly and are not owners here.
 */
public enum FileOwner {
    WORK_ITEM,
    COMMENT,
    /** A member's picture. */
    USER,
    /** A workspace's logo. */
    WORKSPACE;

    /** The value stored in attachment.owner_type. */
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static FileOwner of(String value) {
        return Arrays.stream(values())
                .filter(owner -> owner.value().equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Unknown file owner: " + value));
    }
}
