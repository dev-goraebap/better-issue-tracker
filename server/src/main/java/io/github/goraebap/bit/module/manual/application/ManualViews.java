package io.github.goraebap.bit.module.manual.application;

import io.github.goraebap.bit.module.manual.domain.ManualContent;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ManualViews {
    private ManualViews() {}

    @Schema(
            name = "ManualSummary",
            requiredProperties = {
                "id",
                "scopeName",
                "title",
                "description",
                "icon",
                "color",
                "pageCount",
                "version",
                "createdAt",
                "updatedAt",
                "canEdit"
            })
    public record Summary(
            String id,
            String projectId,
            String scopeName,
            String title,
            String description,
            String icon,
            String color,
            int pageCount,
            long version,
            Instant createdAt,
            Instant updatedAt,
            boolean canEdit) {}

    @Schema(
            name = "ManualListing",
            requiredProperties = {"items", "canCreate", "total"})
    public record Listing(List<Summary> items, String nextCursor, boolean canCreate, int total) {
        public Listing {
            items = List.copyOf(items);
        }
    }

    @Schema(
            name = "ManualDetail",
            requiredProperties = {
                "id",
                "title",
                "description",
                "icon",
                "color",
                "content",
                "assets",
                "version",
                "createdAt",
                "updatedAt",
                "canEdit"
            })
    public record Detail(
            String id,
            String projectId,
            String title,
            String description,
            String icon,
            String color,
            ManualContent content,
            Map<String, String> assets,
            long version,
            Instant createdAt,
            Instant updatedAt,
            boolean canEdit) {
        public Detail {
            assets = Map.copyOf(assets);
        }
    }
}
