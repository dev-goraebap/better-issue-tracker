package io.github.goraebap.bit.module.project.domain;

import java.util.Locale;

public record ProjectKey(String value) {
    public static ProjectKey of(String raw) {
        if (raw == null) throw new IllegalArgumentException("Project key is required");
        String normalized = raw.strip().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9]{2,10}")) throw new IllegalArgumentException("Invalid project key");
        return new ProjectKey(normalized);
    }
}
