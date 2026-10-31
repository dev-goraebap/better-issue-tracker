package io.github.goraebap.bit.module.navigation.application;

import io.github.goraebap.bit.module.navigation.domain.Navigation.Entry;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class NavigationRequests {
    private NavigationRequests() {}

    @Schema(name = "UpdateNavigation")
    public record Update(
            @NotNull @Min(0) Long expectedVersion,
            @NotNull @Size(min = 5, max = 6) List<@NotNull Entry> entries) {
        public Update {
            entries = entries == null ? null : List.copyOf(entries);
        }
    }

    @Schema(name = "ProjectFavorite")
    public record Favorite(boolean favorite) {}
}
