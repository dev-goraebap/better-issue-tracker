package io.github.goraebap.bit.module.view.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.github.goraebap.bit.module.view.domain.WorkItemView;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class ViewViews {
    private ViewViews() {}

    /** Opaque comma-joined values the client owns; a key without a filter is left out. */
    @Schema(name = "WorkItemViewFilters")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Filters(
            @Schema(description = "Status categories: todo, doing, done, none")
            String status,

            String priority,
            @Schema(description = "User ids") String assignee,

            @Schema(description = "Label ids, or system for the decision label")
            String label) {}

    @Schema(
            name = "WorkItemViewSort",
            requiredProperties = {"key", "direction"})
    public record Sort(WorkItemView.SortKey key, WorkItemView.Direction direction) {}

    @Schema(
            name = "WorkItemView",
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
                "grouping",
                "ownerId",
                "isPersonal",
                "canEdit",
                "position",
                "version",
                "createdAt",
                "updatedAt"
            })
    public record View(
            String id,
            String workspaceId,
            String name,
            @Schema(nullable = true) String description,
            String icon,
            String color,
            WorkItemView.Layout layout,
            Filters filters,
            Sort sort,
            List<WorkItemView.Column> columns,

            @Schema(description = "How the list's rows are grouped (D-106)")
            WorkItemView.Grouping grouping,

            String ownerId,
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

    /**
     * A scope's order of the views (D-088): home's or a project's (its id), the views the caller sees in it, first the
     * scope's default. A view not in it follows in the workspace's order.
     */
    @Schema(
            name = "WorkItemViewOrder",
            requiredProperties = {"scope", "viewKeys"})
    public record Order(
            @Schema(description = "home, or a project id") String scope,

            @Schema(description = "View ids, and all for 전체 업무")
            List<String> viewKeys) {
        public Order {
            viewKeys = List.copyOf(viewKeys);
        }
    }

    /** The caller's own adjustments to a view; a part left out follows the view. */
    @Schema(
            name = "WorkItemViewTweak",
            requiredProperties = {"viewKey"})
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Tweak(
            @Schema(description = "A view id, or all for 전체 업무")
            String viewKey,

            WorkItemView.Layout layout,
            Sort sort,
            List<WorkItemView.Column> columns,
            WorkItemView.Grouping grouping) {
        public Tweak {
            columns = columns == null ? null : List.copyOf(columns);
        }
    }
}
