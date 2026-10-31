package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.TimelineFacade;
import io.github.goraebap.bit.module.mcp.McpArguments;
import io.github.goraebap.bit.module.mcp.McpTool;
import io.github.goraebap.bit.module.mcp.McpToolProvider;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * An agent's documents over MCP (D-081, D-093): finding, reading, writing and moving Markdown documents, and linking
 * them to the work items they are about. Projects are named by key, folders by a slash-separated path ("설계/화면")
 * and labels by name; a document is named by its id.
 */
@Component
@RequiredArgsConstructor
class DocumentMcpTools implements McpToolProvider {
    private static final String WORKSPACE = "워크스페이스 이름이나 슬러그. 속한 워크스페이스가 하나면 생략합니다.";
    private static final String PROJECT = "프로젝트 키. 예: ORM. 생략하면 워크스페이스 공통 문서";
    private static final String FOLDER = "폴더 경로. 예: 설계/화면. 생략하면 맨 위";
    private final DocumentService documentService;
    private final PageService pageService;
    private final io.github.goraebap.bit.module.link.LinkFacade relationFacade;
    private final FolderService folderService;
    private final DocumentQuery documentQuery;
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;
    private final LabelFacade labelFacade;
    private final WorkItemFacade workItemFacade;
    private final TimelineFacade timelineFacade;

    @Override
    public List<McpTool> tools() {
        return List.of(
                new McpTool(
                        "list_documents",
                        "문서 목록",
                        "문서를 찾습니다. folder를 주면 그 폴더의 하위 폴더와 문서를, 아니면 최근 고친 순으로 찾습니다(project·query·label로 좁힘). 요구사항·설계·기획·회의록 같은 글은 문서에 있습니다.",
                        McpTool.input()
                                .string("project", PROJECT + "(folder를 줄 때). 찾을 때 생략하면 모든 문서", false)
                                .string("folder", FOLDER, false)
                                .string("query", "제목에서 찾을 말", false)
                                .string("label", "라벨 이름", false)
                                .integer("limit", "가져올 개수 (기본 30)", 1, 100)
                                .string("cursor", "앞 응답의 nextCursor로 다음 쪽을 읽습니다", false)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        true,
                        this::list),
                new McpTool(
                        "get_document",
                        "문서 읽기",
                        "문서 하나를 통째로 읽습니다: 제목, 위치, 라벨, 마크다운 본문, 연결된 업무, 그리고 댓글과 활동을 오래된 순으로. "
                                + "페이지(kind page)는 body 대신 최신 버전에서 뽑은 text와, page에 최신 버전·시작 파일·보는 주소·버전 목록·파일 목록을 줍니다.",
                        McpTool.input()
                                .string("id", "문서 id (list_documents의 id)", true)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        true,
                        this::get),
                new McpTool(
                        "create_document",
                        "문서 만들기",
                        "새 마크다운 문서를 만들고 id를 돌려줍니다. 오래 두고 고쳐 가며 보는 글(요구사항·설계·기획·회의록·결정기록)을 씁니다. 없는 폴더는 경로대로 만듭니다. 결정기록은 labels에 '결정기록'을 넣고 본문을 ## 맥락 / ## 결정 / ## 검토한 대안 으로 씁니다.",
                        McpTool.input()
                                .string("project", PROJECT, false)
                                .string("folder", FOLDER + ". 없는 폴더는 만듭니다", false)
                                .string("title", "제목", true)
                                .string("body", "마크다운 본문", false)
                                .strings("labels", "라벨 이름들. 예: [\"설계\"]", false)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::create),
                new McpTool(
                        "update_document",
                        "문서 고치기",
                        "문서의 준 값만 바꿉니다. body는 통째로 바뀌고 labels는 준 목록으로 바뀝니다. project나 folder를 주면 그 위치로 옮깁니다(워크스페이스 공통으로 옮기려면 project에 none). "
                                + "페이지의 내용은 body로 바꿀 수 없고 update_page로 새 버전을 올립니다.",
                        McpTool.input()
                                .string("id", "문서 id", true)
                                .string("title", "새 제목", false)
                                .string("body", "새 마크다운 본문 (통째로 바뀝니다)", false)
                                .strings("labels", "라벨 이름들 (이 목록으로 바뀝니다)", false)
                                .string("project", "옮길 프로젝트 키, 또는 none(워크스페이스 공통)", false)
                                .string("folder", "옮길 폴더 경로, 또는 none(맨 위). 없는 폴더는 만듭니다", false)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::update),
                new McpTool(
                        "create_page",
                        "페이지 만들기",
                        "로컬에서 만든 HTML 결과물(설명서·시안·흐름도)을 문서함의 페이지로 올리고 버전 1을 만듭니다. 먼저 폴더를 zip 하나로 묶어 "
                                + "REST POST /api/v1/files/uploads에 {\"filename\":\"page.zip\",\"size\":바이트,\"purpose\":\"page\"}로 올릴 자리를 받고, "
                                + "응답의 url(BIT 주소 기준)로 method·headers 그대로 zip을 보낸 뒤 그 id를 upload_id로 줍니다. "
                                + "zip 맨 위 폴더 하나는 벗겨지고, 시작 파일은 entry 또는 index.html입니다. html·css·js·json·svg·그림·글꼴만 받고, "
                                + "한 파일 안에서 data-bit-id가 겹치면 거절합니다. 외부 주소(CDN)는 BIT에서 막히고 Pretendard 글꼴은 BIT가 대신 줍니다. "
                                + "같은 upload_id로 다시 부르면 이미 만든 페이지를 돌려줍니다.",
                        McpTool.input()
                                .string("project", PROJECT, false)
                                .string("folder", FOLDER + ". 없는 폴더는 만듭니다", false)
                                .string("title", "제목", true)
                                .string("upload_id", "purpose page로 올린 zip의 업로드 id", true)
                                .string("entry", "처음 열 HTML 파일의 묶음 안 경로 (기본 index.html)", false)
                                .string("note", "이 버전이 무엇인지 한 줄", false)
                                .string("base_commit", "결과물이 설명하는 코드의 기준 커밋", false)
                                .strings("labels", "라벨 이름들. 예: [\"설계\"]", false)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::createPage),
                new McpTool(
                        "update_page",
                        "페이지 새 버전",
                        "페이지에 새 버전을 올립니다. 묶음을 create_page와 같이 purpose page로 올리고 그 upload_id를 줍니다. "
                                + "버전은 바뀌지 않고 쌓이며, 본문(검색 글자)은 새 버전의 시작 파일 글자로 바뀝니다. 제목·라벨·위치는 update_document로 바꿉니다. "
                                + "같은 upload_id로 다시 부르면 이미 만든 버전을 돌려줍니다.",
                        McpTool.input()
                                .string("id", "페이지 id", true)
                                .string("upload_id", "purpose page로 올린 zip의 업로드 id", true)
                                .string("entry", "처음 열 HTML 파일의 묶음 안 경로 (기본 index.html)", false)
                                .string("note", "이 버전에서 바꾼 것 한 줄", false)
                                .string("base_commit", "결과물이 설명하는 코드의 기준 커밋", false)
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::updatePage),
                new McpTool(
                        "link_document",
                        "문서와 업무 잇기",
                        "문서를 그 문서가 다루는 업무와 잇습니다. remove가 true면 연결을 끊습니다.",
                        McpTool.input()
                                .string("id", "문서 id", true)
                                .string("work_item", "업무 참조. 예: ORM-14", true)
                                .bool("remove", "true면 연결을 끊습니다")
                                .string("workspace", WORKSPACE, false)
                                .build(),
                        false,
                        this::link));
    }

    private Object list(CurrentUser actor, McpArguments args) {
        String workspace = workspace(actor, args);
        String projectId =
                project(actor, workspace, args.optionalString("project")).orElse(null);
        var folder = args.optionalString("folder");
        if (folder.isPresent()) {
            String folderId = folderService.resolve(actor, workspace, projectId, folder.get(), false);
            var contents = documentService.contents(actor, workspace, projectId, folderId);
            var view = new LinkedHashMap<String, Object>();
            view.put("path", path(contents.path()));
            view.put(
                    "folders",
                    contents.folders().stream().map(DocumentViews.Folder::name).toList());
            view.put("documents", summaries(actor, workspace, contents.documents()));
            return view;
        }
        String labelId = args.optionalString("label")
                .map(name ->
                        labelIds(actor, workspace, List.of(name)).iterator().next())
                .orElse(null);
        var page = documentService.search(
                actor,
                workspace,
                new DocumentQuery.Search(
                        projectId, false, labelId, args.optionalString("query").orElse(null), null),
                args.optionalString("cursor").orElse(null),
                args.integer("limit", 30));
        var view = new LinkedHashMap<String, Object>();
        view.put("items", summaries(actor, workspace, page.items()));
        view.put("nextCursor", page.nextCursor());
        return view;
    }

    private Object get(CurrentUser actor, McpArguments args) {
        String workspace = workspace(actor, args);
        var document = documentService.get(actor, workspace, args.string("id"));
        var labels = labelNames(actor, workspace);
        var view = new LinkedHashMap<String, Object>();
        view.put("id", document.id());
        view.put("title", document.title());
        view.put("project", projectKey(actor, workspace, document.projectId()));
        view.put("folder", path(document.path()));
        view.put("labels", document.labelIds().stream().map(labels::get).toList());
        view.put("kind", document.kind());
        if (document.page() == null) view.put("body", document.body());
        else {
            view.put("text", document.body());
            view.put("page", page(actor, workspace, document));
        }
        view.put(
                "workItems",
                document.workItems().stream()
                        .map(item -> Map.of("ref", item.reference(), "title", item.title()))
                        .toList());
        view.put("updatedAt", document.updatedAt());
        view.put("updatedByAgent", document.updatedByAgent());
        view.put(
                "timeline",
                timelineFacade.lines(actor, workspace, TargetType.document, document.id(), 200).stream()
                        .map(line -> {
                            var entry = new LinkedHashMap<String, Object>();
                            entry.put("kind", line.kind());
                            entry.put("at", line.at());
                            entry.put("by", line.actorName());
                            if (line.actorAgent() != null) entry.put("agent", line.actorAgent());
                            if (line.body() != null) entry.put("body", line.body());
                            if (line.action() != null) entry.put("action", line.action());
                            if (line.field() != null) entry.put("field", line.field());
                            return entry;
                        })
                        .toList());
        view.put("relations", relationFacade.relations(actor, workspace, TargetType.document, document.id()));
        return view;
    }

    private Object create(CurrentUser actor, McpArguments args) {
        String workspace = workspace(actor, args);
        String projectId =
                project(actor, workspace, args.optionalString("project")).orElse(null);
        String folderId = folderService.resolve(
                actor, workspace, projectId, args.optionalString("folder").orElse(null), true);
        Set<String> labelIds = args.strings("labels")
                .map(names -> labelIds(actor, workspace, names))
                .orElse(Set.of());
        String id = documentService.create(
                actor,
                workspace,
                projectId,
                folderId,
                args.string("title"),
                args.optionalString("body").orElse(null),
                labelIds);
        return Map.of("id", id, "title", args.string("title").strip());
    }

    private Object update(CurrentUser actor, McpArguments args) {
        String workspace = workspace(actor, args);
        String id = args.string("id");
        var current = documentService.get(actor, workspace, id);
        var request = new DocumentRequests.Update();
        request.setExpectedVersion(current.version());
        args.optionalString("title").ifPresent(request::setTitle);
        if (args.has("body")) request.setBody(args.optionalString("body").orElse(""));
        args.strings("labels").ifPresent(names -> request.setLabelIds(List.copyOf(labelIds(actor, workspace, names))));
        documentService.revise(actor, workspace, id, request);
        var project = args.optionalString("project");
        var folder = args.optionalString("folder");
        if (project.isPresent() || folder.isPresent()) {
            String projectId =
                    project.isPresent() ? project(actor, workspace, project).orElse(null) : current.projectId();
            String path =
                    folder.filter(value -> !value.equalsIgnoreCase("none")).orElse(null);
            // Without a folder the document keeps its folder in its own part and goes to the top of another.
            String folderId = folder.isPresent()
                    ? folderService.resolve(actor, workspace, projectId, path, true)
                    : Objects.equals(projectId, current.projectId()) ? current.folderId() : null;
            var moved = documentService.get(actor, workspace, id);
            documentService.move(actor, workspace, id, moved.version(), projectId, folderId);
        }
        var after = documentService.get(actor, workspace, id);
        return Map.of("id", id, "title", after.title(), "version", after.version());
    }

    private Object createPage(CurrentUser actor, McpArguments args) {
        String workspace = workspace(actor, args);
        String projectId =
                project(actor, workspace, args.optionalString("project")).orElse(null);
        String folderId = folderService.resolve(
                actor, workspace, projectId, args.optionalString("folder").orElse(null), true);
        Set<String> labelIds = args.strings("labels")
                .map(names -> labelIds(actor, workspace, names))
                .orElse(Set.of());
        var published = pageService.create(
                actor,
                workspace,
                new PageRequests.Create(
                        projectId,
                        folderId,
                        args.string("title"),
                        List.copyOf(labelIds),
                        args.string("upload_id"),
                        args.optionalString("entry").orElse(null),
                        args.optionalString("note").orElse(null),
                        args.optionalString("base_commit").orElse(null)));
        var view = published(published);
        view.put("title", args.string("title").strip());
        return view;
    }

    private Object updatePage(CurrentUser actor, McpArguments args) {
        String workspace = workspace(actor, args);
        return published(pageService.publish(
                actor,
                workspace,
                args.string("id"),
                new PageRequests.Publish(
                        args.string("upload_id"),
                        args.optionalString("entry").orElse(null),
                        args.optionalString("note").orElse(null),
                        args.optionalString("base_commit").orElse(null))));
    }

    private static Map<String, Object> published(PageViews.Published published) {
        var view = new LinkedHashMap<String, Object>();
        view.put("id", published.documentId());
        view.put("version", published.version());
        view.put("entry", published.entry());
        view.put("files", published.files());
        view.put("warnings", published.warnings());
        return view;
    }

    /** A page's latest version as an agent reads it: where to view it, its versions and its files. */
    private Map<String, Object> page(CurrentUser actor, String workspace, DocumentViews.Detail document) {
        var latest = pageService.version(actor, workspace, document.id(), null);
        var page = new LinkedHashMap<String, Object>();
        page.put("version", latest.version().number());
        page.put("entry", latest.version().entry());
        page.put("viewPath", latest.viewUrl());
        page.put(
                "versions",
                document.page().versions().stream()
                        .map(version -> {
                            var entry = new LinkedHashMap<String, Object>();
                            entry.put("number", version.number());
                            entry.put("note", version.note());
                            entry.put("baseCommit", version.baseCommit());
                            entry.put("createdAt", version.createdAt());
                            entry.put("agent", version.createdByAgent());
                            return entry;
                        })
                        .toList());
        page.put("files", latest.files());
        return page;
    }

    private Object link(CurrentUser actor, McpArguments args) {
        String workspace = workspace(actor, args);
        String id = args.string("id");
        var item = workItemFacade.findByRef(actor, workspace, args.string("work_item"));
        if (args.bool("remove").orElse(false)) {
            var link = documentQuery.links(workspace, id).stream()
                    .filter(each -> each.workItemId().equals(item.id()))
                    .findFirst()
                    .orElseThrow(DocumentErrorCode.DOCUMENT_LINK_NOT_FOUND::raise);
            documentService.unlink(actor, workspace, id, link.linkId());
            return Map.of("id", id, "workItem", item.reference(), "linked", false);
        }
        documentService.link(actor, workspace, id, item.id());
        return Map.of("id", id, "workItem", item.reference(), "linked", true);
    }

    private String workspace(CurrentUser actor, McpArguments args) {
        return workspaceFacade.resolve(actor, args.optionalString("workspace").orElse(null));
    }

    /** A project key's id; none (or nothing) is the workspace's own part. */
    private Optional<String> project(CurrentUser actor, String workspace, Optional<String> key) {
        return key.filter(value -> !value.equalsIgnoreCase("none"))
                .map(value -> projectFacade.findByKey(actor, workspace, value).id());
    }

    private String projectKey(CurrentUser actor, String workspace, String projectId) {
        return projectId == null
                ? null
                : projectFacade
                        .requireAccess(actor, workspace, projectId, false)
                        .key();
    }

    private List<Map<String, Object>> summaries(
            CurrentUser actor, String workspace, List<DocumentViews.Summary> documents) {
        var labels = labelNames(actor, workspace);
        var keys = new HashMap<String, String>();
        var paths = new HashMap<String, Map<String, DocumentViews.Folder>>();
        return documents.stream()
                .map(document -> {
                    var view = new LinkedHashMap<String, Object>();
                    view.put("id", document.id());
                    view.put("title", document.title());
                    view.put("kind", document.kind());
                    if (document.pageVersion() != null) view.put("pageVersion", document.pageVersion());
                    view.put(
                            "project",
                            document.projectId() == null
                                    ? null
                                    : keys.computeIfAbsent(
                                            document.projectId(), id -> projectKey(actor, workspace, id)));
                    var part = paths.computeIfAbsent(
                            Objects.toString(document.projectId(), ""),
                            ignored -> documentQuery.folders(workspace, document.projectId()).stream()
                                    .collect(Collectors.toMap(DocumentViews.Folder::id, folder -> folder)));
                    view.put("folder", path(Parts.path(List.copyOf(part.values()), document.folderId())));
                    view.put(
                            "labels",
                            document.labelIds().stream().map(labels::get).toList());
                    view.put("updatedAt", document.updatedAt());
                    return (Map<String, Object>) view;
                })
                .toList();
    }

    private static String path(List<DocumentViews.Folder> folders) {
        return folders.stream().map(DocumentViews.Folder::name).collect(Collectors.joining("/"));
    }

    private Map<String, String> labelNames(CurrentUser actor, String workspace) {
        return labelFacade.findAll(actor, workspace).stream()
                .collect(Collectors.toMap(LabelFacade.LabelRef::id, LabelFacade.LabelRef::name));
    }

    /** The ids of labels named; a name the workspace has no label for is an error, as a work item's are. */
    private Set<String> labelIds(CurrentUser actor, String workspace, List<String> names) {
        Map<String, String> byName = labelFacade.findAll(actor, workspace).stream()
                .collect(Collectors.toMap(
                        label -> label.name().toLowerCase(Locale.ROOT), LabelFacade.LabelRef::id, (a, b) -> a));
        var ids = new LinkedHashSet<String>();
        for (String name : names) {
            String id = byName.get(name.strip().toLowerCase(Locale.ROOT));
            if (id == null) throw new IllegalArgumentException("라벨이 없습니다: " + name);
            ids.add(id);
        }
        return ids;
    }
}
