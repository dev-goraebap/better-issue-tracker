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
public class EngagementMcpTools implements McpToolProvider {
    private final EngagementService service;
    private final LinkService linkService;
    private final WorkspaceFacade workspaceFacade;

    private static McpTool.Input input() {
        return McpTool.input()
                .choice("type", "대상 종류", List.of("work_item", "document", "comment"), true)
                .string("id", "업무 참조(BIT-76), 문서 id 또는 댓글 id", true)
                .string("workspace", "워크스페이스 이름", false);
    }

    @Override
    public List<McpTool> tools() {
        return List.of(
                new McpTool(
                        "list_detail_engagement",
                        "리액션·첨부 읽기",
                        "현재 접근 권한으로 대상의 이모지 리액션과 첨부 파일을 읽습니다.",
                        input().build(),
                        true,
                        this::list),
                new McpTool(
                        "set_reaction",
                        "내 리액션 변경",
                        "키 주인의 리액션을 멱등하게 설정합니다. active=false면 내 리액션만 제거합니다.",
                        input().string(
                                        "emoji",
                                        "지원 이모지: 👍 👎 ❤️ 🎉 🚀 👀 ✅ 🙏 💡 🔥 😄 🤔 🙂 😂 🙌 💯 👋 👌 ⚠️ ❌ 😢 😮 👏 💪",
                                        true)
                                .bool("active", "기본 true, false면 제거")
                                .build(),
                        false,
                        this::react),
                new McpTool(
                        "attach_files",
                        "업로드 파일 연결",
                        "업로드 API로 바이트 전송을 끝낸 자신의 uploadIds를 대상에 연결합니다. 업무·문서는 파일 Markdown 블록을 본문 끝에 추가하며 편집기로 위치를 바꿀 수 있습니다. 댓글 첨부는 댓글 작성자만 변경합니다.",
                        input().strings("uploadIds", "완료한 업로드 id (1~20개)", true).build(),
                        false,
                        this::attach),
                new McpTool(
                        "remove_attachment",
                        "첨부 제거",
                        "대상과 첨부 파일의 연결 및 파일을 제거합니다. 대상 자체는 남습니다.",
                        input().string("fileId", "첨부 id", true).build(),
                        false,
                        this::discard));
    }

    private String workspace(CurrentUser actor, McpArguments args) {
        return workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
    }

    private String id(CurrentUser actor, String workspace, McpArguments args) {
        return "work_item".equals(args.string("type"))
                ? linkService.resolve(actor, workspace, TargetType.work_item, args.string("id"))
                : args.string("id");
    }

    private Object list(CurrentUser actor, McpArguments args) {
        String w = workspace(actor, args);
        String id = id(actor, w, args);
        String type = args.string("type");
        return Map.of("reactions", service.reactions(actor, w, type, id), "files", service.files(actor, w, type, id));
    }

    private Object react(CurrentUser actor, McpArguments args) {
        String w = workspace(actor, args);
        service.react(
                actor,
                w,
                args.string("type"),
                id(actor, w, args),
                args.string("emoji"),
                args.bool("active").orElse(true));
        return Map.of("updated", true);
    }

    private Object attach(CurrentUser actor, McpArguments args) {
        String w = workspace(actor, args);
        var uploads = args.strings("uploadIds").orElse(List.of());
        if (uploads.isEmpty() || uploads.size() > 20) throw new IllegalArgumentException("uploadIds는 1~20개입니다");
        service.attach(actor, w, args.string("type"), id(actor, w, args), uploads);
        return Map.of("attached", true);
    }

    private Object discard(CurrentUser actor, McpArguments args) {
        String w = workspace(actor, args);
        service.discard(actor, w, args.string("type"), id(actor, w, args), args.string("fileId"));
        return Map.of("removed", true);
    }
}
