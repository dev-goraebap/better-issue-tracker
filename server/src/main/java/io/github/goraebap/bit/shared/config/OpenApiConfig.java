package io.github.goraebap.bit.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Schema;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class OpenApiConfig {
    @Bean
    OpenAPI openApi() {
        return new OpenAPI().info(new Info().title("BIT API").version("v1"));
    }

    @Bean
    OpenApiCustomizer nullableEnums() {
        return api -> {
            if (api.getComponents() == null || api.getComponents().getSchemas() == null) return;
            Set<Schema<?>> visited = Collections.newSetFromMap(new IdentityHashMap<>());
            api.getComponents().getSchemas().values().forEach(schema -> normalizeNullableEnums(schema, visited));
        };
    }

    private static void normalizeNullableEnums(Schema<?> schema, Set<Schema<?>> visited) {
        if (schema == null || !visited.add(schema)) return;
        // OpenAPI 3.1's enum must contain null itself, not only list null among its allowed types.
        if (schema.getTypes() != null
                && schema.getTypes().contains("null")
                && schema.getEnum() != null
                && !schema.getEnum().contains(null)) addNullEnumValue(schema);
        if (schema.getProperties() != null)
            schema.getProperties().values().forEach(child -> normalizeNullableEnums(child, visited));
        normalizeNullableEnums(schema.getItems(), visited);
        if (schema.getAllOf() != null) schema.getAllOf().forEach(child -> normalizeNullableEnums(child, visited));
        if (schema.getAnyOf() != null) schema.getAnyOf().forEach(child -> normalizeNullableEnums(child, visited));
        if (schema.getOneOf() != null) schema.getOneOf().forEach(child -> normalizeNullableEnums(child, visited));
        if (schema.getAdditionalProperties() instanceof Schema<?> additional)
            normalizeNullableEnums(additional, visited);
    }

    private static <T> void addNullEnumValue(Schema<T> schema) {
        var values = new ArrayList<>(schema.getEnum());
        values.add(null);
        schema.setEnum(values);
    }
}
