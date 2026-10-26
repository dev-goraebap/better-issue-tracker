package io.github.goraebap.bit.module.project.domain;

import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import lombok.Getter;

@Getter
public final class BoardColumn {
    private final String id;
    private final String projectId;
    private String name;
    private String color;
    private int position;
    private boolean finalColumn;
    private ColumnCategory category;
    private long version;
    private Audit audit;

    private BoardColumn(
            String id,
            String projectId,
            String name,
            String color,
            int position,
            boolean finalColumn,
            ColumnCategory category,
            long version,
            Audit audit) {
        this.id = id;
        this.projectId = projectId;
        this.name = name;
        this.color = color;
        this.position = position;
        this.finalColumn = finalColumn;
        this.category = category;
        this.version = version;
        this.audit = audit;
    }

    public static BoardColumn create(
            String projectId,
            String name,
            String color,
            int position,
            boolean finalColumn,
            ColumnCategory category,
            String actor,
            String agent,
            Instant now) {
        return new BoardColumn(
                Ids.newId(),
                projectId,
                validName(name),
                validColor(color),
                position,
                finalColumn,
                validCategory(finalColumn, category),
                0,
                Audit.create(actor, agent, now));
    }

    public static BoardColumn fromPersistence(
            String id,
            String projectId,
            String name,
            String color,
            int position,
            boolean finalColumn,
            ColumnCategory category,
            long version,
            Audit audit) {
        return new BoardColumn(id, projectId, name, color, position, finalColumn, category, version, audit);
    }

    public void configure(
            String name,
            String color,
            boolean finalColumn,
            ColumnCategory category,
            String actor,
            String agent,
            Instant now) {
        String nextName = validName(name);
        String nextColor = validColor(color);
        ColumnCategory nextCategory = validCategory(finalColumn, category);
        this.name = nextName;
        this.color = nextColor;
        this.finalColumn = finalColumn;
        this.category = nextCategory;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void reorder(int position, String actor, String agent, Instant now) {
        if (position < 0) throw new IllegalArgumentException("Invalid column position");
        if (this.position == position) return;
        this.position = position;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void delete(String actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    private static String validName(String value) {
        if (value == null || value.strip().isEmpty() || value.strip().length() > 32)
            throw new IllegalArgumentException("Invalid column name");
        return value.strip();
    }

    /** A final column always counts as done; the other columns may use any category. */
    public static boolean allows(boolean finalColumn, ColumnCategory category) {
        return category != null && (!finalColumn || category == ColumnCategory.done);
    }

    private static ColumnCategory validCategory(boolean finalColumn, ColumnCategory category) {
        if (!allows(finalColumn, category)) throw new IllegalArgumentException("Invalid column category");
        return category;
    }

    private static String validColor(String value) {
        if (value != null && !value.matches("#[0-9a-fA-F]{6}"))
            throw new IllegalArgumentException("Invalid column color");
        return value;
    }
}
