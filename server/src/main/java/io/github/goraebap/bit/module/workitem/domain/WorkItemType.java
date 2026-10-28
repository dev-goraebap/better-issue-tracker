package io.github.goraebap.bit.module.workitem.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import lombok.Getter;

/**
 * A kind of task a workspace tracks (D-104), such as 에픽 or 버그, and the types it may sit under. A type with no allowed
 * parents is top-level; one that requires a parent always has at least one. Events have no type.
 */
@Getter
public final class WorkItemType {
    public static final int NAME_MAX = 32;
    public static final int ICON_MAX = 32;
    public static final String COLOR_PATTERN = "#[0-9a-fA-F]{6}";

    /** A type every new workspace starts with; parents are named by the other defaults' names. */
    public record Seed(
            String name, String icon, String color, boolean isDefault, boolean parentRequired, List<String> parents) {
        public Seed {
            parents = List.copyOf(parents);
        }
    }

    /** 에픽 on top, 스토리 under it, and 작업·버그 under either or under 작업 (D-104). */
    public static final List<Seed> SEEDS = List.of(
            new Seed("에픽", "epic", "#8b5cf6", false, false, List.of()),
            new Seed("스토리", "story", "#10b981", false, true, List.of("에픽")),
            new Seed("작업", "tasks", "#3b82f6", true, false, List.of("에픽", "스토리", "작업")),
            new Seed("버그", "bug", "#ef4444", false, false, List.of("에픽", "스토리", "작업")));

    private final String id;
    private final String workspaceId;
    private String name;
    private String icon;
    private String color;
    private int position;
    private boolean isDefault;
    private boolean parentRequired;
    private Set<String> parentTypeIds;
    private long version;
    private Audit audit;

    private WorkItemType(
            String id,
            String workspaceId,
            String name,
            String icon,
            String color,
            int position,
            boolean isDefault,
            boolean parentRequired,
            Set<String> parentTypeIds,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.name = name;
        this.icon = icon;
        this.color = color;
        this.position = position;
        this.isDefault = isDefault;
        this.parentRequired = parentRequired;
        this.parentTypeIds = Set.copyOf(parentTypeIds);
        this.version = version;
        this.audit = audit;
    }

    /** A new type; its id is given so a set of types can name each other as parents before they are saved. */
    public static WorkItemType create(
            String id,
            String workspaceId,
            String name,
            String icon,
            String color,
            int position,
            boolean parentRequired,
            Set<String> parentTypeIds,
            String actor,
            String agent,
            Instant now) {
        var parents = Set.copyOf(Objects.requireNonNull(parentTypeIds, "parentTypeIds"));
        requireRule(parentRequired, parents);
        return new WorkItemType(
                Ids.parse(id),
                Objects.requireNonNull(workspaceId),
                validName(name),
                validIcon(icon),
                validColor(color),
                position,
                false,
                parentRequired,
                parents,
                0,
                Audit.create(actor, agent, now));
    }

    public static WorkItemType fromPersistence(
            String id,
            String workspaceId,
            String name,
            String icon,
            String color,
            int position,
            boolean isDefault,
            boolean parentRequired,
            Set<String> parentTypeIds,
            long version,
            Audit audit) {
        return new WorkItemType(
                id, workspaceId, name, icon, color, position, isDefault, parentRequired, parentTypeIds, version, audit);
    }

    /** Whether a work item of this type may sit under one of the other type. */
    public boolean allowsParent(String parentTypeId) {
        return parentTypeId != null && parentTypeIds.contains(parentTypeId);
    }

    public boolean topLevel() {
        return parentTypeIds.isEmpty();
    }

    public boolean deleted() {
        return audit.deletedAt() != null;
    }

    /** Whether the name differs from the current one after the same trimming a revision applies. */
    public boolean renames(String next) {
        return next == null || !next.strip().equals(name);
    }

    /** Whether the rule (required, allowed parents) would change. */
    public boolean changesRule(boolean nextRequired, Set<String> nextParents) {
        return nextRequired != parentRequired || !parentTypeIds.equals(Set.copyOf(nextParents));
    }

    public void revise(
            String name,
            String icon,
            String color,
            boolean parentRequired,
            Set<String> parentTypeIds,
            String actor,
            String agent,
            Instant now) {
        String nextName = validName(name);
        String nextIcon = validIcon(icon);
        String nextColor = validColor(color);
        var parents = Set.copyOf(Objects.requireNonNull(parentTypeIds, "parentTypeIds"));
        requireRule(parentRequired, parents);
        if (isDefault && parentRequired) throw new IllegalArgumentException("The default type needs no parent");
        if (nextName.equals(this.name)
                && Objects.equals(nextIcon, this.icon)
                && nextColor.equals(this.color)
                && parentRequired == this.parentRequired
                && parents.equals(this.parentTypeIds)) return;
        this.name = nextName;
        this.icon = nextIcon;
        this.color = nextColor;
        this.parentRequired = parentRequired;
        this.parentTypeIds = parents;
        touch(actor, agent, now);
    }

    /** Makes this the type a task gets when none is named; it must not need a parent, so one can always be made. */
    public void makeDefault(boolean value, String actor, String agent, Instant now) {
        if (value && parentRequired) throw new IllegalArgumentException("The default type needs no parent");
        if (value == isDefault) return;
        isDefault = value;
        touch(actor, agent, now);
    }

    /** Leaves out a deleted type from the ones this may sit under. */
    public void forgetParent(String parentTypeId, String actor, String agent, Instant now) {
        if (!parentTypeIds.contains(parentTypeId)) return;
        var rest = new java.util.HashSet<>(parentTypeIds);
        rest.remove(parentTypeId);
        requireRule(parentRequired, rest);
        parentTypeIds = Set.copyOf(rest);
        touch(actor, agent, now);
    }

    public WorkItemType atPosition(int value) {
        position = value;
        return this;
    }

    public void delete(String actor, String agent, Instant now) {
        if (isDefault) throw new IllegalStateException("The default type cannot be deleted");
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    private void touch(String actor, String agent, Instant now) {
        audit = audit.touch(actor, agent, now);
        version++;
    }

    private static void requireRule(boolean parentRequired, Set<String> parents) {
        if (parentRequired && parents.isEmpty())
            throw new IllegalArgumentException("A type that needs a parent names at least one");
    }

    private static String validName(String value) {
        if (value == null || value.strip().isEmpty() || value.strip().length() > NAME_MAX)
            throw new IllegalArgumentException("Invalid work item type name");
        return value.strip();
    }

    private static String validIcon(String value) {
        if (value == null || value.isBlank()) return null;
        if (value.strip().length() > ICON_MAX) throw new IllegalArgumentException("Invalid work item type icon");
        return value.strip();
    }

    private static String validColor(String value) {
        if (value == null || !value.matches(COLOR_PATTERN))
            throw new IllegalArgumentException("Invalid work item type color");
        return value.toLowerCase(Locale.ROOT);
    }
}
