package io.github.goraebap.bit.module.document.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.DomainRuleViolation;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** A page's version (D-113): made once from one upload, never changed. A fix is the next version. */
public record PageVersion(
        String id,
        String documentId,
        int number,
        PagePath entry,
        PageVersionMeta meta,
        String uploadId,
        List<PageFile> files,
        Instant createdAt,
        String createdBy,
        String createdByAgent) {
    public PageVersion {
        Objects.requireNonNull(uploadId);
        files = List.copyOf(files);
        if (number < 1) throw new IllegalArgumentException("Page versions count from 1");
        if (files.stream().noneMatch(file -> file.path().equals(entry)))
            throw new IllegalArgumentException("A version's entry is one of its files");
    }

    /** The version after latestNumber (0 when the page has none yet). */
    public static PageVersion next(
            String documentId,
            int latestNumber,
            StoredBundle bundle,
            PageVersionMeta meta,
            String uploadId,
            String actor,
            String agent,
            Instant now) {
        return new PageVersion(
                Ids.newId(),
                documentId,
                latestNumber + 1,
                bundle.entry(),
                meta,
                uploadId,
                bundle.files(),
                now,
                actor,
                agent);
    }

    /** A version already made from an upload. */
    public record Made(String versionId, String documentId, int number) {
        /** Refusing another document's version is what keeps one upload from making two pages. */
        public Made requireOf(String documentId) {
            if (!this.documentId.equals(documentId)) throw new DomainRuleViolation("이 업로드는 이미 다른 페이지의 버전이 되었습니다");
            return this;
        }

        /** A page made from an upload is its first version; an upload that became a later version made no page. */
        public Made requireFirst() {
            if (number != 1) throw new DomainRuleViolation("이 업로드는 이미 다른 페이지의 버전이 되었습니다");
            return this;
        }
    }
}
