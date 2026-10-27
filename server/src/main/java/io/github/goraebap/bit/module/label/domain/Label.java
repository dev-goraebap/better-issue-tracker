package io.github.goraebap.bit.module.label.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Locale;
import lombok.Getter;

@Getter
public final class Label {
    public static final int NAME_MAX = 32;
    public static final String COLOR_PATTERN = "#[0-9a-fA-F]{6}";
    public static final String DECISION_KEY = "decision";
    public static final String DECISION_NAME = "결정기록";
    public static final String DECISION_COLOR = "#5e6ad2";

    private final String id;
    private final String workspaceId;
    private String name;
    private String color;
    private final String systemKey;
    private long version;
    private int position;
    private Audit audit;

    private Label(
            String id, String workspaceId, String name, String color, String systemKey, long version, Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.name = name;
        this.color = color;
        this.systemKey = systemKey;
        this.version = version;
        this.audit = audit;
    }

    public static Label create(String workspaceId, String name, String color, String actor, String agent, Instant now) {
        return new Label(
                Ids.newId(), workspaceId, validName(name), validColor(color), null, 0, Audit.create(actor, agent, now));
    }

    /** The decision label every workspace has (D-066). Users may recolour it but not rename or delete it. */
    public static Label decision(String workspaceId, String actor, String agent, Instant now) {
        return new Label(
                Ids.newId(),
                workspaceId,
                DECISION_NAME,
                DECISION_COLOR,
                DECISION_KEY,
                0,
                Audit.create(actor, agent, now));
    }

    public static Label fromPersistence(
            String id, String workspaceId, String name, String color, String systemKey, long version, Audit audit) {
        return new Label(id, workspaceId, name, color, systemKey, version, audit);
    }

    public Label atPosition(int value) {
        position = value;
        return this;
    }

    public boolean system() {
        return systemKey != null;
    }

    /** Whether the name differs from the current one after the same trimming a revision applies. */
    public boolean renames(String next) {
        return next == null || !next.strip().equals(name);
    }

    public void revise(String name, String color, String actor, String agent, Instant now) {
        String nextName = validName(name);
        String nextColor = validColor(color);
        if (system() && !nextName.equals(this.name)) throw new IllegalStateException("System labels keep their name");
        if (nextName.equals(this.name) && nextColor.equals(this.color)) return;
        this.name = nextName;
        this.color = nextColor;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void delete(String actor, String agent, Instant now) {
        if (system()) throw new IllegalStateException("System labels cannot be deleted");
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    private static String validName(String value) {
        if (value == null || value.strip().isEmpty() || value.strip().length() > NAME_MAX)
            throw new IllegalArgumentException("Invalid label name");
        return value.strip();
    }

    private static String validColor(String value) {
        if (value == null || !value.matches(COLOR_PATTERN)) throw new IllegalArgumentException("Invalid label color");
        return value.toLowerCase(Locale.ROOT);
    }
}
