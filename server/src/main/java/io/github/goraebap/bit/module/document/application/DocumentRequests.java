package io.github.goraebap.bit.module.document.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.github.goraebap.bit.module.document.domain.Document;
import io.github.goraebap.bit.module.document.domain.Folder;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;

public final class DocumentRequests {
    private DocumentRequests() {}

    @Schema(name = "ReorderDocuments")
    public record Order(
            @Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") String projectId,
            @Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") String folderId,
            @NotNull @Min(0) Long expectedVersion,

            @NotNull @Size(max = 10000) List<@NotNull @Pattern(regexp = "(project|folder|document):[A-Za-z][A-Za-z0-9]{9}") String> order) {
        public Order {
            order = order == null ? null : List.copyOf(order);
        }
    }

    @Schema(name = "CreateDocument")
    public record Create(
            @Schema(
                    nullable = true,
                    description = "The project whose part holds it; omitted or null for the workspace's own")
            String projectId,

            @Schema(nullable = true, description = "A folder of that part; omitted or null for the part's top")
            String folderId,

            @NotBlank @Size(max = Document.TITLE_MAX) String title,

            @Size(max = Document.BODY_MAX) @Schema(nullable = true, description = "Markdown; omitted or null is empty")
            String body,

            @Size(max = DocumentService.MAX_LABELS) @Schema(nullable = true)
            List<@NotNull String> labelIds,

            @Size(max = 20) List<@NotNull @jakarta.validation.constraints.Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") String>
                    uploadIds) {
        public Create {
            uploadIds = uploadIds == null ? List.of() : List.copyOf(uploadIds);
            labelIds = labelIds == null ? null : List.copyOf(labelIds);
        }

        Set<String> labels() {
            return labelIds == null ? Set.of() : Set.copyOf(labelIds);
        }
    }

    @Schema(name = "UpdateDocument")
    public static final class Update {
        @Size(max = 20) private java.util.List<
                        @NotNull @jakarta.validation.constraints.Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") String>
                uploadIds = java.util.List.of();

        public java.util.List<String> getUploadIds() {
            return uploadIds;
        }

        public void setUploadIds(java.util.List<String> value) {
            uploadIds = value == null ? java.util.List.of() : java.util.List.copyOf(value);
        }

        @NotNull @Min(0) private Long expectedVersion;

        @Size(max = Document.TITLE_MAX) private String title;

        @Size(max = Document.BODY_MAX) private String body;

        @Size(max = DocumentService.MAX_LABELS) private List<@NotNull String> labelIds;

        private boolean hasTitle, hasBody, hasLabelIds;

        public Long getExpectedVersion() {
            return expectedVersion;
        }

        public void setExpectedVersion(Long value) {
            expectedVersion = value;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String value) {
            title = value;
            hasTitle = true;
        }

        @Schema(description = "Markdown")
        public String getBody() {
            return body;
        }

        public void setBody(String value) {
            body = value;
            hasBody = true;
        }

        @Schema(description = "Replaces the document's labels")
        public List<String> getLabelIds() {
            return labelIds;
        }

        public void setLabelIds(List<String> value) {
            labelIds = value == null ? List.of() : List.copyOf(value);
            hasLabelIds = true;
        }

        public boolean hasTitle() {
            return hasTitle;
        }

        public boolean hasBody() {
            return hasBody;
        }

        public boolean hasLabelIds() {
            return hasLabelIds;
        }

        Set<String> labels() {
            return Set.copyOf(labelIds);
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported document field");
        }
    }

    @Schema(name = "MoveDocument")
    public record Move(
            @NotNull @Min(0) Long expectedVersion,

            @Schema(nullable = true, description = "The project whose part takes it; null for the workspace's own")
            String projectId,

            @Schema(nullable = true, description = "A folder of that part; null for its top")
            String folderId) {}

    @Schema(name = "DocumentVersion")
    public record Version(@NotNull @Min(0) Long expectedVersion) {}

    @Schema(name = "LinkDocument")
    public record Link(@NotBlank String workItemId) {}

    @Schema(name = "CreateFolder")
    public record CreateFolder(
            @Schema(nullable = true, description = "The project whose part holds it; null for the workspace's own")
            String projectId,

            @Schema(nullable = true, description = "The folder holding it; null for the part's top")
            String parentId,

            @NotBlank @Size(max = Folder.NAME_MAX) String name,

            @Pattern(regexp = "#[0-9a-fA-F]{6}") @Schema(nullable = true, description = "Icon colour as #RRGGBB; omitted or null uses the theme's default")
            String color) {}

    @Schema(name = "RenameFolder")
    public static final class RenameFolder {
        @NotNull @Min(0) private Long expectedVersion;

        @NotBlank @Size(max = Folder.NAME_MAX) private String name;

        @Pattern(regexp = "#[0-9a-fA-F]{6}") private String color;

        private boolean hasColor;

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
        }

        @Schema(nullable = true, description = "Omitted keeps the colour; null restores the theme's default")
        public String getColor() {
            return color;
        }

        public void setColor(String value) {
            color = value;
            hasColor = true;
        }

        public boolean hasColor() {
            return hasColor;
        }

        @JsonAnySetter
        public void unknown(String key, Object value) {
            throw new IllegalArgumentException("Unsupported folder field");
        }
    }

    @Schema(name = "MoveFolder")
    public record MoveFolder(
            @NotNull @Min(0) Long expectedVersion,

            @Schema(nullable = true, description = "The folder of the same part to move under; null for its top")
            String parentId) {}
}
