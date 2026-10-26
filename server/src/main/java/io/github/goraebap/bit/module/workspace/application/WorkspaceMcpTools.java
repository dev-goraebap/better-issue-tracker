package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Who an agent works as over MCP (D-081), and the people of a workspace it may assign work items to. */
@Component
@RequiredArgsConstructor
class WorkspaceMcpTools implements McpToolProvider {
    private final WorkspaceService workspaceService;
    private final IamFacade iamFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(
                new McpTool(
                        "whoami",
                        "나는 누구",
                        "이 API 키의 주인, 키의 에이전트 이름, 속한 워크스페이스와 역할을 돌려줍니다. 처음 연결하면 부르세요.",
                        McpTool.input().build(),
                        true,
                        this::whoami),
                new McpTool(
                        "list_members",
                        "구성원 목록",
                        "워크스페이스 구성원의 이름, 이메일, 역할을 돌려줍니다. 담당자는 이 이름이나 이메일로 지정합니다.",
                        McpTool.input()
                                .string("workspace", "워크스페이스 이름이나 슬러그. 속한 워크스페이스가 하나면 생략합니다.", false)
                                .build(),
                        true,
                        this::members));
    }

    private Object whoami(CurrentUser actor, McpArguments args) {
        var user = iamFacade.actor(actor, false);
        var view = new LinkedHashMap<String, Object>();
        view.put("name", user.name());
        view.put("email", user.email());
        view.put("agent", actor.agentName());
        view.put(
                "workspaces",
                workspaceService.mine(actor).stream()
                        .map(space -> Map.of("name", space.name(), "slug", space.slug(), "role", space.role()))
                        .toList());
        return view;
    }

    private Object members(CurrentUser actor, McpArguments args) {
        String workspace =
                workspaceService.resolve(actor, args.optionalString("workspace").orElse(null));
        return workspaceService.members(actor, workspace).stream()
                .map(member -> Map.of("name", member.name(), "email", member.email(), "role", member.role()))
                .toList();
    }
}
