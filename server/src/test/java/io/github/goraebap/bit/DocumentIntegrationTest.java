package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import io.github.goraebap.bit.module.document.application.DocumentQuery;
import io.github.goraebap.bit.module.document.application.DocumentRequests;
import io.github.goraebap.bit.module.document.application.DocumentService;
import io.github.goraebap.bit.module.document.application.DocumentViews;
import io.github.goraebap.bit.module.document.application.FolderService;
import io.github.goraebap.bit.module.label.application.LabelService;
import io.github.goraebap.bit.module.link.CommentFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.workitem.application.WorkItemService;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.module.workspace.application.WorkspaceService;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.persistence.InstantTextBinding;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;

@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false", "app.auth.secret=document-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false", "app.auth.allowed-origins=http://localhost:8080"
        })
class DocumentIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @LocalServerPort
    private int port;

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private LabelService labelService;

    @Autowired
    private WorkItemService workItemService;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private FolderService folderService;

    @Autowired
    private CommentFacade commentFacade;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private CurrentUser owner;
    private String workspace;
    private String project;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/document-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        for (String table : List.of(
                "comment",
                "activity",
                "link",
                "document_label",
                "document",
                "folder",
                "work_item_label",
                "work_item",
                "board_column",
                "project_member",
                "project_key",
                "project",
                "work_item_view_tweak",
                "work_item_view",
                "label",
                "workspace_invitation",
                "workspace_member",
                "workspace",
                "iam_api_key",
                "iam_session",
                "iam_password",
                "iam_user")) jdbcTemplate.update("DELETE FROM " + table);
        owner = identity("owner");
        workspace = workspaceService.create(owner, "Docs", "docs-" + Ids.newId());
        project = projectService.create(owner, workspace, "Project", "DOC", null);
    }

    @Test
    void foldersAndDocumentsStayInTheirPart() {
        String common = folderService.create(owner, workspace, null, null, "회사 공통");
        String design = folderService.create(owner, workspace, project, null, "설계");
        String screens = folderService.create(owner, workspace, project, design, "화면");
        // A project's part and the workspace's own part are apart: the same name is fine in each.
        folderService.create(owner, workspace, null, null, "설계");
        assertThat(code(() -> folderService.create(owner, workspace, project, null, " 설계 ")))
                .isEqualTo("FOLDER_NAME_CONFLICT");
        assertThat(code(() -> folderService.create(owner, workspace, project, common, "x")))
                .isEqualTo("FOLDER_NOT_FOUND");
        String label = labelService.create(owner, workspace, "설계", "#112233");
        String spec =
                documentService.create(owner, workspace, project, screens, " 로그인 화면 ", "# 로그인\n\n본문", Set.of(label));
        assertThat(code(() -> documentService.create(owner, workspace, null, screens, "Other part", null, Set.of())))
                .isEqualTo("FOLDER_NOT_FOUND");

        var top = documentService.contents(owner, workspace, project, null);
        assertThat(top.path()).isEmpty();
        assertThat(top.folders()).extracting(DocumentViews.Folder::name).containsExactly("설계");
        var inside = documentService.contents(owner, workspace, project, screens);
        assertThat(inside.path()).extracting(DocumentViews.Folder::name).containsExactly("설계", "화면");
        assertThat(inside.documents()).singleElement().satisfies(document -> {
            assertThat(document.title()).isEqualTo("로그인 화면");
            assertThat(document.excerpt()).startsWith("# 로그인");
            assertThat(document.labelIds()).containsExactly(label);
        });
        var detail = documentService.get(owner, workspace, spec);
        assertThat(detail.path()).extracting(DocumentViews.Folder::name).containsExactly("설계", "화면");
        assertThat(detail.body()).isEqualTo("# 로그인\n\n본문");

        assertThat(code(() -> folderService.move(owner, workspace, design, 0, screens)))
                .isEqualTo("FOLDER_MOVE_INVALID");
        assertThat(code(() -> folderService.delete(owner, workspace, screens, 0)))
                .isEqualTo("FOLDER_NOT_EMPTY");
        folderService.rename(owner, workspace, screens, 0, "UI");
        assertThat(code(() -> folderService.rename(owner, workspace, screens, 0, "UX")))
                .isEqualTo("FOLDER_VERSION_CONFLICT");

        // An agent names folders by path; missing ones are made once and found after.
        String made = folderService.resolve(owner, workspace, project, "설계/API/v1", true);
        assertThat(folderService.resolve(owner, workspace, project, "설계/api/V1", false))
                .isEqualTo(made);
        assertThat(code(() -> folderService.resolve(owner, workspace, project, "설계/없음", false)))
                .isEqualTo("FOLDER_NOT_FOUND");
    }

    @Test
    void documentsChangeMoveAndKeepTheirActivity() {
        String folder = folderService.create(owner, workspace, project, null, "기획");
        String label = labelService.create(owner, workspace, "회의록", "#112233");
        String id = documentService.create(owner, workspace, project, folder, "주간 회의", "", Set.of());
        assertThat(code(() -> documentService.revise(owner, workspace, id, update(1, "x", null, null))))
                .isEqualTo("DOCUMENT_VERSION_CONFLICT");
        assertThat(code(() ->
                        documentService.revise(owner, workspace, id, update(0, null, null, List.of(Ids.newId())))))
                .isEqualTo("DOCUMENT_LABEL_INVALID");
        documentService.revise(owner, workspace, id, update(0, "주간 회의 10-26", "- 정한 것", List.of(label)));
        // Saving the same text again changes nothing and leaves the version.
        documentService.revise(owner, workspace, id, update(1, null, "- 정한 것", null));
        assertThat(documentService.get(owner, workspace, id).version()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForList(
                        "SELECT payload FROM activity WHERE target_type='document' AND target_id=? AND type='changed'",
                        String.class,
                        id))
                .hasSize(3)
                .anySatisfy(payload -> assertThat(payload).contains("\"field\":\"body\""));

        documentService.move(owner, workspace, id, 1, null, null);
        var moved = documentService.get(owner, workspace, id);
        assertThat(moved.projectId()).isNull();
        assertThat(moved.folderId()).isNull();
        assertThat(documentService
                        .search(owner, workspace, search(null, true, null, null, null), null, 10)
                        .items())
                .extracting(DocumentViews.Summary::id)
                .containsExactly(id);
        documentService.move(owner, workspace, id, 2, project, folder);
        documentService.delete(owner, workspace, id, 3);
        assertThat(code(() -> documentService.get(owner, workspace, id))).isEqualTo("DOCUMENT_NOT_FOUND");
        folderService.delete(owner, workspace, folder, 0);
        documentService.restore(owner, workspace, id, 4);
        // Its folder went while it was deleted, so it comes back at the top of its part.
        assertThat(documentService.get(owner, workspace, id).folderId()).isNull();
        assertThat(jdbcTemplate.queryForList(
                        "SELECT type FROM activity WHERE target_type='document' AND target_id=? ORDER BY occurred_at,activity_id",
                        String.class,
                        id))
                .startsWith("created")
                .contains("deleted", "restored");
    }

    @Test
    void searchNarrowsAndPagesFromTheLatestChange() {
        String label = labelService.create(owner, workspace, "결정", "#112233");
        String first = documentService.create(owner, workspace, project, null, "Alpha spec", "", Set.of(label));
        String second = documentService.create(owner, workspace, null, null, "Beta guide", "", Set.of());
        String third = documentService.create(owner, workspace, project, null, "Alpha notes", "", Set.of());
        var page = documentService.search(owner, workspace, search(null, false, null, null, null), null, 2);
        assertThat(page.items()).extracting(DocumentViews.Summary::id).containsExactly(third, second);
        assertThat(page.nextCursor()).isNotNull();
        assertThat(documentService
                        .search(owner, workspace, search(null, false, null, null, null), page.nextCursor(), 2)
                        .items())
                .extracting(DocumentViews.Summary::id)
                .containsExactly(first);
        assertThat(documentService
                        .search(owner, workspace, search(project, false, null, "alpha", null), null, 10)
                        .items())
                .extracting(DocumentViews.Summary::id)
                .containsExactly(third, first);
        assertThat(documentService
                        .search(owner, workspace, search(null, false, label, null, null), null, 10)
                        .items())
                .extracting(DocumentViews.Summary::id)
                .containsExactly(first);
        assertThat(code(() ->
                        documentService.search(owner, workspace, search(null, false, null, null, null), "bad", 2)))
                .isEqualTo("COMMON_INVALID_REQUEST");
    }

    @Test
    void documentsLinkToWorkItemsAndTakeComments() {
        String item = workItemService.create(
                owner, workspace, project, new WorkItem.Details("Login", null, null, null, null, null, null), null);
        String id = documentService.create(owner, workspace, null, null, "Login spec", "", Set.of());
        String link = documentService.link(owner, workspace, id, item);
        assertThat(documentService.link(owner, workspace, id, item)).isEqualTo(link);
        assertThat(jdbcTemplate.queryForMap("SELECT from_type,from_id,to_type,to_id,relation FROM link"))
                .containsEntry("from_type", "document")
                .containsEntry("from_id", id)
                .containsEntry("to_type", "work_item")
                .containsEntry("to_id", item)
                .containsEntry("relation", "relates_to");
        assertThat(documentService.get(owner, workspace, id).workItems())
                .singleElement()
                .satisfies(linked -> {
                    assertThat(linked.reference()).isEqualTo("DOC-1");
                    assertThat(linked.title()).isEqualTo("Login");
                });
        assertThat(documentService
                        .search(owner, workspace, search(null, false, null, null, item), null, 10)
                        .items())
                .extracting(DocumentViews.Summary::id)
                .containsExactly(id);
        String comment = commentFacade.create(owner, workspace, TargetType.document, id, "Looks right");
        assertThat(comment).isNotBlank();
        assertThat(code(() -> documentService.unlink(owner, workspace, id, Ids.newId())))
                .isEqualTo("DOCUMENT_LINK_NOT_FOUND");
        documentService.unlink(owner, workspace, id, link);
        assertThat(documentService.get(owner, workspace, id).workItems()).isEmpty();

        CurrentUser viewer = identity("viewer");
        membership(viewer, "viewer");
        assertThat(documentService.get(viewer, workspace, id).title()).isEqualTo("Login spec");
        assertThatThrownBy(() -> documentService.create(viewer, workspace, null, null, "No", "", Set.of()))
                .isInstanceOf(BusinessException.class);
        CurrentUser stranger = identity("stranger");
        assertThatThrownBy(() -> documentService.get(stranger, workspace, id)).isInstanceOf(BusinessException.class);
    }

    @Test
    void theHttpApiWritesAndReadsDocuments() throws Exception {
        var client = login(owner);
        var created = http(
                client,
                "POST",
                "/api/v1/workspaces/" + workspace + "/folders",
                JSON.writeValueAsString(Map.of("projectId", project, "name", "설계")));
        expect(created, 201);
        String folder = created.headers().firstValue("Location").orElseThrow().replaceAll(".*/", "");
        var document = http(
                client,
                "POST",
                "/api/v1/workspaces/" + workspace + "/documents",
                JSON.writeValueAsString(
                        Map.of("projectId", project, "folderId", folder, "title", "구조", "body", "## 모듈")));
        expect(document, 201);
        String id = document.headers().firstValue("Location").orElseThrow().replaceAll(".*/", "");
        var contents = http(
                client,
                "GET",
                "/api/v1/workspaces/" + workspace + "/documents/contents?projectId=" + project + "&folderId=" + folder,
                null);
        expect(contents, 200);
        assertThat(JSON.readTree(contents.body())
                        .path("documents")
                        .get(0)
                        .path("id")
                        .asString())
                .isEqualTo(id);
        var revised = http(
                client,
                "PATCH",
                "/api/v1/workspaces/" + workspace + "/documents/" + id,
                JSON.writeValueAsString(Map.of("expectedVersion", 0, "body", "## 모듈\n\n- document")));
        expect(revised, 204);
        var read = http(client, "GET", "/api/v1/workspaces/" + workspace + "/documents/" + id, null);
        expect(read, 200);
        assertThat(JSON.readTree(read.body()).path("body").asString()).isEqualTo("## 모듈\n\n- document");
        expect(
                http(
                        client,
                        "PATCH",
                        "/api/v1/workspaces/" + workspace + "/documents/" + id,
                        JSON.writeValueAsString(Map.of("expectedVersion", 1, "unknown", 1))),
                400);
        var other = identity("other");
        var otherClient = login(other);
        expect(http(otherClient, "GET", "/api/v1/workspaces/" + workspace + "/documents/" + id, null), 404);
    }

    @Test
    void anAgentWritesFindsAndLinksDocumentsOverMcp() throws Exception {
        labelService.create(owner, workspace, "설계", "#112233");
        workItemService.create(
                owner, workspace, project, new WorkItem.Details("Login", null, null, null, null, null, null), null);
        var client = login(owner);
        var keyResponse = http(
                client,
                "POST",
                "/api/v1/me/api-keys",
                JSON.writeValueAsString(Map.of(
                        "name",
                        "Agent",
                        "agentName",
                        "doc-agent",
                        "currentPassword",
                        "owner password phrase for documents")));
        expect(keyResponse, 201);
        String key = JSON.readTree(keyResponse.body()).path("key").asString();
        var created = JSON.readTree(text(call(
                client,
                key,
                "create_document",
                Map.of(
                        "project", "DOC",
                        "folder", "설계/화면",
                        "title", "로그인 화면",
                        "body", "## 흐름",
                        "labels", List.of("설계")))));
        String id = created.path("id").asString();
        var listed =
                JSON.readTree(text(call(client, key, "list_documents", Map.of("project", "DOC", "folder", "설계/화면"))));
        assertThat(listed.path("path").asString()).isEqualTo("설계/화면");
        assertThat(listed.path("documents").get(0).path("id").asString()).isEqualTo(id);
        assertThat(listed.path("documents").get(0).path("labels").get(0).asString())
                .isEqualTo("설계");
        call(client, key, "update_document", Map.of("id", id, "body", "## 흐름\n\n1. 입력", "folder", "설계"));
        call(client, key, "link_document", Map.of("id", id, "work_item", "DOC-1"));
        var read = JSON.readTree(text(call(client, key, "get_document", Map.of("id", id))));
        assertThat(read.path("folder").asString()).isEqualTo("설계");
        assertThat(read.path("body").asString()).isEqualTo("## 흐름\n\n1. 입력");
        assertThat(read.path("workItems").get(0).path("ref").asString()).isEqualTo("DOC-1");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT created_by_agent FROM document WHERE document_id=?", String.class, id))
                .isEqualTo("doc-agent");
        var found = JSON.readTree(text(call(client, key, "list_documents", Map.of("query", "로그인"))));
        assertThat(found.path("items").get(0).path("folder").asString()).isEqualTo("설계");
        var missing = mcp(
                client,
                key,
                "tools/call",
                Map.of("name", "create_document", "arguments", Map.of("title", "x", "labels", List.of("없는 라벨"))));
        assertThat(JSON.readTree(missing.body()).path("result").path("isError").asBoolean())
                .isTrue();
    }

    private int rpc = 0;

    private HttpResponse<String> mcp(HttpClient client, String key, String method, Map<String, Object> params)
            throws Exception {
        String body =
                JSON.writeValueAsString(Map.of("jsonrpc", "2.0", "id", ++rpc, "method", method, "params", params));
        return client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/mcp"))
                        .header("Authorization", "Bearer " + key)
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json, text/event-stream")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private tools.jackson.databind.JsonNode call(
            HttpClient client, String key, String tool, Map<String, Object> arguments) throws Exception {
        var response = mcp(client, key, "tools/call", Map.of("name", tool, "arguments", arguments));
        expect(response, 200);
        var result = JSON.readTree(response.body()).path("result");
        assertThat(result.path("isError").asBoolean()).as(response.body()).isFalse();
        return result;
    }

    private static String text(tools.jackson.databind.JsonNode result) {
        return result.path("content").get(0).path("text").asString();
    }

    private static DocumentQuery.Search search(
            String project, boolean workspaceOnly, String label, String text, String workItem) {
        return new DocumentQuery.Search(project, workspaceOnly, label, text, workItem);
    }

    private static DocumentRequests.Update update(long version, String title, String body, List<String> labels) {
        var request = new DocumentRequests.Update();
        request.setExpectedVersion(version);
        if (title != null) request.setTitle(title);
        if (body != null) request.setBody(body);
        if (labels != null) request.setLabelIds(labels);
        return request;
    }

    private static String code(ThrowingCallable call) {
        return catchThrowableOfType(BusinessException.class, call).errorCode().code();
    }

    private CurrentUser identity(String role) {
        String user = Ids.newId();
        String credential = Ids.newId();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                user,
                role + user.toLowerCase(Locale.ROOT) + "@example.test",
                role,
                now,
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES (?,?,?)",
                user,
                passwordEncoder.encode(role + " password phrase for documents"),
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_session(iam_session_id,iam_user_id,token_hash,expires_at,absolute_expires_at,last_seen_at,created_at) VALUES (?,?,?,?,?,?,?)",
                credential,
                user,
                credential,
                InstantTextBinding.text(Instant.now().plusSeconds(3600)),
                InstantTextBinding.text(Instant.now().plusSeconds(7200)),
                now,
                now);
        return new CurrentUser(user, false, CurrentUser.Method.SESSION, credential, null, false);
    }

    private void membership(CurrentUser actor, String role) {
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                Ids.newId(),
                workspace,
                actor.userId(),
                role,
                InstantTextBinding.text(Instant.now()));
    }

    private HttpClient login(CurrentUser actor) throws Exception {
        String role = jdbcTemplate.queryForObject(
                "SELECT name FROM iam_user WHERE iam_user_id=?", String.class, actor.userId());
        String email = jdbcTemplate.queryForObject(
                "SELECT email FROM iam_user WHERE iam_user_id=?", String.class, actor.userId());
        var client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build();
        expect(
                http(
                        client,
                        "POST",
                        "/api/v1/auth/sessions",
                        JSON.writeValueAsString(
                                Map.of("email", email, "password", role + " password phrase for documents"))),
                201);
        return client;
    }

    private static void expect(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(status);
    }

    private HttpResponse<String> http(HttpClient client, String method, String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json");
        if (!method.equals("GET")) {
            var csrf = client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/csrf"))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            request.header("Origin", "http://localhost:8080")
                    .header(
                            "X-CSRF-Token",
                            JSON.readTree(csrf.body()).path("token").asText());
        }
        if (body != null) request.header("Content-Type", "application/json");
        return client.send(
                request.method(
                                method,
                                body == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }
}
