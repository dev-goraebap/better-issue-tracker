package io.github.goraebap.bit.module.document.application;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Screen reads of documents and folders, projected straight from the tables. Live rows of live projects only. */
public interface DocumentQuery {
    /** Every folder of one part (projectId null: the workspace's own), by name. */
    List<DocumentViews.Folder> folders(String workspaceId, String projectId);

    /** The documents right in one folder of a part (folderId null: its top), by title. */
    List<DocumentViews.Summary> documentsIn(String workspaceId, String projectId, String folderId);

    /** Documents matching a search, the most recently changed first, after the cursor, at most limit. */
    List<DocumentViews.Summary> search(String workspaceId, Search search, Cursor after, int limit);

    Optional<Row> findById(String workspaceId, String id);

    /** The live links from a document to work items, oldest first. */
    List<Link> links(String workspaceId, String documentId);

    /** The live links from each of some documents to work items, oldest first. */
    java.util.Map<String, List<Link>> links(String workspaceId, java.util.Collection<String> documentIds);

    /** A project's live documents and folders counted. */
    DocumentViews.Part part(String workspaceId, String projectId);

    /**
     * What to look for. projectId narrows to one project's part, workspaceOnly to the workspace's own part; neither
     * means every part. A null labelId, text or workItemId does not narrow.
     */
    record Search(String projectId, boolean workspaceOnly, String labelId, String text, String workItemId) {}

    /** Where a page ended: the last document's change time and id. */
    record Cursor(Instant updatedAt, String id) {}

    /** A document as its page shows it, before its links are resolved. */
    record Row(
            DocumentViews.Summary summary, String body, Instant createdAt, String createdBy, String createdByAgent) {}

    record Link(String linkId, String workItemId) {}
}
