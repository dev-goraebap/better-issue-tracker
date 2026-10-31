package io.github.goraebap.bit.module.navigation.application;

import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.module.navigation.domain.Navigation;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class NavigationMcpTools implements McpToolProvider {
    private final NavigationService navigationService;
    private final WorkspaceFacade workspaceFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(
                new McpTool(
                        "get_navigation",
                        "메뉴 구성 조회",
                        "공간의 메뉴 이름·순서와 버전을 읽습니다. scope는 workspace 또는 프로젝트 ID입니다.",
                        McpTool.input()
                                .string("workspace", "워크스페이스 이름이나 슬러그", false)
                                .string("scope", "workspace 또는 프로젝트 ID", false)
                                .build(),
                        true,
                        (actor, args) -> navigationService.get(
                                actor,
                                space(actor, args),
                                args.optionalString("scope").orElse("workspace"))),
                new McpTool(
                        "set_navigation",
                        "메뉴 구성 저장",
                        "공간 관리자 권한으로 메뉴 이름·순서를 저장합니다. get_navigation에서 읽은 버전과 모든 key·label을 같은 순서의 배열로 보냅니다. URL과 권한은 바뀌지 않습니다.",
                        McpTool.input()
                                .string("workspace", "워크스페이스 이름이나 슬러그", false)
                                .string("scope", "workspace 또는 프로젝트 ID", false)
                                .integer("expected_version", "읽은 버전", 0, Integer.MAX_VALUE)
                                .strings("keys", "모든 메뉴 식별자, 원하는 순서", true)
                                .strings("labels", "keys와 같은 순서의 메뉴 이름", true)
                                .build(),
                        false,
                        (actor, args) -> {
                            var keys = args.strings("keys").orElseThrow();
                            var labels = args.strings("labels").orElseThrow();
                            if (keys.size() != labels.size() || !args.has("expected_version"))
                                throw new IllegalArgumentException("버전과 같은 길이의 keys·labels 배열이 필요합니다.");
                            return navigationService.save(
                                    actor,
                                    space(actor, args),
                                    args.optionalString("scope").orElse("workspace"),
                                    args.integer("expected_version", 0),
                                    IntStream.range(0, keys.size())
                                            .mapToObj(i -> new Navigation.Entry(keys.get(i), labels.get(i)))
                                            .toList());
                        }),
                new McpTool(
                        "set_project_favorite",
                        "프로젝트 즐겨찾기",
                        "현재 사용자의 프로젝트 즐겨찾기를 추가하거나 해제합니다. 다른 사람의 즐겨찾기는 바꾸지 않습니다.",
                        McpTool.input()
                                .string("workspace", "워크스페이스 이름이나 슬러그", false)
                                .string("project_id", "프로젝트 ID", true)
                                .bool("favorite", "추가 true, 해제 false (기본 true)")
                                .build(),
                        false,
                        (actor, args) -> {
                            navigationService.favorite(
                                    actor,
                                    space(actor, args),
                                    args.string("project_id"),
                                    args.bool("favorite").orElse(true));
                            return Map.of("updated", true);
                        }));
    }

    private String space(CurrentUser actor, McpArguments args) {
        return workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
    }
}
