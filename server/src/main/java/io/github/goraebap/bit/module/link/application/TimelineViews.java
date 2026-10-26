package io.github.goraebap.bit.module.link.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class TimelineViews {
    private TimelineViews() {}

    /**
     * One line of a target's timeline (D-078): a comment (its Markdown, and when it was last edited) or an activity
     * (what happened and, for a change, the field with its value before and after: ids for people, columns and labels,
     * none for a description).
     */
    @Schema(
            name = "TimelineEntry",
            requiredProperties = {
                "kind",
                "id",
                "at",
                "actorId",
                "actorName",
                "actorAgent",
                "body",
                "version",
                "editedAt",
                "action",
                "field",
                "before",
                "after"
            })
    public record Entry(
            @Schema(allowableValues = {"comment", "activity"})
            String kind,

            String id,
            Instant at,
            @Schema(nullable = true) String actorId,
            @Schema(nullable = true) String actorName,

            @Schema(nullable = true, description = "The API key's agent name when an agent did it")
            String actorAgent,

            @Schema(nullable = true, description = "A comment's Markdown")
            String body,

            @Schema(description = "A comment's version, for editing and deleting it; 0 for an activity")
            long version,

            @Schema(nullable = true) Instant editedAt,

            @Schema(nullable = true, description = "created, changed, deleted, restored, …")
            String action,

            @Schema(nullable = true) String field,
            @Schema(nullable = true) String before,
            @Schema(nullable = true) String after) {}

    @Schema(
            name = "Timeline",
            requiredProperties = {"items", "nextCursor"})
    public record Timeline(
            List<Entry> items, @Schema(nullable = true) String nextCursor) {
        public Timeline {
            items = List.copyOf(items);
        }
    }
}
