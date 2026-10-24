package io.github.goraebap.bit.module.project.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.github.goraebap.bit.module.project.ColumnCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public final class ProjectRequests {
    private ProjectRequests() {}

    @Schema(name = "CreateProject")
    public record Create(
            @NotBlank @Size(max = 64) String name,
            @NotBlank @Size(max = 10) String key,
            @Size(max = 20000) @Schema(nullable = true) String description) {}

    @Schema(name = "ProjectVersion")
    public record Version(@NotNull @Min(0) Long expectedVersion) {}

    @Schema(name = "CreateBoardColumn")
    public record CreateColumn(
            @NotNull @Min(0) Long expectedVersion,
            @NotBlank @Size(max = 32) String name,
            @Schema(nullable = true) String color,
            boolean isFinal,

            @Schema(
                    nullable = true,
                    description = "Omitted: done for a final column, doing otherwise. A final column must be done")
            ColumnCategory category) {}

    @Schema(name = "UpdateBoardColumn")
    public static final class ReviseColumn {
        @NotNull @Min(0) private Long expectedVersion;

        private String name;

        @Schema(nullable = true)
        private String color;

        private Boolean isFinal;
        private ColumnCategory category;
        private boolean hasName, hasColor, hasIsFinal, hasCategory;

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

        public String getColor() {
            return color;
        }

        public void setColor(String value) {
            color = value;
            hasColor = true;
        }

        public Boolean getIsFinal() {
            return isFinal;
        }

        public void setIsFinal(Boolean value) {
            isFinal = value;
            hasIsFinal = true;
        }

        public boolean hasName() {
            return hasName;
        }

        public boolean hasColor() {
            return hasColor;
        }

        public boolean hasIsFinal() {
            return hasIsFinal;
        }

        @Schema(
                description =
                        "Omitted: kept, except done when the column becomes final and doing when it stops being final")
        public ColumnCategory getCategory() {
            return category;
        }

        public void setCategory(ColumnCategory value) {
            category = value;
            hasCategory = true;
        }

        public boolean hasCategory() {
            return hasCategory;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported column field");
        }
    }

    @Schema(name = "ReorderBoardColumns")
    public record Reorder(
            @NotNull @Min(0) Long expectedVersion, @NotNull List<@NotNull UUID> order) {
        public Reorder {
            order = List.copyOf(order);
        }
    }

    @Schema(name = "UpdateProject")
    public static final class Update {
        @NotNull @Min(0) private Long expectedVersion;

        private String name;
        private String key;
        private @Schema(nullable = true) String description;
        private boolean hasName;
        private boolean hasKey;
        private boolean hasDescription;

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

        public String getKey() {
            return key;
        }

        public void setKey(String value) {
            key = value;
            hasKey = true;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String value) {
            description = value;
            hasDescription = true;
        }

        public boolean hasName() {
            return hasName;
        }

        public boolean hasKey() {
            return hasKey;
        }

        public boolean hasDescription() {
            return hasDescription;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported project field");
        }
    }
}
