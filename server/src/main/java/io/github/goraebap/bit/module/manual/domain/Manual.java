package io.github.goraebap.bit.module.manual.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;
import lombok.Getter;

@Getter
public final class Manual {
    private final String id;
    private final String workspaceId;
    private final String projectId;
    private String title;
    private String description;
    private String icon;
    private String color;
    private ManualContent content;
    private long version;
    private Audit audit;

    private Manual(
            String id,
            String workspaceId,
            String projectId,
            String title,
            String description,
            String icon,
            String color,
            ManualContent content,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.projectId = projectId;
        this.title = title;
        this.description = description;
        this.icon = icon;
        this.color = color;
        this.content = content;
        this.version = version;
        this.audit = audit;
    }

    public static Manual create(
            String id,
            String workspaceId,
            String projectId,
            String title,
            String description,
            String icon,
            String color,
            ManualContent content,
            String actor,
            String agent,
            Instant now) {
        var manual = new Manual(
                Ids.parse(id), workspaceId, projectId, "", "", "", "", content, -1, Audit.create(actor, agent, now));
        manual.revise(title, description, icon, color, content, actor, agent, now);
        return manual;
    }

    public static Manual fromPersistence(
            String id,
            String workspaceId,
            String projectId,
            String title,
            String description,
            String icon,
            String color,
            ManualContent content,
            long version,
            Audit audit) {
        return new Manual(id, workspaceId, projectId, title, description, icon, color, content, version, audit);
    }

    public void revise(
            String title,
            String description,
            String icon,
            String color,
            ManualContent content,
            String actor,
            String agent,
            Instant now) {
        String nextTitle = ManualContent.text(title, 120);
        String nextIcon = ManualContent.text(icon, 120);
        if (description == null || description.length() > 400 || color == null || !color.matches("#[0-9a-fA-F]{6}"))
            throw new IllegalArgumentException("Invalid manual settings");
        Objects.requireNonNull(content);
        this.title = nextTitle;
        this.description = description;
        this.icon = nextIcon;
        this.color = color;
        this.content = content;
        this.audit = audit.touch(actor, agent, now);
        version++;
    }

    public void delete(String actor, String agent, Instant now) {
        audit = audit.delete(actor, agent, now);
        version++;
    }
}
