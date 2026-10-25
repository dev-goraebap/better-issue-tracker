package io.github.goraebap.bit.module.mcp.application;

import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.modelcontextprotocol.common.McpTransportContext;
import io.modelcontextprotocol.json.McpJsonMapper;
import io.modelcontextprotocol.json.jackson3.JacksonMcpJsonMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpStatelessServerFeatures.SyncToolSpecification;
import io.modelcontextprotocol.server.McpStatelessSyncServer;
import io.modelcontextprotocol.server.transport.HttpServletStatelessServerTransport;
import io.modelcontextprotocol.spec.McpSchema;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

/**
 * BIT's MCP server at /api/mcp (D-022, D-081): Streamable HTTP without sessions, every request a JSON-RPC message
 * answered with JSON and carrying its own API key, so nothing lives between requests and a restart drops no agent. The
 * tools are the modules' (McpToolProvider), run for the key's owner with its agent name recorded (D-021); a session
 * cookie is not an agent and is refused.
 */
@Configuration(proxyBeanMethods = false)
class McpServerConfig {
    static final String ENDPOINT = "/api/mcp";
    private static final String ACTOR = "actor";
    private static final Logger LOG = LoggerFactory.getLogger(McpServerConfig.class);
    private static final String INSTRUCTIONS = """
            BIT는 이슈·결정기록·근거를 한곳에 두는 이슈 트래커입니다. 이슈는 ORM-14처럼 '프로젝트 키-번호' 참조로 가리킵니다.
            작업을 시작하면 get_work_item_context로 이슈의 설명과 댓글·활동을 먼저 읽고, 진행 상황과 결과는 add_comment로 남기세요.
            상태는 move_work_item으로 옮깁니다(할 일·진행 중·완료 같은 칸 이름이나 todo/doing/done).
            의미 있는 판단은 labels에 '결정기록'을 넣은 이슈로 남기고, 본문은 ## 배경 / ## 선택지 / ## 결정 / ## 이유 / ## 기각한 대안 / ## 후속 작업 으로 씁니다.
            본문과 댓글은 마크다운입니다. 워크스페이스가 여럿이면 workspace 인자로 이름이나 슬러그를 주세요.""";

    @Bean
    HttpServletStatelessServerTransport mcpTransport(JsonMapper jsonMapper) {
        return HttpServletStatelessServerTransport.builder()
                .jsonMapper(new JacksonMcpJsonMapper(jsonMapper))
                .messageEndpoint(ENDPOINT)
                // The authentication filter has already put the key's owner on the request.
                .contextExtractor(
                        request -> request.getAttribute(CurrentUser.class.getName()) instanceof CurrentUser actor
                                ? McpTransportContext.create(Map.of(ACTOR, actor))
                                : McpTransportContext.EMPTY)
                .maxRequestSize(1_048_576)
                .build();
    }

    @Bean
    ServletRegistrationBean<HttpServletStatelessServerTransport> mcpServlet(
            HttpServletStatelessServerTransport transport) {
        return new ServletRegistrationBean<>(transport, ENDPOINT);
    }

    @Bean(destroyMethod = "close")
    McpStatelessSyncServer mcpServer(
            HttpServletStatelessServerTransport transport, List<McpToolProvider> providers, JsonMapper jsonMapper) {
        var mapper = new JacksonMcpJsonMapper(jsonMapper);
        var tools = providers.stream()
                .flatMap(provider -> provider.tools().stream())
                .toList();
        var names = new HashSet<String>();
        for (var tool : tools)
            if (!names.add(tool.name())) throw new IllegalStateException("MCP tool registered twice: " + tool.name());
        return McpServer.sync(transport)
                .serverInfo("bit", "1")
                .instructions(INSTRUCTIONS)
                .capabilities(
                        McpSchema.ServerCapabilities.builder().tools(false).build())
                .jsonMapper(mapper)
                .immediateExecution(true)
                .tools(tools.stream().map(tool -> spec(tool, mapper)).toList())
                .build();
    }

    private static SyncToolSpecification spec(McpTool tool, McpJsonMapper mapper) {
        var definition = McpSchema.Tool.builder()
                .name(tool.name())
                .title(tool.title())
                .description(tool.description())
                .inputSchema(tool.inputSchema())
                .annotations(new McpSchema.ToolAnnotations(tool.title(), tool.readOnly(), false, null, false, null))
                .build();
        return new SyncToolSpecification(definition, (context, request) -> call(tool, context, request, mapper));
    }

    /** Runs a tool for the key's owner: its answer as JSON, or what went wrong as the tool's error for the agent to read. */
    private static McpSchema.CallToolResult call(
            McpTool tool, McpTransportContext context, McpSchema.CallToolRequest request, McpJsonMapper mapper) {
        if (!(context.get(ACTOR) instanceof CurrentUser actor) || actor.method() != CurrentUser.Method.API_KEY)
            return error("API 키로 연결해야 합니다. BIT 설정의 API 키에서 만든 키를 Authorization: Bearer로 보내세요.");
        try {
            Object value = tool.handler().call(actor, new McpArguments(request.arguments()));
            return McpSchema.CallToolResult.builder()
                    .addTextContent(mapper.writeValueAsString(value))
                    .isError(false)
                    .build();
        } catch (BusinessException failure) {
            return error(failure.errorCode().code() + ": " + failure.getMessage());
        } catch (IllegalArgumentException invalid) {
            return error(invalid.getMessage());
        } catch (IOException | RuntimeException failure) {
            LOG.error("MCP tool {} failed", tool.name(), failure);
            return error("도구를 실행하지 못했습니다. 잠시 뒤 다시 시도하세요.");
        }
    }

    private static McpSchema.CallToolResult error(String message) {
        return McpSchema.CallToolResult.builder()
                .addTextContent(message)
                .isError(true)
                .build();
    }
}
