package io.github.goraebap.bit.module.view.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.Getter;

/**
 * A saved view over a workspace's issues (D-066, D-068): shared with everyone, or personal to its owner. The built-in
 * '전체 이슈' is not stored; its key {@link #ALL} only names it for tweaks.
 */
@Getter
public final class IssueView {
    public static final String ALL = "all";
    public static final int NAME_MAX = 64;
    public static final int DESCRIPTION_MAX = 200;
    public static final int ICON_MAX = 32;
    public static final int FILTER_VALUE_MAX = 900;
    public static final String COLOR_PATTERN = "#[0-9a-fA-F]{6}";
    /** The filter keys the client owns; their values are opaque comma-joined strings. */
    public static final List<String> FILTER_KEYS = List.of("status", "priority", "assignee", "label");

    public enum Layout {
        list,
        calendar,
        board,
        timeline,
        cards,
        history
    }

    public enum SortKey {
        updated,
        created,
        priority,
        title
    }

    public enum Direction {
        asc,
        desc
    }

    public enum Column {
        status,
        priority,
        assignee,
        labels,
        due,
        updated,
        created
    }

    public record Sort(SortKey key, Direction direction) {
        public Sort {
            Objects.requireNonNull(key, "key");
            Objects.requireNonNull(direction, "direction");
        }
    }

    public enum Problem {
        DEFINITION,
        FILTERS,
        COLUMNS
    }

    /** What a view shows. Build it with {@link #of}; filters keep only non-blank values in {@link #FILTER_KEYS}. */
    public record Definition(
            String name,
            String description,
            String icon,
            String color,
            Layout layout,
            Map<String, String> filters,
            Sort sort,
            List<Column> columns) {
        public Definition {
            filters = Map.copyOf(filters);
            columns = List.copyOf(columns);
        }

        /** The first invalid part of a draft, so callers can name it before {@link #of} refuses it. */
        public static Optional<Problem> check(
                String name,
                String description,
                String icon,
                String color,
                Layout layout,
                Map<String, String> filters,
                Sort sort,
                List<Column> columns) {
            if (name == null
                    || name.strip().isEmpty()
                    || name.strip().length() > NAME_MAX
                    || description != null && description.strip().length() > DESCRIPTION_MAX
                    || icon == null
                    || icon.strip().isEmpty()
                    || icon.strip().length() > ICON_MAX
                    || color == null
                    || !color.matches(COLOR_PATTERN)
                    || layout == null
                    || sort == null) return Optional.of(Problem.DEFINITION);
            if (filters != null
                    && filters.entrySet().stream()
                            .anyMatch(e -> !FILTER_KEYS.contains(e.getKey())
                                    || e.getValue() != null
                                            && e.getValue().strip().length() > FILTER_VALUE_MAX))
                return Optional.of(Problem.FILTERS);
            if (!validColumns(columns)) return Optional.of(Problem.COLUMNS);
            return Optional.empty();
        }

        public static Definition of(
                String name,
                String description,
                String icon,
                String color,
                Layout layout,
                Map<String, String> filters,
                Sort sort,
                List<Column> columns) {
            if (check(name, description, icon, color, layout, filters, sort, columns)
                    .isPresent()) throw new IllegalArgumentException("Invalid view definition");
            String about = description == null || description.isBlank() ? null : description.strip();
            return new Definition(
                    name.strip(),
                    about,
                    icon.strip(),
                    color.toLowerCase(Locale.ROOT),
                    layout,
                    cleanFilters(filters),
                    sort,
                    columns);
        }

        /** The filters in {@link #FILTER_KEYS} order, for storage and responses. */
        public Map<String, String> orderedFilters() {
            var ordered = new LinkedHashMap<String, String>();
            for (String key : FILTER_KEYS) if (filters.containsKey(key)) ordered.put(key, filters.get(key));
            return ordered;
        }
    }

    private final UUID id;
    private final UUID workspaceId;
    private final UUID ownerId;
    private boolean personal;
    private Definition definition;
    private final double position;
    private long version;
    private Audit audit;

    private IssueView(
            UUID id,
            UUID workspaceId,
            UUID ownerId,
            boolean personal,
            Definition definition,
            double position,
            long version,
            Audit audit) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.ownerId = ownerId;
        this.personal = personal;
        this.definition = definition;
        this.position = position;
        this.version = version;
        this.audit = audit;
    }

    public static IssueView create(
            UUID workspaceId,
            UUID ownerId,
            boolean personal,
            Definition definition,
            double position,
            String agent,
            Instant now) {
        if (!Double.isFinite(position) || position < 0) throw new IllegalArgumentException("Invalid view position");
        return new IssueView(
                UUID.randomUUID(),
                workspaceId,
                ownerId,
                personal,
                Objects.requireNonNull(definition, "definition"),
                position,
                0,
                Audit.create(ownerId, agent, now));
    }

    /** The shared views a workspace starts with, after the built-in '전체 이슈' (same as V6's backfill). */
    public static List<IssueView> starters(UUID workspaceId, UUID ownerId, String agent, Instant now) {
        var usualSort = new Sort(SortKey.updated, Direction.desc);
        var usual = List.of(Column.status, Column.priority, Column.assignee, Column.labels, Column.updated);
        var definitions = List.of(
                Definition.of(
                        "백로그",
                        null,
                        "rows",
                        "#95959f",
                        Layout.list,
                        Map.of("status", "none"),
                        new Sort(SortKey.priority, Direction.asc),
                        usual),
                Definition.of("진행 보드", null, "board", "#f2c94c", Layout.board, Map.of(), usualSort, usual),
                Definition.of("캘린더", null, "calendar", "#4cb782", Layout.calendar, Map.of(), usualSort, usual),
                Definition.of(
                        "결정기록",
                        null,
                        "decision",
                        "#5e6ad2",
                        Layout.history,
                        Map.of("label", "system"),
                        usualSort,
                        List.of(Column.assignee, Column.labels, Column.updated)));
        return java.util.stream.IntStream.range(0, definitions.size())
                .mapToObj(i -> create(workspaceId, ownerId, false, definitions.get(i), i, agent, now))
                .toList();
    }

    public static IssueView fromPersistence(
            UUID id,
            UUID workspaceId,
            UUID ownerId,
            boolean personal,
            Definition definition,
            double position,
            long version,
            Audit audit) {
        return new IssueView(id, workspaceId, ownerId, personal, definition, position, version, audit);
    }

    public boolean visibleTo(UUID userId) {
        return !personal || ownerId.equals(userId);
    }

    public void revise(Definition next, boolean nextPersonal, UUID actor, String agent, Instant now) {
        Objects.requireNonNull(next, "definition");
        if (next.equals(definition) && nextPersonal == personal) return;
        definition = next;
        personal = nextPersonal;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void delete(UUID actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    static boolean validColumns(List<Column> columns) {
        return columns != null
                && columns.stream().noneMatch(Objects::isNull)
                && new HashSet<>(columns).size() == columns.size();
    }

    private static Map<String, String> cleanFilters(Map<String, String> filters) {
        var clean = new LinkedHashMap<String, String>();
        if (filters != null)
            for (String key : FILTER_KEYS) {
                String value = filters.get(key);
                if (value != null && !value.isBlank()) clean.put(key, value.strip());
            }
        return clean;
    }
}
