package io.github.goraebap.bit.module.mcp;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * One MCP tool: its name, what it is for (read by the agent choosing it), its arguments as a JSON schema, whether it
 * only reads, and what it does for the API key's owner. The handler answers a value serialized to JSON for the agent;
 * a business error or a bad argument becomes the tool's error, its message the agent's to read.
 */
public record McpTool(
        String name,
        String title,
        String description,
        Map<String, Object> inputSchema,
        boolean readOnly,
        Handler handler) {
    public McpTool {
        Objects.requireNonNull(name);
        Objects.requireNonNull(description);
        inputSchema = Map.copyOf(inputSchema);
        Objects.requireNonNull(handler);
    }

    @FunctionalInterface
    public interface Handler {
        Object call(CurrentUser actor, McpArguments arguments);
    }

    /** A tool's arguments as a JSON schema object, built a property at a time. */
    public static Input input() {
        return new Input();
    }

    public static final class Input {
        private final Map<String, Object> properties = new LinkedHashMap<>();
        private final List<String> required = new java.util.ArrayList<>();

        private Input() {}

        public Input string(String name, String description, boolean isRequired) {
            return property(name, Map.of("type", "string", "description", description), isRequired);
        }

        public Input choice(String name, String description, List<String> values, boolean isRequired) {
            return property(
                    name,
                    Map.of("type", "string", "description", description, "enum", List.copyOf(values)),
                    isRequired);
        }

        public Input strings(String name, String description, boolean isRequired) {
            return property(
                    name,
                    Map.of("type", "array", "description", description, "items", Map.of("type", "string")),
                    isRequired);
        }

        public Input bool(String name, String description) {
            return property(name, Map.of("type", "boolean", "description", description), false);
        }

        public Input integer(String name, String description, int minimum, int maximum) {
            return property(
                    name,
                    Map.of("type", "integer", "description", description, "minimum", minimum, "maximum", maximum),
                    false);
        }

        private Input property(String name, Map<String, Object> schema, boolean isRequired) {
            properties.put(name, schema);
            if (isRequired) required.add(name);
            return this;
        }

        public Map<String, Object> build() {
            var schema = new LinkedHashMap<String, Object>();
            schema.put("type", "object");
            schema.put("properties", Map.copyOf(properties));
            schema.put("required", List.copyOf(required));
            schema.put("additionalProperties", false);
            return schema;
        }
    }
}
