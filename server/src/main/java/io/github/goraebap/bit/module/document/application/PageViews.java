package io.github.goraebap.bit.module.document.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class PageViews {
    private PageViews() {}

    @Schema(
            name = "PublishedPage",
            requiredProperties = {"documentId", "versionId", "version", "entry", "files", "warnings"})
    public record Published(
            String documentId,
            String versionId,
            int version,
            String entry,

            @Schema(description = "How many files the version holds")
            int files,

            @Schema(
                    description =
                            "What BIT changed or will block, such as a stripped top folder or an external address")
            List<String> warnings) {
        public Published {
            warnings = List.copyOf(warnings);
        }
    }

    @Schema(
            name = "PageVersionSummary",
            requiredProperties = {
                "id",
                "number",
                "entry",
                "note",
                "baseCommit",
                "createdAt",
                "createdBy",
                "createdByAgent"
            })
    public record VersionSummary(
            String id,
            int number,
            String entry,
            @Schema(nullable = true) String note,
            @Schema(nullable = true) String baseCommit,
            Instant createdAt,
            String createdBy,
            @Schema(nullable = true) String createdByAgent) {}

    @Schema(
            name = "PageOverview",
            requiredProperties = {"latest", "versions"})
    public record Overview(
            int latest,

            @Schema(description = "Newest first") List<VersionSummary> versions) {
        public Overview {
            versions = List.copyOf(versions);
        }
    }

    @Schema(
            name = "PageFile",
            requiredProperties = {"path", "contentType", "size"})
    public record File(String path, String contentType, long size) {}

    /** Where a viewer opens a version, and until when that address works. */
    public record ViewLink(String url, Instant expiresAt) {}

    @Schema(
            name = "PageVersion",
            requiredProperties = {"version", "files", "viewUrl", "viewExpiresAt"})
    public record Version(
            VersionSummary version,
            List<File> files,

            @Schema(description = "Opens the entry in a sandboxed frame; ask again before viewExpiresAt")
            String viewUrl,

            Instant viewExpiresAt) {
        public Version {
            files = List.copyOf(files);
        }
    }
}
