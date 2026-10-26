package io.github.goraebap.bit.module.document.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import lombok.Getter;

/**
 * A document (D-093): a title and Markdown text, kept in a folder of a project's part (projectId) or of the
 * workspace's own part (null), at the part's top when folderId is null, with workspace labels.
 */
@Getter
public final class Document {
    public static final int TITLE_MAX = 200;
    public static final int BODY_MAX = 200_000;

    private final String id;
    private final String workspaceId;
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
            String projectId,
            String folderId,
            String title,
            String body,
            Set<String> labelIds,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
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
                projectId,
                folderId,
                validTitle(title),
                validBody(body),
                labelIds,
                0,
                Audit.create(actor, agent, now));
    }

    public static Document fromPersistence(
            String id,
            String workspaceId,
            String projectId,
            String folderId,
            String title,
            String body,
            Set<String> labelIds,
            long version,
            Audit audit) {
        return new Document(id, workspaceId, projectId, folderId, title, body, labelIds, version, audit);
    }

    /** Changes the words and labels; the version moves only when something changed. */
    public void revise(String title, String body, Set<String> labelIds, String actor, String agent, Instant now) {
        String nextTitle = validTitle(title);
        String nextBody = validBody(body);
        var nextLabels = Set.copyOf(labelIds);
        if (nextTitle.equals(this.title) && nextBody.equals(this.body) && nextLabels.equals(this.labelIds)) return;
        this.title = nextTitle;
        this.body = nextBody;
        this.labelIds = nextLabels;
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
