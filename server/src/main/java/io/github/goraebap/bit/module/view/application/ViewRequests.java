package io.github.goraebap.bit.module.view.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.github.goraebap.bit.module.view.domain.IssueView;
import io.github.goraebap.bit.module.view.domain.ViewOrder;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ViewRequests {
    private ViewRequests() {}

    @Schema(name = "CreateIssueView")
    public record Create(
            @NotBlank @Size(max = IssueView.NAME_MAX) String name,

            @Size(max = IssueView.DESCRIPTION_MAX) @Schema(nullable = true)
            String description,

            @NotBlank @Size(max = IssueView.ICON_MAX) String icon,

            @NotNull @Pattern(regexp = IssueView.COLOR_PATTERN) String color,

            @Schema(description = "Personal views are seen only by their owner; omitted means shared")
            boolean isPersonal,

            @NotNull IssueView.Layout layout,

            @Schema(implementation = ViewViews.Filters.class, nullable = true)
            Map<String, String> filters,

            @NotNull ViewViews.Sort sort,
            @NotNull List<IssueView.Column> columns) {
        public Create {
            filters = Map.copyOf(present(filters));
            columns = columns == null ? null : Collections.unmodifiableList(new ArrayList<>(columns));
        }
    }

    /** A null filter value means no filter on that key, as an absent one does. */
    static Map<String, String> present(Map<String, String> filters) {
        if (filters == null) return Map.of();
        var present = new LinkedHashMap<String, String>();
        filters.forEach((key, value) -> {
            if (key != null && value != null) present.put(key, value);
        });
        return present;
    }

    /** Changes only the fields present. description and filters may be null to clear them; the others may not. */
    @Schema(name = "UpdateIssueView")
    public static final class Update {
        @NotNull @Min(0) private Long expectedVersion;

        @Size(max = IssueView.NAME_MAX) private String name;

        @Size(max = IssueView.DESCRIPTION_MAX) private String description;

        @Size(max = IssueView.ICON_MAX) private String icon;

        @Pattern(regexp = IssueView.COLOR_PATTERN) private String color;

        private Boolean isPersonal;
        private IssueView.Layout layout;
        private Map<String, String> filters;
        private ViewViews.Sort sort;
        private List<IssueView.Column> columns;
        private boolean hasName, hasDescription, hasIcon, hasColor, hasIsPersonal, hasLayout;
        private boolean hasFilters, hasSort, hasColumns;

        public Long getExpectedVersion() {
            return expectedVersion;
        }

        public void setExpectedVersion(Long value) {
            expectedVersion = value;
        }

        public String getName() {
            return name;
        }

        public void setName(String value) {
            name = value;
            hasName = true;
        }

        @Schema(nullable = true)
        public String getDescription() {
            return description;
        }

        public void setDescription(String value) {
            description = value;
            hasDescription = true;
        }

        public String getIcon() {
            return icon;
        }

        public void setIcon(String value) {
            icon = value;
            hasIcon = true;
        }

        public String getColor() {
            return color;
        }

        public void setColor(String value) {
            color = value;
            hasColor = true;
        }

        @Schema(description = "Only the view's owner may change it; making it shared needs owner, admin or member")
        public Boolean getIsPersonal() {
            return isPersonal;
        }

        public void setIsPersonal(Boolean value) {
            isPersonal = value;
            hasIsPersonal = true;
        }

        public IssueView.Layout getLayout() {
            return layout;
        }

        public void setLayout(IssueView.Layout value) {
            layout = value;
            hasLayout = true;
        }

        @Schema(implementation = ViewViews.Filters.class, nullable = true, description = "Replaces all filters")
        public Map<String, String> getFilters() {
            return filters == null ? null : Collections.unmodifiableMap(filters);
        }

        public void setFilters(Map<String, String> value) {
            filters = value == null ? null : new LinkedHashMap<>(value);
            hasFilters = true;
        }

        public ViewViews.Sort getSort() {
            return sort;
        }

        public void setSort(ViewViews.Sort value) {
            sort = value;
            hasSort = true;
        }

        public List<IssueView.Column> getColumns() {
            return columns == null ? null : Collections.unmodifiableList(columns);
        }

        public void setColumns(List<IssueView.Column> value) {
            columns = value == null ? null : new ArrayList<>(value);
            hasColumns = true;
        }

        public boolean hasName() {
            return hasName;
        }

        public boolean hasDescription() {
            return hasDescription;
        }

        public boolean hasIcon() {
            return hasIcon;
        }

        public boolean hasColor() {
            return hasColor;
        }

        public boolean hasIsPersonal() {
            return hasIsPersonal;
        }

        public boolean hasLayout() {
            return hasLayout;
        }

        public boolean hasFilters() {
            return hasFilters;
        }

        public boolean hasSort() {
            return hasSort;
        }

        public boolean hasColumns() {
            return hasColumns;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported view field");
        }
    }

    /** A scope's views in their new order; a view left out follows them in the workspace's order (D-088). */
    @Schema(name = "PutIssueViewOrder")
    public record PutOrder(
            @NotNull @Size(max = ViewOrder.MAX_KEYS) @Schema(description = "View ids, and all for 전체 이슈")
            List<String> viewKeys) {
        public PutOrder {
            viewKeys = viewKeys == null ? null : Collections.unmodifiableList(new ArrayList<>(viewKeys));
        }
    }

    /** Replaces the caller's tweak; leaving every part out removes it. */
    @Schema(name = "PutIssueViewTweak")
    public record PutTweak(
            @Schema(nullable = true) IssueView.Layout layout,
            @Schema(nullable = true) ViewViews.Sort sort,
            @Schema(nullable = true) List<IssueView.Column> columns) {
        public PutTweak {
            columns = columns == null ? null : Collections.unmodifiableList(new ArrayList<>(columns));
        }
    }
}
