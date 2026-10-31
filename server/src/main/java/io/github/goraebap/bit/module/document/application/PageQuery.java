package io.github.goraebap.bit.module.document.application;

import java.util.List;
import java.util.Optional;

/** Reads of page versions, projected straight from the tables. */
public interface PageQuery {
    /** A page's versions, newest first. */
    List<PageViews.VersionSummary> versions(String documentId);

    Optional<PageViews.VersionSummary> version(String documentId, int number);

    /** A version's files by path. */
    List<StoredFile> files(String versionId);

    /** One file of a version of a live page, for serving it. */
    Optional<StoredFile> served(String versionId, String path);

    /** The entry of a version of a live page. */
    Optional<String> entry(String versionId);

    /** A file as it is kept: no blob when it is empty, and where BIT's tags go in an HTML file. */
    record StoredFile(String path, String contentType, long size, String blobId, Long injectAt) {}
}
