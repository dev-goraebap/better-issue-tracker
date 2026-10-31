package io.github.goraebap.bit.module.navigation.application;

import io.github.goraebap.bit.module.navigation.domain.Navigation;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public final class NavigationViews {
    private NavigationViews() {}

    @Schema(
            name = "NavigationEntry",
            requiredProperties = {"key", "label"})
    public record Entry(String key, String label) {}

    @Schema(
            name = "ScopeNavigation",
            requiredProperties = {"version", "entries"})
    public record Scope(long version, List<Entry> entries) {
        public Scope {
            entries = List.copyOf(entries);
        }
    }

    public static Scope from(Navigation value) {
        return new Scope(
                value.version(),
                value.entries().stream().map(e -> new Entry(e.key(), e.label())).toList());
    }
}
