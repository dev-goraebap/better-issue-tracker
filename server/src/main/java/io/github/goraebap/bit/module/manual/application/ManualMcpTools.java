package io.github.goraebap.bit.module.manual.application;

import io.github.goraebap.bit.module.manual.domain.ManualContent;
import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class ManualMcpTools implements McpToolProvider {
    private final ManualService manualService;
    private final WorkspaceFacade workspaceFacade;
    private final ProjectFacade projectFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(
                new McpTool(
                        "list_manuals",
                        "매뉴얼 찾기",
                        "접근 가능한 공통·프로젝트 매뉴얼을 찾습니다. 본문은 get_manual로 읽습니다.",
                        base().string("project", "프로젝트 키. 생략하면 워크스페이스 전체", false)
                                .string("cursor", "다음 쪽 커서", false)
                                .integer("limit", "개수", 1, 100)
                                .build(),
                        true,
                        (actor, args) -> {
                            String w = workspace(actor, args);
                            return manualService.list(
                                    actor,
                                    w,
                                    args.optionalString("project")
                                            .map(key -> projectFacade
                                                    .findByKey(actor, w, key)
                                                    .id())
                                            .orElse(null),
                                    args.optionalString("cursor").orElse(null),
                                    args.integer("limit", 30));
                        }),
                new McpTool(
                        "get_manual",
                        "매뉴얼 읽기",
                        "매뉴얼의 섹션·페이지 본문·이미지 경로·댓글·version을 읽습니다.",
                        book().build(),
                        true,
                        (actor, args) -> manualService.get(actor, workspace(actor, args), args.string("id"))),
                new McpTool(
                        "create_manual",
                        "매뉴얼 만들기",
                        "공통 또는 프로젝트 매뉴얼을 만듭니다. 페이지는 create_manual_page로 추가합니다.",
                        base().string("project", "프로젝트 키. 생략하면 공통", false)
                                .string("title", "이름", true)
                                .string("description", "설명", false)
                                .string("icon", "아이콘 이름", false)
                                .string("color", "#rrggbb", false)
                                .build(),
                        false,
                        this::create),
                new McpTool(
                        "update_manual",
                        "매뉴얼 설정",
                        "이름·설명·아이콘·색상 중 준 값만 바꿉니다. 먼저 get_manual로 version을 읽으세요.",
                        version()
                                .string("title", "이름", false)
                                .string("description", "설명. 비우려면 빈 문자열", false)
                                .string("icon", "아이콘", false)
                                .string("color", "#rrggbb", false)
                                .build(),
                        false,
                        this::settings),
                new McpTool(
                        "create_manual_section",
                        "매뉴얼 섹션 추가",
                        "새 섹션을 끝에 추가합니다.",
                        version().string("title", "섹션 제목", true).build(),
                        false,
                        this::section),
                new McpTool(
                        "update_manual_section",
                        "매뉴얼 섹션 고치기",
                        "기존 섹션 제목을 바꿉니다.",
                        version()
                                .string("section_id", "섹션 id", true)
                                .string("title", "제목", true)
                                .build(),
                        false,
                        this::section),
                new McpTool(
                        "get_manual_page",
                        "매뉴얼 페이지 읽기",
                        "페이지 본문과 매뉴얼 version을 읽습니다.",
                        book().string("page_id", "페이지 id", true).build(),
                        true,
                        (actor, args) -> {
                            var d = get(actor, args);
                            return Map.of(
                                    "version",
                                    d.version(),
                                    "page",
                                    d.content().pages().stream()
                                            .filter(p -> p.id().equals(args.string("page_id")))
                                            .findFirst()
                                            .orElseThrow(ManualErrorCode.MANUAL_NOT_FOUND::raise));
                        }),
                new McpTool(
                        "create_manual_page",
                        "매뉴얼 페이지 추가",
                        "페이지를 추가합니다. 이미지는 REST 파일 업로드 뒤 upload_ids와 attachment:id 본문으로 연결합니다.",
                        pageInput().build(),
                        false,
                        this::page),
                new McpTool(
                        "update_manual_page",
                        "매뉴얼 페이지 고치기",
                        "페이지를 수정합니다. 생략한 값은 유지하고 body는 통째로 바뀝니다.",
                        pageInput().string("page_id", "페이지 id", true).build(),
                        false,
                        this::page),
                new McpTool(
                        "reorder_manual",
                        "매뉴얼 순서",
                        "섹션/페이지 id를 각각 빠짐없이 한 번씩 줍니다. page_sections는 page_ids와 같은 길이로 섹션 id 또는 root를 지정합니다.",
                        version()
                                .strings("section_ids", "섹션 순서", true)
                                .strings("page_ids", "페이지 순서", true)
                                .strings("page_sections", "페이지별 섹션 id 또는 root", true)
                                .build(),
                        false,
                        this::reorder),
                new McpTool(
                        "add_manual_comment",
                        "매뉴얼 개선 의견",
                        "페이지에 의견을 남깁니다. 작성자는 인증된 사용자와 에이전트로 기록합니다.",
                        version()
                                .string("page_id", "페이지 id", true)
                                .string("body", "개선 의견 Markdown", true)
                                .build(),
                        false,
                        this::comment),
                new McpTool(
                        "resolve_manual_comment",
                        "매뉴얼 의견 해결",
                        "의견을 해결하거나 다시 엽니다.",
                        version()
                                .string("comment_id", "댓글 id", true)
                                .bool("resolved", "true 해결, false 다시 열기")
                                .build(),
                        false,
                        this::resolve));
    }

    private static McpTool.Input base() {
        return McpTool.input().string("workspace", "워크스페이스 이름이나 슬러그", false);
    }

    private static McpTool.Input book() {
        return base().string("id", "매뉴얼 id", true);
    }

    private static McpTool.Input version() {
        return book().integer(
                        "expected_version", "get_manual_page 또는 get_manual에서 읽은 책 version (필수)", 0, Integer.MAX_VALUE);
    }

    private static McpTool.Input pageInput() {
        return version()
                .string("title", "페이지 제목 (추가 시 필수)", false)
                .string("body", "Markdown 본문", false)
                .string("section_id", "섹션 id 또는 root", false)
                .strings("upload_ids", "새 본문에서 참조하는 파일 업로드 id", false);
    }

    private String workspace(CurrentUser actor, McpArguments args) {
        return workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
    }

    private ManualViews.Detail get(CurrentUser actor, McpArguments args) {
        return manualService.get(actor, workspace(actor, args), args.string("id"));
    }

    private ManualViews.Detail edit(CurrentUser actor, McpArguments args) {
        var d = get(actor, args);
        if (d.version() != args.integer("expected_version", -1)) throw ManualErrorCode.MANUAL_VERSION_CONFLICT.raise();
        return d;
    }

    private Object create(CurrentUser actor, McpArguments args) {
        String w = workspace(actor, args);
        String id = Ids.newId();
        manualService.save(
                actor,
                w,
                new ManualRequests.Save(
                        id,
                        args.optionalString("project")
                                .map(key ->
                                        projectFacade.findByKey(actor, w, key).id())
                                .orElse(null),
                        null,
                        args.string("title"),
                        args.optionalString("description").orElse(""),
                        args.optionalString("icon").orElse("s:notebook-2"),
                        args.optionalString("color").orElse("#bb87fc"),
                        new ManualContent(List.of(), List.of(), List.of()),
                        List.of()),
                true);
        return manualService.get(actor, w, id);
    }

    private Object settings(CurrentUser actor, McpArguments args) {
        var d = edit(actor, args);
        manualService.save(
                actor,
                workspace(actor, args),
                new ManualRequests.Save(
                        d.id(),
                        d.projectId(),
                        d.version(),
                        args.optionalString("title").orElse(d.title()),
                        args.has("description")
                                ? args.optionalString("description").orElse("")
                                : d.description(),
                        args.optionalString("icon").orElse(d.icon()),
                        args.optionalString("color").orElse(d.color()),
                        d.content(),
                        List.of()),
                false);
        return get(actor, args);
    }

    private Object save(CurrentUser actor, McpArguments args, ManualViews.Detail d, ManualContent content) {
        manualService.save(
                actor,
                workspace(actor, args),
                new ManualRequests.Save(
                        d.id(),
                        d.projectId(),
                        d.version(),
                        d.title(),
                        d.description(),
                        d.icon(),
                        d.color(),
                        content,
                        args.strings("upload_ids").orElse(List.of())),
                false);
        return get(actor, args);
    }

    private Object section(CurrentUser actor, McpArguments args) {
        var d = edit(actor, args);
        var sections = new ArrayList<>(d.content().sections());
        if (args.has("section_id")) {
            int at = -1;
            for (int i = 0; i < sections.size(); i++)
                if (sections.get(i).id().equals(args.string("section_id"))) at = i;
            if (at < 0) throw ManualErrorCode.MANUAL_NOT_FOUND.raise();
            sections.set(at, new ManualContent.Section(args.string("section_id"), args.string("title")));
        } else sections.add(new ManualContent.Section(Ids.newId(), args.string("title")));
        return save(
                actor,
                args,
                d,
                new ManualContent(sections, d.content().pages(), d.content().comments()));
    }

    private Object page(CurrentUser actor, McpArguments args) {
        var d = edit(actor, args);
        var pages = new ArrayList<>(d.content().pages());
        String section =
                args.optionalString("section_id").filter(s -> !s.equals("root")).orElse("");
        if (args.has("page_id")) {
            int at = -1;
            for (int i = 0; i < pages.size(); i++) if (pages.get(i).id().equals(args.string("page_id"))) at = i;
            if (at < 0) throw ManualErrorCode.MANUAL_NOT_FOUND.raise();
            var old = pages.get(at);
            pages.set(
                    at,
                    new ManualContent.Page(
                            old.id(),
                            args.optionalString("title").orElse(old.title()),
                            args.has("body") ? args.optionalString("body").orElse("") : old.body(),
                            args.has("section_id") ? section : old.sectionId(),
                            old.updatedAt()));
        } else
            pages.add(new ManualContent.Page(
                    Ids.newId(),
                    args.string("title"),
                    args.optionalString("body").orElse(""),
                    section,
                    null));
        return save(
                actor,
                args,
                d,
                new ManualContent(d.content().sections(), pages, d.content().comments()));
    }

    private Object reorder(CurrentUser actor, McpArguments args) {
        var d = edit(actor, args);
        var sectionIds = args.strings("section_ids").orElseThrow();
        var pageIds = args.strings("page_ids").orElseThrow();
        var destinations = args.strings("page_sections").orElseThrow();
        if (sectionIds.size() != d.content().sections().size()
                || pageIds.size() != d.content().pages().size()
                || destinations.size() != pageIds.size()) throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
        var sections = sectionIds.stream()
                .map(id -> d.content().sections().stream()
                        .filter(s -> s.id().equals(id))
                        .findFirst()
                        .orElseThrow())
                .toList();
        var pages = new ArrayList<ManualContent.Page>();
        for (int i = 0; i < pageIds.size(); i++) {
            String id = pageIds.get(i);
            var p = d.content().pages().stream()
                    .filter(item -> item.id().equals(id))
                    .findFirst()
                    .orElseThrow();
            pages.add(new ManualContent.Page(
                    p.id(),
                    p.title(),
                    p.body(),
                    Objects.equals(destinations.get(i), "root") ? "" : destinations.get(i),
                    p.updatedAt()));
        }
        return save(
                actor, args, d, new ManualContent(sections, pages, d.content().comments()));
    }

    private Object comment(CurrentUser actor, McpArguments args) {
        var d = edit(actor, args);
        var comments = new ArrayList<>(d.content().comments());
        comments.add(new ManualContent.Comment(
                Ids.newId(), args.string("page_id"), args.string("body"), false, null, null, null, null, null, null));
        return save(
                actor,
                args,
                d,
                new ManualContent(d.content().sections(), d.content().pages(), comments));
    }

    private Object resolve(CurrentUser actor, McpArguments args) {
        var d = edit(actor, args);
        String id = args.string("comment_id");
        if (d.content().comments().stream().noneMatch(c -> c.id().equals(id)))
            throw ManualErrorCode.MANUAL_NOT_FOUND.raise();
        var comments = d.content().comments().stream()
                .map(c -> c.id().equals(id)
                        ? new ManualContent.Comment(
                                c.id(),
                                c.pageId(),
                                c.body(),
                                args.bool("resolved").orElse(true),
                                c.createdAt(),
                                c.authorId(),
                                c.authorName(),
                                c.agentName(),
                                c.resolvedAt(),
                                c.resolvedBy())
                        : c)
                .toList();
        return save(
                actor,
                args,
                d,
                new ManualContent(d.content().sections(), d.content().pages(), comments));
    }
}
