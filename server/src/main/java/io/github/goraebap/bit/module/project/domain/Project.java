package io.github.goraebap.bit.module.project.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import lombok.Getter;

@Getter
public final class Project {
    private final String id;
    private final String workspaceId;
    private String name;
    private String description;
    private String icon;
    private String color;
    private final int position;
    private long lastWorkItemNumber;
    private long lastDecisionNumber;
    private long lastSessionNumber;
    private Instant archivedAt;
    private long version;
    private Audit audit;

    private Project(
            String id,
            String workspaceId,
            String name,
            String description,
            String icon,
            String color,
            int position,
            long lastWorkItemNumber,
            long lastDecisionNumber,
            long lastSessionNumber,
            Instant archivedAt,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.name = name;
        this.description = description;
        this.icon = icon;
        this.color = color;
        this.position = position;
        this.lastWorkItemNumber = lastWorkItemNumber;
        this.lastDecisionNumber = lastDecisionNumber;
        this.lastSessionNumber = lastSessionNumber;
        this.archivedAt = archivedAt;
        this.version = version;
        this.audit = audit;
    }

    public static Project create(
            String workspaceId,
            String name,
            String description,
            String icon,
            String color,
            int position,
            String actor,
            String agent,
            Instant now) {
        return new Project(
                Ids.newId(),
                workspaceId,
                validName(name),
                validDescription(description),
                validIcon(icon),
                validColor(color),
                position,
                0,
                0,
                0,
                null,
                0,
                Audit.create(actor, agent, now));
    }

    public static Project fromPersistence(
            String id,
            String workspaceId,
            String name,
            String description,
            String icon,
            String color,
            int position,
            long lastWorkItemNumber,
            long lastDecisionNumber,
            long lastSessionNumber,
            Instant archivedAt,
            long version,
            Audit audit) {
        return new Project(
                id,
                workspaceId,
                name,
                description,
                icon,
                color,
                position,
                lastWorkItemNumber,
                lastDecisionNumber,
                lastSessionNumber,
                archivedAt,
                version,
                audit);
    }

    public void revise(
            String name, String description, String icon, String color, String actor, String agent, Instant now) {
        String nextName = validName(name);
        String nextDescription = validDescription(description);
        String nextIcon = validIcon(icon);
        String nextColor = validColor(color);
        this.name = nextName;
        this.description = nextDescription;
        this.icon = nextIcon;
        this.color = nextColor;
        touch(actor, agent, now);
    }

    public void archive(boolean archived, String actor, String agent, Instant now) {
        if (archived == (archivedAt != null)) return;
        archivedAt = archived ? now : null;
        touch(actor, agent, now);
    }

    public void delete(String actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    public void restore(String actor, String agent, Instant now) {
        if (audit.deletedAt() == null) return;
        audit = audit.restore(actor, agent, now);
        version++;
    }

    public long allocateDecisionNumber() {
        lastDecisionNumber = Math.incrementExact(lastDecisionNumber);
        return lastDecisionNumber;
    }

    public long allocateSessionNumber() {
        lastSessionNumber = Math.incrementExact(lastSessionNumber);
        return lastSessionNumber;
    }

    public long allocateWorkItemNumber() {
        lastWorkItemNumber = Math.incrementExact(lastWorkItemNumber);
        return lastWorkItemNumber;
    }

    public void touch(String actor, String agent, Instant now) {
        audit = audit.touch(actor, agent, now);
        version = Math.incrementExact(version);
    }

    private static String validName(String value) {
        if (value == null || value.strip().isEmpty() || value.strip().length() > 64)
            throw new IllegalArgumentException("Invalid project name");
        return value.strip();
    }

    private static String validDescription(String value) {
        if (value != null && value.length() > 20000) throw new IllegalArgumentException("Project description too long");
        return value;
    }

    /** One of the views' icon names, or none (the screen shows the key's first letter). */
    private static String validIcon(String value) {
        if (value == null) return null;
        if (value.strip().isEmpty() || value.strip().length() > 32)
            throw new IllegalArgumentException("Invalid project icon");
        return value.strip();
    }

    private static String validColor(String value) {
        if (value != null && !value.matches("#[0-9a-fA-F]{6}"))
            throw new IllegalArgumentException("Invalid project color");
        return value;
    }
}
