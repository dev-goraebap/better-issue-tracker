package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RelationMcpTools implements McpToolProvider {
    private final LinkService service;
    private final WorkspaceFacade workspaceFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(
                new McpTool(
                        "list_relations",
                        "관계 읽기",
                        "업무의 상위·하위 작업·문서, 문서의 참조·역참조를 현재 권한으로 읽습니다. 업무는 ref, 문서는 id를 줍니다.",
                        McpTool.input()
                                .string("type", "work_item 또는 document", true)
                                .string("id", "업무 참조(BIT-71) 또는 문서 id", true)
                                .string("workspace", "워크스페이스 이름", false)
                                .build(),
                        true,
                        this::list),
                new McpTool(
                        "link_targets",
                        "자료 연결",
                        "기존 업무·문서를 연결합니다. subtask_of는 from 업무가 to 업무의 하위입니다. relates_to는 업무·문서 연결, references는 from 문서가 to 문서를 참조합니다. 본문 참조는 문서 저장 시 자동 추적합니다.",
                        McpTool.input()
                                .string("from_type", "work_item 또는 document", true)
                                .string("from", "업무 참조 또는 문서 id", true)
                                .string("relation", "subtask_of, relates_to, references", true)
                                .string("to_type", "work_item 또는 document", true)
                                .string("to", "업무 참조 또는 문서 id", true)
                                .string("workspace", "워크스페이스 이름", false)
                                .build(),
                        false,
                        this::connect),
                new McpTool(
                        "unlink_targets",
                        "연결 해제",
                        "list_relations의 linkId로 명시적 연결만 해제합니다. 대상 업무·문서는 삭제하지 않습니다. 본문 참조는 문서 본문을 고쳐 제거합니다.",
                        McpTool.input()
                                .string("id", "linkId", true)
                                .string("workspace", "워크스페이스 이름", false)
                                .build(),
                        false,
                        this::unlink));
    }

    private String workspace(CurrentUser actor, McpArguments args) {
        return workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
    }

    private static TargetType type(String value) {
        if (!java.util.Set.of("document", "work_item").contains(value))
            throw new IllegalArgumentException("type은 document 또는 work_item입니다");
        return TargetType.valueOf(value);
    }

    private Object list(CurrentUser actor, McpArguments args) {
        String w = workspace(actor, args);
        var type = type(args.string("type"));
        return service.relations(actor, w, type, service.resolve(actor, w, type, args.string("id")));
    }

    private Object connect(CurrentUser actor, McpArguments args) {
        String w = workspace(actor, args);
        var from = type(args.string("from_type"));
        var to = type(args.string("to_type"));
        if (!java.util.Set.of("subtask_of", "relates_to", "references").contains(args.string("relation")))
            throw new IllegalArgumentException("지원하지 않는 관계입니다");
        return Map.of(
                "linkId",
                service.connect(
                        actor,
                        w,
                        from,
                        service.resolve(actor, w, from, args.string("from")),
                        args.string("relation"),
                        to,
                        service.resolve(actor, w, to, args.string("to"))));
    }

    private Object unlink(CurrentUser actor, McpArguments args) {
        service.disconnect(actor, workspace(actor, args), args.string("id"));
        return Map.of("unlinked", true);
    }
}
