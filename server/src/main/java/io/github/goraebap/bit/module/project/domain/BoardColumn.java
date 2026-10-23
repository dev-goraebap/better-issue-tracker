package io.github.goraebap.bit.module.project.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;

@Getter
public final class BoardColumn {
    private final UUID id;
    private final UUID projectId;
    private String name;
    private String color;
    private int position;
    private boolean finalColumn;
    private long version;
    private Audit audit;

    private BoardColumn(
            UUID id,
            UUID projectId,
            String name,
            String color,
            int position,
            boolean finalColumn,
            long version,
            Audit audit) {
        this.id = id;
        this.projectId = projectId;
        this.name = name;
        this.color = color;
        this.position = position;
        this.finalColumn = finalColumn;
        this.version = version;
        this.audit = audit;
    }

    public static BoardColumn create(
            UUID projectId,
            String name,
            String color,
            int position,
            boolean finalColumn,
            UUID actor,
            String agent,
            Instant now) {
        return new BoardColumn(
                UUID.randomUUID(),
                projectId,
                validName(name),
                validColor(color),
                position,
                finalColumn,
                0,
                Audit.create(actor, agent, now));
    }

    public static BoardColumn fromPersistence(
            UUID id,
            UUID projectId,
            String name,
            String color,
            int position,
            boolean finalColumn,
            long version,
            Audit audit) {
        return new BoardColumn(id, projectId, name, color, position, finalColumn, version, audit);
    }

    public void configure(String name, String color, boolean finalColumn, UUID actor, String agent, Instant now) {
        String nextName = validName(name);
        String nextColor = validColor(color);
        this.name = nextName;
        this.color = nextColor;
        this.finalColumn = finalColumn;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void reorder(int position, UUID actor, String agent, Instant now) {
        if (position < 0) throw new IllegalArgumentException("Invalid column position");
        if (this.position == position) return;
        this.position = position;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void delete(UUID actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    private static String validName(String value) {
        if (value == null || value.strip().isEmpty() || value.strip().length() > 32)
            throw new IllegalArgumentException("Invalid column name");
        return value.strip();
    }

    private static String validColor(String value) {
        if (value != null && !value.matches("#[0-9a-fA-F]{6}"))
            throw new IllegalArgumentException("Invalid column color");
        return value;
    }
}
