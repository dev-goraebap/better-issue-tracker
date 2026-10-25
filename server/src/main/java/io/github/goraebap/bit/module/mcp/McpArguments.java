package io.github.goraebap.bit.module.mcp;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * A tool call's arguments, read by name. A missing required argument or a value of the wrong shape is the agent's to
 * correct, so it is an IllegalArgumentException whose message says which argument and why, in the words the tool's
 * error shows.
 */
public final class McpArguments {
    private final Map<String, Object> values;

    public McpArguments(Map<String, Object> values) {
        this.values = values == null
                ? Map.of()
                : Map.copyOf(values.entrySet().stream()
                        .filter(entry -> entry.getValue() != null)
                        .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));
    }

    public boolean has(String name) {
        return values.containsKey(name);
    }

    public String string(String name) {
        return optionalString(name).orElseThrow(() -> new IllegalArgumentException(name + " 값이 필요합니다."));
    }

    /** The text given, trimmed; empty text counts as not given. */
    public Optional<String> optionalString(String name) {
        Object value = values.get(name);
        if (value == null) return Optional.empty();
        if (!(value instanceof String text)) throw new IllegalArgumentException(name + "는 문자열이어야 합니다.");
        return text.isBlank() ? Optional.empty() : Optional.of(text.strip());
    }

    public Optional<List<String>> strings(String name) {
        Object value = values.get(name);
        if (value == null) return Optional.empty();
        if (!(value instanceof List<?> list) || !list.stream().allMatch(String.class::isInstance))
            throw new IllegalArgumentException(name + "는 문자열 배열이어야 합니다.");
        return Optional.of(list.stream()
                .map(String.class::cast)
                .map(String::strip)
                .filter(each -> !each.isEmpty())
                .toList());
    }

    public Optional<Boolean> bool(String name) {
        Object value = values.get(name);
        if (value == null) return Optional.empty();
        if (!(value instanceof Boolean flag)) throw new IllegalArgumentException(name + "는 true 또는 false여야 합니다.");
        return Optional.of(flag);
    }

    public int integer(String name, int fallback) {
        Object value = values.get(name);
        if (value == null) return fallback;
        if (!(value instanceof Number number)) throw new IllegalArgumentException(name + "는 숫자여야 합니다.");
        return number.intValue();
    }

    /** A day as YYYY-MM-DD. */
    public Optional<LocalDate> date(String name) {
        return optionalString(name).map(text -> {
            try {
                return LocalDate.parse(text);
            } catch (DateTimeParseException invalid) {
                throw new IllegalArgumentException(name + "는 YYYY-MM-DD 형식이어야 합니다.");
            }
        });
    }
}
