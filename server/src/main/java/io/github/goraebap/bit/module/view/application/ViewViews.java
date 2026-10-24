package io.github.goraebap.bit.module.view.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.github.goraebap.bit.module.view.domain.IssueView;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ViewViews {
    private ViewViews() {}

    /** Opaque comma-joined values the client owns; a key without a filter is left out. */
    @Schema(name = "IssueViewFilters")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Filters(
            @Schema(description = "Status categories: todo, doing, done, none")
            String status,

            String priority,
            @Schema(description = "User ids") String assignee,

            @Schema(description = "Label ids, or system for the decision label")
            String label) {}

    @Schema(
            name = "IssueViewSort",
            requiredProperties = {"key", "direction"})
    public record Sort(IssueView.SortKey key, IssueView.Direction direction) {}

    @Schema(
            name = "IssueView",
            requiredProperties = {
                "id",
                "workspaceId",
                "name",
                "description",
                "icon",
                "color",
                "layout",
                "filters",
                "sort",
                "columns",
                "ownerId",
                "isPersonal",
                "canEdit",
                "position",
                "version",
                "createdAt",
                "updatedAt"
            })
    public record View(
            UUID id,
            UUID workspaceId,
            String name,
            @Schema(nullable = true) String description,
            String icon,
            String color,
            IssueView.Layout layout,
            Filters filters,
            Sort sort,
            List<IssueView.Column> columns,
            UUID ownerId,
            boolean isPersonal,

            @Schema(description = "Whether the caller may change or delete it (D-068)")
            boolean canEdit,

            double position,
            long version,
            Instant createdAt,
            Instant updatedAt) {
        public View {
            columns = List.copyOf(columns);
        }
    }

    /** The caller's own adjustments to a view; a part left out follows the view. */
    @Schema(
            name = "IssueViewTweak",
            requiredProperties = {"viewKey"})
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Tweak(
            @Schema(description = "A view id, or all for 전체 이슈")
            String viewKey,

            IssueView.Layout layout,
            Sort sort,
            List<IssueView.Column> columns) {
        public Tweak {
            columns = columns == null ? null : List.copyOf(columns);
        }
    }
}
