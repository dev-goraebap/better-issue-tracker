package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.module.workitem.domain.WorkItemType;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.LinkedHashMap;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** The workspace's work item types for an agent over MCP (D-104): the names a work item's type is given by. */
@Component
@RequiredArgsConstructor
class WorkItemTypeMcpTools implements McpToolProvider {
    private final WorkItemTypeService workItemTypeService;
    private final WorkspaceFacade workspaceFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(new McpTool(
                "list_work_item_types",
                "업무 유형 목록",
                "워크스페이스의 업무 유형을 순서대로 돌려줍니다: 이름, 아이콘, 기본 유형인지, 상위가 꼭 있어야 하는지(parentRequired), 상위가 될 수 있는 유형(allowedParents, 비면 최상위). 유형이 정해지지 않은 업무는 isDefault인 유형으로 만들고, parentRequired인 유형은 create_subtask로 allowedParents 유형의 업무 아래에 만듭니다.",
                McpTool.input()
                        .string("workspace", "워크스페이스 이름이나 슬러그. 속한 워크스페이스가 하나면 생략합니다.", false)
                        .build(),
                true,
                this::list));
    }

    private Object list(CurrentUser actor, McpArguments args) {
        String workspace =
                workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
        var types = workItemTypeService.findAll(actor, workspace);
        return types.stream()
                .map(type -> {
                    var view = new LinkedHashMap<String, Object>();
                    view.put("name", type.name());
                    view.put("icon", type.icon());
                    view.put("isDefault", type.isDefault());
                    view.put("parentRequired", type.parentRequired());
                    view.put(
                            "allowedParents",
                            types.stream()
                                    .filter(parent -> type.parentTypeIds().contains(parent.id()))
                                    .map(WorkItemType::name)
                                    .toList());
                    return view;
                })
                .toList();
    }
}
