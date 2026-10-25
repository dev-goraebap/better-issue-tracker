package io.github.goraebap.bit.module.mcp;

import java.util.List;

/**
 * A module's MCP tools (D-022, D-081). Each module registers its own from its application layer, as it has its own
 * controllers, so a tool runs the same Service and the same rules as the HTTP API; the mcp module only serves them.
 */
public interface McpToolProvider {
    List<McpTool> tools();
}
