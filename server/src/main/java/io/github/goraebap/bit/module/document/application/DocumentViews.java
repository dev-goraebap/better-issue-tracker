package io.github.goraebap.bit.module.document.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class DocumentViews {
    private DocumentViews() {}

    @Schema(
            name = "Folder",
            requiredProperties = {"id", "projectId", "parentId", "name", "version", "documentCount", "updatedAt"})
    public record Folder(
            String id,

            @Schema(nullable = true, description = "The project whose part holds it; null for the workspace's own")
            String projectId,

            @Schema(nullable = true, description = "The folder holding it; null at the top of its part")
            String parentId,

            String name,
            long version,

            @Schema(description = "How many live documents are right in it")
            long documentCount,

            Instant updatedAt) {}

    @Schema(
            name = "DocumentSummary",
            requiredProperties = {
                "id",
                "projectId",
                "folderId",
                "title",
                "excerpt",
                "labelIds",
                "workItems",
                "version",
                "updatedAt",
                "updatedBy",
                "updatedByAgent"
            })
    public record Summary(
            String id,
            @Schema(nullable = true) String projectId,
            @Schema(nullable = true) String folderId,
            String title,

            @Schema(description = "The text's first characters, for a card")
            String excerpt,

            List<String> labelIds,

            @Schema(description = "The work items it is linked to that the member may see, oldest link first")
            List<LinkedWorkItem> workItems,

            long version,
            Instant updatedAt,
            String updatedBy,
            @Schema(nullable = true) String updatedByAgent) {
        public Summary {
            labelIds = List.copyOf(labelIds);
            workItems = List.copyOf(workItems);
        }

        Summary with(List<LinkedWorkItem> linked) {
            return new Summary(
                    id,
                    projectId,
                    folderId,
                    title,
                    excerpt,
                    labelIds,
                    linked,
                    version,
                    updatedAt,
                    updatedBy,
                    updatedByAgent);
        }
    }

    /** A project's part of the documents in numbers, for its folder at the top of 문서함 (BIT-41). */
    @Schema(
            name = "DocumentPart",
            requiredProperties = {"projectId", "documentCount", "folderCount"})
    public record Part(String projectId, long documentCount, long folderCount) {}

    /** One folder of a part opened: the folders from its top down to it, then what it holds. */
    @Schema(
            name = "DocumentFolderContents",
            requiredProperties = {"projectId", "folderId", "path", "folders", "documents"})
    public record Contents(
            @Schema(nullable = true) String projectId,
            @Schema(nullable = true) String folderId,

            @Schema(description = "The folders from the part's top down to this one, this one last")
            List<Folder> path,

            List<Folder> folders,
            List<Summary> documents) {
        public Contents {
            path = List.copyOf(path);
            folders = List.copyOf(folders);
            documents = List.copyOf(documents);
        }
    }

    @Schema(
            name = "DocumentPage",
            requiredProperties = {"items", "nextCursor"})
    public record Page(
            List<Summary> items, @Schema(nullable = true) String nextCursor) {
        public Page {
            items = List.copyOf(items);
        }
    }

    @Schema(
            name = "LinkedWorkItem",
            requiredProperties = {"linkId", "id", "projectId", "reference", "title"})
    public record LinkedWorkItem(String linkId, String id, String projectId, String reference, String title) {}

    @Schema(
            name = "Document",
            requiredProperties = {
                "id",
                "projectId",
                "folderId",
                "path",
                "title",
                "body",
                "labelIds",
                "workItems",
                "version",
                "createdAt",
                "createdBy",
                "createdByAgent",
                "updatedAt",
                "updatedBy",
                "updatedByAgent"
            })
    public record Detail(
            String id,
            @Schema(nullable = true) String projectId,
            @Schema(nullable = true) String folderId,

            @Schema(description = "The folders from the part's top down to the document's")
            List<Folder> path,

            String title,
            String body,
            List<String> labelIds,
            List<LinkedWorkItem> workItems,
            long version,
            Instant createdAt,
            String createdBy,
            @Schema(nullable = true) String createdByAgent,
            Instant updatedAt,
            String updatedBy,
            @Schema(nullable = true) String updatedByAgent) {
        public Detail {
            path = List.copyOf(path);
            labelIds = List.copyOf(labelIds);
            workItems = List.copyOf(workItems);
        }
    }
}
