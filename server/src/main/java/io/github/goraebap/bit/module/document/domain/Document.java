package io.github.goraebap.bit.module.document.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import lombok.Getter;

/**
 * A document (D-093): a title and Markdown text, kept in a folder of a project's part (projectId) or of the
 * workspace's own part (null), at the part's top when folderId is null, with workspace labels. A page (D-113) is a
 * document whose content is its versions; its body is the latest version's text, which only a new version changes.
 */
@Getter
public final class Document {
    public static final int TITLE_MAX = 200;
    public static final int BODY_MAX = 200_000;

    private final String id;
    private final String workspaceId;
    private final DocumentKind kind;
    private String projectId;
    private String folderId;
    private String title;
    private String body;
    private Set<String> labelIds;
    private long version;
    private Audit audit;

    private Document(
            String id,
            String workspaceId,
            DocumentKind kind,
            String projectId,
            String folderId,
            String title,
            String body,
            Set<String> labelIds,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.kind = Objects.requireNonNull(kind);
        this.projectId = projectId;
        this.folderId = folderId;
        this.title = title;
        this.body = body;
        this.labelIds = Set.copyOf(labelIds);
        this.version = version;
        this.audit = audit;
    }

    public static Document create(
            String workspaceId,
            String projectId,
            String folderId,
            String title,
            String body,
            Set<String> labelIds,
            String actor,
            String agent,
            Instant now) {
        return new Document(
                Ids.newId(),
                Objects.requireNonNull(workspaceId),
                DocumentKind.markdown,
                projectId,
                folderId,
                validTitle(title),
                validBody(body),
                labelIds,
                0,
                Audit.create(actor, agent, now));
    }

    /** A page whose first version is saved with it; its body is that version's text. */
    public static Document createPage(
            String workspaceId,
            String projectId,
            String folderId,
            String title,
            Set<String> labelIds,
            PageText text,
            String actor,
            String agent,
            Instant now) {
        return new Document(
                Ids.newId(),
                Objects.requireNonNull(workspaceId),
                DocumentKind.page,
                projectId,
                folderId,
                validTitle(title),
                text.value(),
                labelIds,
                0,
                Audit.create(actor, agent, now));
    }

    public static Document fromPersistence(
            String id,
            String workspaceId,
            DocumentKind kind,
            String projectId,
            String folderId,
            String title,
            String body,
            Set<String> labelIds,
            long version,
            Audit audit) {
        return new Document(id, workspaceId, kind, projectId, folderId, title, body, labelIds, version, audit);
    }

    /**
     * Changes the words and labels; the version moves only when something changed. A page's body comes from its latest
     * version, so a different body for a page is refused; the same one, as a title-only edit sends back, passes.
     */
    public void revise(String title, String body, Set<String> labelIds, String actor, String agent, Instant now) {
        String nextTitle = validTitle(title);
        String nextBody = validBody(body);
        var nextLabels = Set.copyOf(labelIds);
        if (kind == DocumentKind.page && !nextBody.equals(this.body)) throw new PageBodyIsDerived();
        if (nextTitle.equals(this.title) && nextBody.equals(this.body) && nextLabels.equals(this.labelIds)) return;
        this.title = nextTitle;
        this.body = nextBody;
        this.labelIds = nextLabels;
        touch(actor, agent, now);
    }

    /** A page's new version became its latest: the body becomes its text and the document moves on. */
    public void publish(PageText text, String actor, String agent, Instant now) {
        if (kind != DocumentKind.page) throw new IllegalStateException("Only a page has versions");
        this.body = text.value();
        touch(actor, agent, now);
    }

    /** Puts the document in another folder or part; the caller has checked that the folder is of that part. */
    public void move(String projectId, String folderId, String actor, String agent, Instant now) {
        if (Objects.equals(projectId, this.projectId) && Objects.equals(folderId, this.folderId)) return;
        this.projectId = projectId;
        this.folderId = folderId;
        touch(actor, agent, now);
    }

    public void delete(String actor, String agent, Instant now) {
        if (deleted()) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    /** Brings a deleted document back; when its folder is gone since, it returns to the top of its part. */
    public void restore(boolean folderLives, String actor, String agent, Instant now) {
        if (!deleted()) return;
        if (!folderLives) folderId = null;
        audit = audit.restore(actor, agent, now);
        version++;
    }

    public boolean deleted() {
        return audit.deletedAt() != null;
    }

    private static String validTitle(String value) {
        if (value == null || value.strip().isEmpty() || value.strip().length() > TITLE_MAX)
            throw new IllegalArgumentException("Invalid document title");
        return value.strip();
    }

    private static String validBody(String value) {
        String body = value == null ? "" : value;
        if (body.length() > BODY_MAX) throw new IllegalArgumentException("Document body too long");
        return body;
    }

    private void touch(String actor, String agent, Instant now) {
        audit = audit.touch(actor, agent, now);
        version++;
    }
}
