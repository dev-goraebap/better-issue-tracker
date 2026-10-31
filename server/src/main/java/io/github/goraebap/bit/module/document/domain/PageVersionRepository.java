package io.github.goraebap.bit.module.document.domain;

import java.util.Optional;

public interface PageVersionRepository {
    /** Inserts the version and its files together; a taken (document, number) raises a duplicate-key error. */
    void save(PageVersion version);

    Optional<PageVersion.Made> findByUploadId(String uploadId);

    /** The newest version's number, 0 when the document has none. */
    int findLatestNumber(String documentId);
}
