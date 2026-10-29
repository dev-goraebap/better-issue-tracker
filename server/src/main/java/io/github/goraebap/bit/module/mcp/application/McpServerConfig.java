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
            BIT는 업무와 결정기록을 한곳에 두는 업무 트래커입니다. 업무는 ORM-14처럼 '프로젝트 키-번호' 참조로 가리킵니다.
            코드나 문서를 바꾸는 일을 맡으면 고치기 전에 list_work_items로 관련 업무를 찾고, 없으면 create_work_item으로 만드세요.
            get_work_item_context로 설명과 댓글·활동을 읽고 시작하며, 진행과 결과(커밋, 검증)는 add_comment로 남깁니다. 작업 중 찾은 다른 문제는 따로 업무로 만듭니다.
            지금 맡아 작업할 업무는 assignee에 me(API 키의 주인)를 넣어 만들고, 맡은 업무의 담당자가 비어 있으면 update_work_item으로 넣습니다. 나중으로 미뤄 두는 업무는 비워 둡니다.
            create_work_item을 부르기 전에 담당자·시작일·기한·우선순위·라벨과 유형·상위를 사용자가 말한 대로 채우고, 모르는 것만 제안값(예: 시작일 오늘, 기한 비움, 우선순위 보통)을 붙여 한 번에 묶어 물으세요. 나중으로 미뤄 두는 업무는 그 값들을 비워 둡니다.
            작업에는 유형(에픽·스토리·작업·버그 등)이 있고 유형마다 둘 수 있는 상위가 정해져 있습니다. 상위가 필요한 유형(예: 스토리는 에픽 아래)은 create_subtask로 상위 업무 아래에 만들고, 헷갈리면 list_work_item_types로 확인합니다. 규칙에 어긋나는 변경은 거절되며 오류에 고칠 방법이 적혀 있습니다.
            상태는 move_work_item으로 옮깁니다(할 일·진행 중·완료 같은 칸 이름이나 todo/doing/done).
            프로젝트가 GitHub·GitLab·Gitea 저장소와 연결돼 있으면 브랜치는 orm-14-짧은-영문, 커밋 메시지와 PR 제목에는 ORM-14처럼 업무 키를 넣습니다. 그러면 브랜치·PR·커밋이 업무에 붙고 PR 열기와 병합이 칸을 옮기므로, PR로 가는 작업은 완료로 직접 옮기지 말고 병합에 맡깁니다. 이슈 동기화가 켜져 있으면 설명과 댓글이 저장소 이슈에도 복사됩니다.
            요구사항·설계·기획·회의록처럼 오래 두고 고쳐 가며 보는 글은 create_document로 프로젝트의 폴더(예: 설계/화면)에 문서로 남기고, link_document로 관련 업무와 잇습니다. 찾을 때는 list_documents, 읽을 때는 get_document를 씁니다.
            결정기록은 앞으로 다른 작업이 따라야 할 선택(규칙·방식·제약)을 남기는 업무입니다. 작업 업무와 따로 만들고 labels에 '결정기록'을 넣습니다.
            기존 결정을 뒤집을 때와, 여러 안 중 하나를 골라 이후 작업이 그것을 따라야 할 때만 씁니다. 한 번 하고 끝나는 선택이나 새 기능 추가 자체는 작업 업무의 댓글로 충분합니다.
            결정기록 본문은 ## 맥락 / ## 결정 / ## 검토한 대안(실제로 따져 본 안이 있을 때만)이고 섹션마다 몇 문장입니다. 맥락에 그 결정이 나온 업무의 참조를 적고, 확정한 결정은 고치지 않고 새 결정기록으로 대체합니다.
            본문과 댓글은 마크다운입니다. 워크스페이스가 여럿이면 workspace 인자로 이름이나 슬러그를 주세요.
            BIT 자체의 버그(도구 오류, 설명과 다른 동작)나 개선 제안은 https://github.com/dev-goraebap/better-issue-tracker/issues 에 올립니다. 비밀값·사람·업무 내용을 뺀 초안을 사용자에게 먼저 보이고, 승인받은 뒤에만 올리세요.""";

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
