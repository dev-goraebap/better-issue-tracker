package io.github.goraebap.bit.module.label.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.github.goraebap.bit.module.label.domain.Label;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class LabelRequests {
    public record OrderItem(
            @jakarta.validation.constraints.Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") @jakarta.validation.constraints.NotNull String id,

            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Min(0) Long expectedVersion) {}

    public record Order(
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Size(max = 10000) java.util.List<@jakarta.validation.constraints.NotNull @jakarta.validation.Valid OrderItem> labels) {
        public Order {
            labels = labels == null ? null : java.util.List.copyOf(labels);
        }
    }

    private LabelRequests() {}

    @Schema(name = "CreateLabel")
    public record Create(
            @NotBlank @Size(max = Label.NAME_MAX) String name,

            @NotNull @Pattern(regexp = Label.COLOR_PATTERN) @Schema(example = "#5e6ad2")
            String color) {}

    @Schema(name = "UpdateLabel")
    public static final class Update {
        @NotNull @Min(0) private Long expectedVersion;

        @Size(max = Label.NAME_MAX) private String name;

        @Pattern(regexp = Label.COLOR_PATTERN) private String color;

        private boolean hasName, hasColor;

        public Long getExpectedVersion() {
            return expectedVersion;
        }

        public void setExpectedVersion(Long value) {
            expectedVersion = value;
        }

        @Schema(description = "The system label keeps its name; sending a different one is LABEL_SYSTEM_LOCKED")
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

        public boolean hasName() {
            return hasName;
        }

        public boolean hasColor() {
            return hasColor;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported label field");
        }
    }
}
