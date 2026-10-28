package io.github.goraebap.bit.module.workitem.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.github.goraebap.bit.module.workitem.domain.WorkItemType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public final class WorkItemTypeRequests {
    static final String ID = "[A-Za-z][A-Za-z0-9]{9}";
    static final int MAX_PARENTS = 100;

    private WorkItemTypeRequests() {}

    @Schema(name = "CreateWorkItemType")
    public record Create(
            @NotBlank @Size(max = WorkItemType.NAME_MAX) String name,

            @Size(max = WorkItemType.ICON_MAX) @Schema(nullable = true, description = "An icon name the screen draws, such as epic, story, tasks or bug")
            String icon,

            @NotNull @Pattern(regexp = WorkItemType.COLOR_PATTERN) @Schema(example = "#3b82f6")
            String color,

            @Schema(
                    nullable = true,
                    description = "true: a work item of this type must sit under one of an allowed type")
            Boolean parentRequired,

            @Size(max = MAX_PARENTS) @Schema(nullable = true, description = "The types it may sit under; none makes it top-level")
            List<@NotNull @Pattern(regexp = ID) String> allowedParentTypeIds,

            @Schema(nullable = true, description = "true makes it the type a task gets when none is named")
            Boolean isDefault) {
        public Create {
            allowedParentTypeIds = allowedParentTypeIds == null ? List.of() : List.copyOf(allowedParentTypeIds);
        }

        boolean required() {
            return Boolean.TRUE.equals(parentRequired);
        }

        boolean makesDefault() {
            return Boolean.TRUE.equals(isDefault);
        }

        Set<String> parents() {
            return Set.copyOf(allowedParentTypeIds);
        }
    }

    @Schema(name = "WorkItemTypeOrderItem")
    public record OrderItem(
            @Pattern(regexp = ID) @NotNull String id,
            @NotNull @Min(0) Long expectedVersion) {}

    @Schema(name = "OrderWorkItemTypes")
    public record Order(@NotNull @Size(max = 1000) List<@NotNull @Valid OrderItem> types) {
        public Order {
            types = types == null ? null : List.copyOf(types);
        }
    }

    /** Changes only what is given; allowedParentTypeIds, when given, replaces the whole set. */
    @Schema(name = "UpdateWorkItemType")
    public static final class Update {
        @NotNull @Min(0) private Long expectedVersion;

        @Size(max = WorkItemType.NAME_MAX) private String name;

        @Size(max = WorkItemType.ICON_MAX) private String icon;

        @Pattern(regexp = WorkItemType.COLOR_PATTERN) private String color;

        private Boolean parentRequired;

        @Size(max = MAX_PARENTS) private List<@NotNull @Pattern(regexp = ID) String> allowedParentTypeIds;

        private Boolean isDefault;

        private boolean hasName, hasIcon, hasColor, hasParentRequired, hasAllowedParentTypeIds, hasIsDefault;

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

        @Schema(nullable = true, description = "null or blank clears it")
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

        @Schema(
                description =
                        "Changing the rule is refused with WORK_ITEM_TYPE_RULE_CONFLICT while live work items of the type would break it")
        public Boolean getParentRequired() {
            return parentRequired;
        }

        public void setParentRequired(Boolean value) {
            parentRequired = value;
            hasParentRequired = true;
        }

        @Schema(description = "The whole set of types it may sit under; [] makes it top-level")
        public List<String> getAllowedParentTypeIds() {
            return allowedParentTypeIds == null ? null : java.util.Collections.unmodifiableList(allowedParentTypeIds);
        }

        public void setAllowedParentTypeIds(List<String> value) {
            allowedParentTypeIds = value == null ? null : new ArrayList<>(value);
            hasAllowedParentTypeIds = true;
        }

        @Schema(description = "true makes it the default; the default stops being one only when another becomes it")
        public Boolean getIsDefault() {
            return isDefault;
        }

        public void setIsDefault(Boolean value) {
            isDefault = value;
            hasIsDefault = true;
        }

        public boolean hasName() {
            return hasName;
        }

        public boolean hasIcon() {
            return hasIcon;
        }

        public boolean hasColor() {
            return hasColor;
        }

        public boolean hasParentRequired() {
            return hasParentRequired;
        }

        public boolean hasAllowedParentTypeIds() {
            return hasAllowedParentTypeIds;
        }

        public boolean hasIsDefault() {
            return hasIsDefault;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported work item type field");
        }
    }
}
