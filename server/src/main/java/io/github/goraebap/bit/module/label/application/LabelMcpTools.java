package io.github.goraebap.bit.module.label.application;

import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** The workspace's labels for an agent over MCP (D-081): the names an issue's labels are given by. */
@Component
@RequiredArgsConstructor
class LabelMcpTools implements McpToolProvider {
    private final LabelService labelService;
    private final WorkspaceFacade workspaceFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(new McpTool(
                "list_labels",
                "라벨 목록",
                "워크스페이스의 라벨 이름을 돌려줍니다. system이 true인 '결정기록'은 앞으로 다른 작업이 따라야 할 선택을 남기는 이슈에 붙입니다(작업 이슈와 따로).",
                McpTool.input()
                        .string("workspace", "워크스페이스 이름이나 슬러그. 속한 워크스페이스가 하나면 생략합니다.", false)
                        .build(),
                true,
                this::list));
    }

    private Object list(CurrentUser actor, McpArguments args) {
        String workspace =
                workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
        return labelService.findAll(actor, workspace).stream()
                .map(label -> Map.of("name", label.name(), "color", label.color(), "system", label.system()))
                .toList();
    }
}
