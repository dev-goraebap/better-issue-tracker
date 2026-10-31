package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.Document;
import io.github.goraebap.bit.module.document.domain.DocumentKind;
import io.github.goraebap.bit.module.document.domain.DocumentRepository;
import io.github.goraebap.bit.module.document.domain.PagePath;
import io.github.goraebap.bit.module.document.domain.PageVersion;
import io.github.goraebap.bit.module.document.domain.PageVersionMeta;
import io.github.goraebap.bit.module.document.domain.PageVersionRepository;
import io.github.goraebap.bit.module.document.domain.StoredBundle;
import io.github.goraebap.bit.module.file.FileFacade;
import io.github.goraebap.bit.module.link.LinkFacade;
import io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.io.IOException;
import java.io.OutputStream;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.function.UnaryOperator;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Pages (D-113): documents whose content is immutable versions of an HTML bundle an agent made. A version is read from
 * one page upload; the same upload sent again returns the version it already made. Reading, checking and keeping the
 * bundle run outside any transaction, and only the rows are written in one short transaction, so a 20MB zip never
 * holds SQLite's write lock. Permission is checked before the bundle is read and again inside that transaction.
 */
@Service
@RequiredArgsConstructor
public class PageService {
    private final Parts parts;
    private final DocumentRepository documentRepository;
    private final PageVersionRepository pageVersionRepository;
    private final PageQuery pageQuery;
    private final PageBundles pageBundles;
    private final PageTokens pageTokens;
    private final FileFacade fileFacade;
    private final LinkFacade linkFacade;
    private final DocumentActivity documentActivity;
    private final TransactionTemplate transactionTemplate;
    private final Clock clock;

    /** The versions of a readable page, newest first; null for a Markdown document. */
    @Transactional(readOnly = true)
    public PageViews.Overview overview(CurrentUser actor, String workspaceId, String documentId) {
        var document = parts.requireDocument(actor, workspaceId, documentId, false, false);
        if (document.kind() != DocumentKind.page) return null;
        var versions = pageQuery.versions(documentId);
        return new PageViews.Overview(versions.getFirst().number(), versions);
    }

    /** One version with its files and the address to view it at; number null for the latest. */
    @Transactional(readOnly = true)
    public PageViews.Version version(CurrentUser actor, String workspaceId, String documentId, Integer number) {
        var summary = summary(readablePage(actor, workspaceId, documentId), number);
        var files = pageQuery.files(summary.id()).stream()
                .map(file -> new PageViews.File(file.path(), file.contentType(), file.size()))
                .toList();
        var link = pageTokens.link(summary.id(), new PagePath(summary.entry()));
        return new PageViews.Version(summary, files, link.url(), link.expiresAt());
    }

    /** A version's files to send back as a zip, after the member's read permission; number null for the latest. */
    @Transactional(readOnly = true)
    public Bundle bundle(CurrentUser actor, String workspaceId, String documentId, Integer number) {
        var document = readablePage(actor, workspaceId, documentId);
        var summary = summary(document, number);
        return new Bundle(document.title() + " v" + summary.number() + ".zip", pageQuery.files(summary.id()));
    }

    /** Writes a version's files as a zip with the paths they were uploaded under (after a stripped top folder). */
    public void writeBundle(Bundle bundle, OutputStream out) throws IOException {
        try (var zip = new ZipOutputStream(out)) {
            for (var file : bundle.files()) {
                zip.putNextEntry(new ZipEntry(file.path()));
                if (file.blobId() != null)
                    try (var in = fileFacade.openKept(file.blobId())) {
                        in.transferTo(zip);
                    }
                zip.closeEntry();
            }
        }
    }

    /** A version's files to zip, and the name the zip is saved under. */
    public record Bundle(String filename, List<PageQuery.StoredFile> files) {
        public Bundle {
            files = List.copyOf(files);
        }
    }

    /** Makes a page and its first version from a page upload; the same upload again returns that page. */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public PageViews.Published create(CurrentUser actor, String workspaceId, PageRequests.Create request) {
        var meta = new PageVersionMeta(request.note(), request.baseCommit());
        requirePlace(actor, workspaceId, request);
        var made = pageVersionRepository.findByUploadId(request.uploadId());
        if (made.isPresent()) return published(made.get().requireFirst(), List.of());
        StoredBundle bundle = pageBundles.store(actor, request.uploadId(), Optional.ofNullable(request.entry()));
        return rows(request.uploadId(), PageVersion.Made::requireFirst, () -> {
            requirePlace(actor, workspaceId, request);
            var now = clock.instant();
            var document = Document.createPage(
                    workspaceId,
                    request.projectId(),
                    request.folderId(),
                    request.title(),
                    request.labels(),
                    bundle.text(),
                    actor.userId(),
                    actor.agent(),
                    now);
            documentRepository.save(document);
            var version = PageVersion.next(
                    document.id(), 0, bundle, meta, request.uploadId(), actor.userId(), actor.agent(), now);
            pageVersionRepository.save(version);
            linkFacade.syncDocumentReferences(actor, workspaceId, document.id(), document.body());
            documentActivity.changed(actor, document, "created", List.of());
            return published(version, bundle.warnings());
        });
    }

    /** Adds the page's next version from a page upload; the same upload again returns that version. */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public PageViews.Published publish(
            CurrentUser actor, String workspaceId, String documentId, PageRequests.Publish request) {
        var meta = new PageVersionMeta(request.note(), request.baseCommit());
        requirePage(actor, workspaceId, documentId);
        var made = pageVersionRepository.findByUploadId(request.uploadId());
        if (made.isPresent()) return published(made.get().requireOf(documentId), List.of());
        StoredBundle bundle = pageBundles.store(actor, request.uploadId(), Optional.ofNullable(request.entry()));
        return rows(request.uploadId(), found -> found.requireOf(documentId), () -> {
            var document = requirePage(actor, workspaceId, documentId);
            var now = clock.instant();
            int latest = pageVersionRepository.findLatestNumber(documentId);
            var version = PageVersion.next(
                    documentId, latest, bundle, meta, request.uploadId(), actor.userId(), actor.agent(), now);
            pageVersionRepository.save(version);
            document.publish(bundle.text(), actor.userId(), actor.agent(), now);
            documentRepository.save(document);
            linkFacade.syncDocumentReferences(actor, workspaceId, documentId, document.body());
            documentActivity.changed(
                    actor,
                    document,
                    "changed",
                    List.of(new FieldChange(
                            "page",
                            latest == 0 ? null : Integer.toString(latest),
                            Integer.toString(version.number()))));
            return published(version, bundle.warnings());
        });
    }

    /**
     * Writes the rows in one transaction. A request with the same upload that won the race meanwhile has already made
     * the version, which is then the answer.
     */
    private PageViews.Published rows(
            String uploadId, UnaryOperator<PageVersion.Made> claim, Supplier<PageViews.Published> write) {
        try {
            return transactionTemplate.execute(status -> {
                var made = pageVersionRepository.findByUploadId(uploadId);
                return made.isPresent() ? published(claim.apply(made.get()), List.of()) : write.get();
            });
        } catch (DuplicateKeyException race) {
            var made = pageVersionRepository.findByUploadId(uploadId);
            if (made.isPresent()) return published(claim.apply(made.get()), List.of());
            throw DocumentErrorCode.PAGE_VERSION_CONFLICT.raise();
        }
    }

    private void requirePlace(CurrentUser actor, String workspaceId, PageRequests.Create request) {
        parts.require(actor, workspaceId, request.projectId(), true);
        if (request.folderId() != null) parts.requireFolder(workspaceId, request.projectId(), request.folderId());
        parts.requireLabels(actor, workspaceId, request.labels());
    }

    private Document requirePage(CurrentUser actor, String workspaceId, String documentId) {
        var document = parts.requireDocument(actor, workspaceId, documentId, true, false);
        if (document.kind() != DocumentKind.page) throw DocumentErrorCode.DOCUMENT_NOT_PAGE.raise();
        return document;
    }

    private Document readablePage(CurrentUser actor, String workspaceId, String documentId) {
        var document = parts.requireDocument(actor, workspaceId, documentId, false, false);
        if (document.kind() != DocumentKind.page) throw DocumentErrorCode.DOCUMENT_NOT_PAGE.raise();
        return document;
    }

    private PageViews.VersionSummary summary(Document page, Integer number) {
        int wanted = number == null ? pageVersionRepository.findLatestNumber(page.id()) : number;
        return pageQuery.version(page.id(), wanted).orElseThrow(DocumentErrorCode.PAGE_VERSION_NOT_FOUND::raise);
    }

    private static PageViews.Published published(PageVersion version, List<String> warnings) {
        return new PageViews.Published(
                version.documentId(),
                version.id(),
                version.number(),
                version.entry().value(),
                version.files().size(),
                warnings);
    }

    private PageViews.Published published(PageVersion.Made made, List<String> warnings) {
        var summary = pageQuery
                .version(made.documentId(), made.number())
                .orElseThrow(() -> new IllegalStateException("A made version is missing: " + made.versionId()));
        return new PageViews.Published(
                made.documentId(),
                made.versionId(),
                made.number(),
                summary.entry(),
                pageQuery.files(made.versionId()).size(),
                warnings);
    }
}
