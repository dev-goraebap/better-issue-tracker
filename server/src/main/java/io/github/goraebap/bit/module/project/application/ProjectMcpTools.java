package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** The workspace's projects for an agent over MCP (D-081): their keys, names and board columns, in the workspace's order. */
@Component
@RequiredArgsConstructor
class ProjectMcpTools implements McpToolProvider {
    private final ProjectQueryService projectQueryService;
    private final ProjectService projectService;
    private final WorkspaceFacade workspaceFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(new McpTool(
                "list_projects",
                "프로젝트 목록",
                "워크스페이스의 진행 중인 프로젝트를 워크스페이스 순서대로 돌려줍니다: 키(이슈 참조의 앞부분), 이름, 설명, 그리고 이슈를 옮길 수 있는 보드 칸.",
                McpTool.input()
                        .string("workspace", "워크스페이스 이름이나 슬러그. 속한 워크스페이스가 하나면 생략합니다.", false)
                        .build(),
                true,
                this::list));
    }

    private Object list(CurrentUser actor, McpArguments args) {
        String workspace =
                workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
        var page = projectQueryService.list(actor, workspace, "active", "", null, 100, "position", "ASC");
        return page.items().stream()
                .map(project -> {
                    var view = new LinkedHashMap<String, Object>();
                    view.put("key", project.key());
                    view.put("name", project.name());
                    view.put("description", project.description());
                    view.put(
                            "columns",
                            projectService.boardColumns(actor, workspace, project.id()).stream()
                                    .map(column -> Map.of(
                                            "name",
                                            column.name(),
                                            "category",
                                            column.category().name(),
                                            "final",
                                            column.finalColumn()))
                                    .toList());
                    return view;
                })
                .toList();
    }
}
