package io.github.goraebap.bit.module.manual.application;

import io.github.goraebap.bit.module.manual.domain.ManualContent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class ManualRequests {
    private ManualRequests() {}

    @io.swagger.v3.oas.annotations.media.Schema(name = "SaveManual")
    public record Save(
            @NotBlank String id,
            String projectId,
            Long expectedVersion,
            @NotBlank @Size(max = 120) String title,
            @NotNull @Size(max = 400) String description,
            @NotBlank String icon,
            @NotBlank String color,
            @NotNull @Valid ManualContent content,
            @Size(max = 500) List<String> uploadIds) {
        public Save {
            uploadIds = uploadIds == null ? List.of() : List.copyOf(uploadIds);
        }
    }
}
