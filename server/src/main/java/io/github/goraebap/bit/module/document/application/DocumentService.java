package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.Document;
import io.github.goraebap.bit.module.document.domain.DocumentRepository;
import io.github.goraebap.bit.module.document.domain.FolderRepository;
import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.link.LinkFacade;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange;
import io.github.goraebap.bit.module.link.TargetFacade;
import io.github.goraebap.bit.module.link.TargetNotFoundException;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Documents (D-093): written, read, moved between folders and parts, labelled and linked to work items. Every change
 * goes to the document's activity, as a work item's does (D-078).
 */
@Service
@RequiredArgsConstructor
public class DocumentService {
    static final int MAX_LABELS = 50;
    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final DocumentQuery documentQuery;
    private final Parts parts;
    private final LabelFacade labelFacade;
    private final LinkFacade linkFacade;
    private final TargetFacade targetFacade;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Clock clock;

    /** One folder of a part opened (folderId null: the part's top): the way down to it and what it holds. */
    @Transactional(readOnly = true)
    public DocumentViews.Contents contents(CurrentUser actor, String workspaceId, String projectId, String folderId) {
        parts.require(actor, workspaceId, projectId, false);
        if (folderId != null) parts.requireFolder(workspaceId, projectId, folderId);
        var part = documentQuery.folders(workspaceId, projectId);
        var children = part.stream()
                .filter(folder -> Objects.equals(folder.parentId(), folderId))
                .toList();
        return new DocumentViews.Contents(
                projectId,
                folderId,
                Parts.path(part, folderId),
                children,
                linked(actor, workspaceId, documentQuery.documentsIn(workspaceId, projectId, folderId)));
    }

    /** Each project's part in numbers, for the projects' folders at the top of 문서함; one not shared is refused. */
    @Transactional(readOnly = true)
    public List<DocumentViews.Part> parts(CurrentUser actor, String workspaceId, List<String> projectIds) {
        var parts = new ArrayList<DocumentViews.Part>();
        for (String projectId : new java.util.LinkedHashSet<>(projectIds)) {
            this.parts.require(actor, workspaceId, projectId, false);
            parts.add(documentQuery.part(workspaceId, projectId));
        }
        return parts;
    }

    /**
     * The documents with the work items they are linked to, each work item read once whatever links to it; one the
     * member may not see, or that is gone, is left out (D-014).
     */
    private List<DocumentViews.Summary> linked(
            CurrentUser actor, String workspaceId, List<DocumentViews.Summary> documents) {
        var links = documentQuery.links(
                workspaceId, documents.stream().map(DocumentViews.Summary::id).toList());
        var seen = new java.util.HashMap<String, java.util.Optional<DocumentViews.LinkedWorkItem>>();
        return documents.stream()
                .map(document -> document.with(links.getOrDefault(document.id(), List.of()).stream()
                        .map(link -> seen.computeIfAbsent(link.workItemId(), id -> workItem(actor, workspaceId, link))
                                .map(item -> new DocumentViews.LinkedWorkItem(
                                        link.linkId(), item.id(), item.projectId(), item.reference(), item.title())))
                        .flatMap(java.util.Optional::stream)
                        .toList()))
                .toList();
    }

    private java.util.Optional<DocumentViews.LinkedWorkItem> workItem(
            CurrentUser actor, String workspaceId, DocumentQuery.Link link) {
        try {
            var item = targetFacade.requireAccess(actor, workspaceId, TargetType.work_item, link.workItemId(), false);
            return java.util.Optional.of(new DocumentViews.LinkedWorkItem(
                    link.linkId(), item.id(), item.projectId(), item.reference(), item.title()));
        } catch (TargetNotFoundException | BusinessException gone) {
            return java.util.Optional.empty();
        }
    }

    @Transactional(readOnly = true)
    public DocumentViews.Page search(
            CurrentUser actor, String workspaceId, DocumentQuery.Search search, String cursor, int limit) {
        parts.require(actor, workspaceId, search.projectId(), false);
        var items = documentQuery.search(workspaceId, search, cursor(cursor), limit + 1);
        if (items.size() <= limit) return new DocumentViews.Page(linked(actor, workspaceId, items), null);
        var page = items.subList(0, limit);
        var last = page.getLast();
        return new DocumentViews.Page(linked(actor, workspaceId, page), cursor(last.updatedAt(), last.id()));
    }

    @Transactional(readOnly = true)
    public DocumentViews.Detail get(CurrentUser actor, String workspaceId, String id) {
        var document = access(actor, workspaceId, id, false, false);
        var row = documentQuery.findById(workspaceId, id).orElseThrow(DocumentErrorCode.DOCUMENT_NOT_FOUND::raise);
        var linked = new ArrayList<DocumentViews.LinkedWorkItem>();
        for (var link : documentQuery.links(workspaceId, id)) {
            try {
                var item =
                        targetFacade.requireAccess(actor, workspaceId, TargetType.work_item, link.workItemId(), false);
                linked.add(new DocumentViews.LinkedWorkItem(
                        link.linkId(), item.id(), item.projectId(), item.reference(), item.title()));
            } catch (TargetNotFoundException | BusinessException gone) {
                // A deleted work item, or one the member may no longer see, keeps its link but is not shown (D-014).
            }
        }
        var s = row.summary();
        return new DocumentViews.Detail(
                s.id(),
                s.projectId(),
                s.folderId(),
                Parts.path(documentQuery.folders(workspaceId, document.projectId()), s.folderId()),
                s.title(),
                row.body(),
                s.labelIds(),
                linked,
                s.version(),
                row.createdAt(),
                row.createdBy(),
                row.createdByAgent(),
                s.updatedAt(),
                s.updatedBy(),
                s.updatedByAgent());
    }

    @Transactional
    public String create(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String folderId,
            String title,
            String body,
            Set<String> labelIds) {
        parts.require(actor, workspaceId, projectId, true);
        if (folderId != null) parts.requireFolder(workspaceId, projectId, folderId);
        labels(actor, workspaceId, labelIds);
        var document = Document.create(
                workspaceId,
                projectId,
                folderId,
                title,
                body,
                labelIds,
                actor.userId(),
                actor.agent(),
                clock.instant());
        documentRepository.save(document);
        changed(actor, document, "created", List.of());
        return document.id();
    }

    @Transactional
    public void revise(CurrentUser actor, String workspaceId, String id, DocumentRequests.Update request) {
        var document = access(actor, workspaceId, id, true, false);
        version(document, request.getExpectedVersion());
        String title = request.hasTitle() ? request.getTitle() : document.title();
        String body = request.hasBody() ? request.getBody() : document.body();
        var labelIds = request.hasLabelIds() ? request.labels() : document.labelIds();
        if (!labelIds.equals(document.labelIds())) labels(actor, workspaceId, labelIds);
        String previousTitle = document.title();
        String previousBody = document.body();
        var previousLabels = document.labelIds();
        long before = document.version();
        document.revise(title, body, labelIds, actor.userId(), actor.agent(), clock.instant());
        if (document.version() == before) return;
        documentRepository.save(document);
        var changes = new ArrayList<FieldChange>();
        if (!previousTitle.equals(document.title()))
            changes.add(new FieldChange("title", previousTitle, document.title()));
        // The text is written in place and saved as it is typed: the activity says it changed, not what it said.
        if (!previousBody.equals(document.body())) changes.add(new FieldChange("body", null, null));
        if (!previousLabels.equals(document.labelIds()))
            changes.add(new FieldChange("labels", ids(previousLabels), ids(document.labelIds())));
        changed(actor, document, "changed", changes);
    }

    /** Puts the document in another folder, or another part (a project's or the workspace's own) and its folder. */
    @Transactional
    public void move(
            CurrentUser actor, String workspaceId, String id, long expectedVersion, String projectId, String folderId) {
        var document = access(actor, workspaceId, id, true, false);
        version(document, expectedVersion);
        if (!Objects.equals(projectId, document.projectId())) parts.require(actor, workspaceId, projectId, true);
        if (folderId != null) parts.requireFolder(workspaceId, projectId, folderId);
        String before = place(document.projectId(), document.folderId());
        long version = document.version();
        document.move(projectId, folderId, actor.userId(), actor.agent(), clock.instant());
        if (document.version() == version) return;
        documentRepository.save(document);
        changed(actor, document, "changed", List.of(new FieldChange("place", before, place(projectId, folderId))));
    }

    @Transactional
    public void delete(CurrentUser actor, String workspaceId, String id, long expectedVersion) {
        var document = access(actor, workspaceId, id, true, true);
        version(document, expectedVersion);
        if (document.deleted()) return;
        document.delete(actor.userId(), actor.agent(), clock.instant());
        documentRepository.save(document);
        changed(actor, document, "deleted", List.of());
    }

    @Transactional
    public void restore(CurrentUser actor, String workspaceId, String id, long expectedVersion) {
        var document = access(actor, workspaceId, id, true, true);
        version(document, expectedVersion);
        if (!document.deleted()) return;
        boolean folderLives = document.folderId() == null
                || folderRepository.findById(workspaceId, document.folderId()).isPresent();
        document.restore(folderLives, actor.userId(), actor.agent(), clock.instant());
        documentRepository.save(document);
        changed(actor, document, "restored", List.of());
    }

    /** Links the document to a work item it is about (relates_to); linking it again returns the same link. */
    @Transactional
    public String link(CurrentUser actor, String workspaceId, String id, String workItemId) {
        access(actor, workspaceId, id, true, false);
        return linkFacade.connect(
                actor, workspaceId, TargetType.document, id, "relates_to", TargetType.work_item, workItemId);
    }

    @Transactional
    public void unlink(CurrentUser actor, String workspaceId, String id, String linkId) {
        access(actor, workspaceId, id, true, false);
        if (documentQuery.links(workspaceId, id).stream()
                .noneMatch(link -> link.linkId().equals(linkId)))
            throw DocumentErrorCode.DOCUMENT_LINK_NOT_FOUND.raise();
        linkFacade.disconnect(actor, workspaceId, linkId);
    }

    private Document access(CurrentUser actor, String workspaceId, String id, boolean writing, boolean deleted) {
        var document = documentRepository
                .findById(workspaceId, id, deleted)
                .orElseThrow(DocumentErrorCode.DOCUMENT_NOT_FOUND::raise);
        parts.require(actor, workspaceId, document.projectId(), writing);
        return document;
    }

    /** Every label must be a live label of this workspace; deleted or foreign ids are rejected as one error. */
    private void labels(CurrentUser actor, String workspaceId, Set<String> labelIds) {
        if (labelIds.size() > MAX_LABELS) throw DocumentErrorCode.DOCUMENT_LABEL_INVALID.raise();
        if (!labelIds.isEmpty()
                && labelFacade.findAllById(actor, workspaceId, labelIds).size() != labelIds.size())
            throw DocumentErrorCode.DOCUMENT_LABEL_INVALID.raise();
    }

    private void changed(CurrentUser actor, Document document, String action, List<FieldChange> changes) {
        applicationEventPublisher.publishEvent(new TargetChangedEvent(
                document.workspaceId(),
                document.projectId(),
                TargetType.document,
                document.id(),
                action,
                document.version(),
                actor.userId(),
                actor.agent(),
                document.audit().updatedAt(),
                changes));
    }

    private static void version(Document document, long expected) {
        if (document.version() != expected) throw DocumentErrorCode.DOCUMENT_VERSION_CONFLICT.raise();
    }

    /** Where a document is, for its activity: the project (or none) and the folder (or none), ids only. */
    private static String place(String projectId, String folderId) {
        return Objects.toString(projectId, "") + "/" + Objects.toString(folderId, "");
    }

    /** Label ids in a stable order, joined by commas; null for none. */
    private static String ids(Set<String> ids) {
        return ids.isEmpty() ? null : ids.stream().sorted().collect(Collectors.joining(","));
    }

    private static String cursor(Instant updatedAt, String id) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((updatedAt + "|" + id).getBytes(StandardCharsets.UTF_8));
    }

    private static DocumentQuery.Cursor cursor(String text) {
        if (text == null || text.isBlank()) return null;
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(text), StandardCharsets.UTF_8).split("\\|", 2);
            return new DocumentQuery.Cursor(Instant.parse(parts[0]), parts[1]);
        } catch (IllegalArgumentException | DateTimeParseException | ArrayIndexOutOfBoundsException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }
}
