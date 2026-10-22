package io.github.goraebap.bit.shared.web;

import io.swagger.v3.oas.annotations.media.Schema;

final class SystemViews {
    private SystemViews() {}

    @Schema(requiredProperties = {"status"})
    record Health(String status) {}

    @Schema(requiredProperties = {"mail", "gitIntegration", "objectStorage", "documentConversion", "pdf"})
    record Capabilities(
            boolean mail, boolean gitIntegration, boolean objectStorage, boolean documentConversion, boolean pdf) {}
}
