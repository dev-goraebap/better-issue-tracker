package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.Document;
import io.github.goraebap.bit.module.document.domain.PagePath;
import io.github.goraebap.bit.module.document.domain.PageVersionMeta;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;

public final class PageRequests {
    private static final String ID = "[A-Za-z][A-Za-z0-9]{9}";

    private PageRequests() {}

    @Schema(name = "CreatePage")
    public record Create(
            @Schema(
                    nullable = true,
                    description = "The project whose part holds it; omitted or null for the workspace's own")
            String projectId,

            @Schema(nullable = true, description = "A folder of that part; omitted or null for the part's top")
            String folderId,

            @NotBlank @Size(max = Document.TITLE_MAX) String title,

            @Size(max = Parts.MAX_LABELS) @Schema(nullable = true)
            List<@NotNull String> labelIds,

            @NotNull @Pattern(regexp = ID) @Schema(description = "A finished upload with purpose page: the bundle as one zip")
            String uploadId,

            @Size(max = PagePath.MAX) @Schema(nullable = true, description = "The HTML file to open first; default index.html")
            String entry,

            @Size(max = PageVersionMeta.NOTE_MAX) @Schema(nullable = true, description = "What this version is, one line")
            String note,

            @Size(max = 64) @Schema(nullable = true, description = "The commit the page describes, 7-64 hex characters")
            String baseCommit) {
        public Create {
            labelIds = labelIds == null ? null : List.copyOf(labelIds);
        }

        Set<String> labels() {
            return labelIds == null ? Set.of() : Set.copyOf(labelIds);
        }
    }

    @Schema(name = "PublishPageVersion")
    public record Publish(
            @NotNull @Pattern(regexp = ID) @Schema(description = "A finished upload with purpose page: the bundle as one zip")
            String uploadId,

            @Size(max = PagePath.MAX) @Schema(nullable = true, description = "The HTML file to open first; default index.html")
            String entry,

            @Size(max = PageVersionMeta.NOTE_MAX) @Schema(nullable = true, description = "What changed, one line")
            String note,

            @Size(max = 64) @Schema(nullable = true, description = "The commit the page describes, 7-64 hex characters")
            String baseCommit) {}
}
