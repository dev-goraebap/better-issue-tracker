package io.github.goraebap.bit.module.document.domain;

import java.util.Optional;
import java.util.Set;

public interface DocumentRepository {
    /** A live document, or a deleted one as well when includeDeleted. */
    Optional<Document> findById(String workspaceId, String id, boolean includeDeleted);

    /** How many of the ids are live documents of the project's part. */
    int countAllById(String workspaceId, String projectId, Set<String> ids);

    /** Saves the document and makes its label links match {@link Document#labelIds()}. */
    void save(Document document);
}
