package io.github.goraebap.bit.module.document.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;
import lombok.Getter;

/**
 * A folder of 문서함 (D-093): a name in a project's part (projectId) or the workspace's own part (null), under another
 * folder of the same part or at its top (parentId null). A project's own folder is the project itself and has no row.
 */
@Getter
public final class Folder {
    public static final int NAME_MAX = 128;

    private final String id;
    private final String workspaceId;
    private final String projectId;
    private String parentId;
    private String name;
    private String color;
    private long version;
    private Audit audit;

    private Folder(
            String id,
            String workspaceId,
            String projectId,
            String parentId,
            String name,
            String color,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.projectId = projectId;
        this.parentId = parentId;
        this.name = name;
        this.color = color;
        this.version = version;
        this.audit = audit;
    }

    public static Folder create(
            String workspaceId,
            String projectId,
            String parentId,
            String name,
            String color,
            String actor,
            String agent,
            Instant now) {
        return new Folder(
                Ids.newId(),
                Objects.requireNonNull(workspaceId),
                projectId,
                parentId,
                validName(name),
                validColor(color),
                0,
                Audit.create(actor, agent, now));
    }

    public static Folder fromPersistence(
            String id,
            String workspaceId,
            String projectId,
            String parentId,
            String name,
            String color,
            long version,
            Audit audit) {
        return new Folder(id, workspaceId, projectId, parentId, name, color, version, audit);
    }

    public void revise(String name, String color, String actor, String agent, Instant now) {
        String next = validName(name);
        String nextColor = validColor(color);
        if (next.equals(this.name) && Objects.equals(nextColor, this.color)) return;
        this.name = next;
        this.color = nextColor;
        touch(actor, agent, now);
    }

    /** Moves the folder under another of its part, or to its top; the caller has ruled out moving it into itself. */
    public void move(String parentId, String actor, String agent, Instant now) {
        if (id.equals(parentId)) throw new IllegalArgumentException("A folder cannot hold itself");
        if (Objects.equals(parentId, this.parentId)) return;
        this.parentId = parentId;
        touch(actor, agent, now);
    }

    public void delete(String actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    /** Whether a folder of that name would clash with this one, as the unique index compares (letter case aside). */
    public boolean named(String other) {
        return other != null && name.equalsIgnoreCase(other.strip());
    }

    public static String validName(String value) {
        if (value == null) throw new IllegalArgumentException("Invalid folder name");
        String name = value.strip();
        if (name.isEmpty() || name.length() > NAME_MAX || name.contains("/"))
            throw new IllegalArgumentException("Invalid folder name");
        return name;
    }

    private void touch(String actor, String agent, Instant now) {
        audit = audit.touch(actor, agent, now);
        version++;
    }

    private static String validColor(String value) {
        if (value != null && !value.matches("#[0-9a-fA-F]{6}"))
            throw new IllegalArgumentException("Invalid folder color");
        return value;
    }
}
