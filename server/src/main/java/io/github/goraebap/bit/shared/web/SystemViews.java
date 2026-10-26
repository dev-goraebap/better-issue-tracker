package io.github.goraebap.bit.shared.web;

import io.swagger.v3.oas.annotations.media.Schema;

final class SystemViews {
    private SystemViews() {}

    @Schema(requiredProperties = {"status"})
    record Health(String status) {}

    /**
     * Optional features that work now (D-030). objectStorage is whether files can be sent and opened (D-090), and
     * fileMaxBytes the most one attached file may weigh.
     */
    @Schema(
            requiredProperties = {"mail", "gitIntegration", "objectStorage", "documentConversion", "pdf", "fileMaxBytes"
            })
    record Capabilities(
            boolean mail,
            boolean gitIntegration,
            boolean objectStorage,
            boolean documentConversion,
            boolean pdf,
            long fileMaxBytes) {}
}
