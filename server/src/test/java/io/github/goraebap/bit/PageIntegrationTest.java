package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.workspace.application.WorkspaceService;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.InstantTextBinding;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Pages (D-113): an agent uploads a bundle, makes a page and its versions, and anyone allowed views them sandboxed. */
@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false",
            "app.auth.secret=page-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false",
            "app.auth.allowed-origins=http://localhost:8080",
            "app.auth.attempts-per-minute=1000",
            "app.storage.max-file-mb=1"
        })
class PageIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String INDEX = "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\">"
            + "<link rel=\"stylesheet\" href=\"css/app.css\">"
            + "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css\">"
            + "</head><body><section data-bit-id=\"intro\"><h1>문서함 시안</h1><p>카드를 고르는 화면</p></section>"
            + "<img data-bit-id=\"logo\" src=\"img/로고.png\"><script type=\"module\" src=\"app.js\"></script></body></html>";
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0, 0, 13};

    @LocalServerPort
    private int port;

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private CurrentUser owner;
    private String workspace;
    private HttpClient session;
    private String key;
    private int rpc;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/page-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() throws Exception {
        for (String table : List.of(
                "attachment",
                "page_version_file",
                "page_version",
                "blob",
                "pending_upload",
                "document_order",
                "notification",
                "comment",
                "activity",
                "link",
                "document_label",
                "document",
                "folder",
                "work_item_type_parent",
                "work_item_type",
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
        workspace = workspaceService.create(owner, "Pages", "pages-" + Ids.newId());
        projectService.create(owner, workspace, "Project", "PG", null);
        session = login(owner);
        var created = http(
                session,
                "POST",
                "/api/v1/me/api-keys",
                JSON.writeValueAsString(Map.of(
                        "name",
                        "Agent",
                        "agentName",
                        "page-agent",
                        "currentPassword",
                        "owner password phrase for pages")));
        expect(created, 201);
        key = JSON.readTree(created.body()).path("key").asString();
    }

    @Test
    void anAgentMakesAPageAndItsNextVersionOverMcp() throws Exception {
        String first = upload(zip(Map.of(
                "out/index.html", INDEX,
                "out/css/app.css", "body{margin:0}",
                "out/app.js", "console.log('v1')",
                "out/empty.json", "",
                "out/img/로고.png", PNG,
                "__MACOSX/out/._index.html", "junk")));
        var made = tool(
                "create_page",
                Map.of("project", "PG", "folder", "설계/화면", "title", "문서함 시안", "upload_id", first, "note", "첫 안"));
        String id = made.path("id").asString();
        assertThat(made.path("version").asInt()).isEqualTo(1);
        assertThat(made.path("entry").asString()).isEqualTo("index.html");
        assertThat(made.path("files").asInt()).isEqualTo(5);
        assertThat(made.path("warnings").toString())
                .contains("out/")
                .contains("cdn.jsdelivr.net")
                .contains("Pretendard");
        assertThat(jdbcTemplate.queryForMap(
                        "SELECT kind, body, created_by_agent FROM document WHERE document_id=?", id))
                .containsEntry("kind", "page")
                .containsEntry("body", "문서함 시안 카드를 고르는 화면")
                .containsEntry("created_by_agent", "page-agent");
        assertThat(jdbcTemplate.queryForList(
                        "SELECT type FROM activity WHERE target_id=? ORDER BY occurred_at", String.class, id))
                .containsExactly("created");
        assertThat(jdbcTemplate.queryForList(
                        "SELECT path FROM page_version_file f JOIN page_version v USING(page_version_id) WHERE v.document_id=? AND f.blob_id IS NULL",
                        String.class,
                        id))
                .containsExactly("empty.json");

        var again = tool("create_page", Map.of("project", "PG", "title", "문서함 시안", "upload_id", first));
        assertThat(again.path("id").asString()).isEqualTo(id);
        assertThat(count("SELECT count(*) FROM document")).isEqualTo(1);

        var found = tool("list_documents", Map.of("query", "고르는"));
        assertThat(found.path("items").get(0).path("id").asString()).isEqualTo(id);
        assertThat(found.path("items").get(0).path("kind").asString()).isEqualTo("page");
        assertThat(found.path("items").get(0).path("pageVersion").asInt()).isEqualTo(1);

        String second = upload(zip(Map.of(
                "index.html", INDEX.replace("카드를 고르는", "카드 간격을 줄인"),
                "css/app.css", "body{margin:0}",
                "app.js", "console.log('v2')",
                "empty.json", "",
                "img/로고.png", PNG)));
        var next = tool(
                "update_page", Map.of("id", id, "upload_id", second, "note", "카드 간격 줄임", "base_commit", "625c75f"));
        assertThat(next.path("version").asInt()).isEqualTo(2);
        assertThat(tool("update_page", Map.of("id", id, "upload_id", second))
                        .path("version")
                        .asInt())
                .as("the same upload again is the version it made")
                .isEqualTo(2);
        assertThat(count("SELECT count(*) FROM page_version")).isEqualTo(2);
        assertThat(jdbcTemplate.queryForList(
                        "SELECT DISTINCT a.blob_id FROM page_version_file a JOIN page_version_file b ON a.path=b.path AND a.page_version_id<>b.page_version_id WHERE a.path IN ('css/app.css','img/로고.png')",
                        String.class))
                .as("a file unchanged between versions keeps its blob")
                .hasSize(2);
        assertThat(count("SELECT count(*) FROM blob"))
                .as("only the changed files were kept again")
                .isEqualTo(6);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT json_extract(payload,'$.before') || '>' || json_extract(payload,'$.after') FROM activity WHERE target_id=? AND json_extract(payload,'$.field')='page'",
                        String.class,
                        id))
                .isEqualTo("1>2");

        var read = tool("get_document", Map.of("id", id));
        assertThat(read.path("kind").asString()).isEqualTo("page");
        assertThat(read.has("body")).isFalse();
        assertThat(read.path("text").asString()).isEqualTo("문서함 시안 카드 간격을 줄인 화면");
        assertThat(read.path("page").path("version").asInt()).isEqualTo(2);
        assertThat(read.path("page").path("viewPath").asString())
                .startsWith("/pages/")
                .endsWith("/index.html");
        assertThat(read.path("page").path("versions").get(0).path("note").asString())
                .isEqualTo("카드 간격 줄임");
        assertThat(read.path("page").path("versions").get(0).path("baseCommit").asString())
                .isEqualTo("625c75f");
        assertThat(read.path("page").path("files").toString())
                .contains("img/로고.png")
                .contains("text/html;charset=utf-8");

        var other = tool(
                "create_page", Map.of("title", "다른 페이지", "upload_id", upload(zip(Map.of("index.html", "<p>x</p>")))));
        assertThat(toolError("update_page", Map.of("id", other.path("id").asString(), "upload_id", second)))
                .contains("다른 페이지");
    }

    @Test
    void aBundleThatCannotBeAPageIsRefusedWithItsReasonAndLeavesNothing() throws Exception {
        var many = new LinkedHashMap<String, Object>();
        many.put("index.html", "<p>x</p>");
        for (int i = 0; i < 500; i++) many.put("f/" + i + ".css", "a{}");
        byte[] zeros = new byte[6 * 1024 * 1024];
        var refusals = new LinkedHashMap<byte[], String>();
        refusals.put(zip(Map.of("index.html", "<p>x</p>", "../x.css", "a{}")), "'..' 경로");
        refusals.put(zip(many), "500개까지");
        refusals.put(
                zip(Map.of("index.html", "<div data-bit-id=\"card\"></div><div data-bit-id=\"card\"></div>")),
                "data-bit-id \"card\"");
        refusals.put(zip(Map.of("index.html", "<p>x</p>", "run.exe", "MZ")), "올릴 수 없는 형식");
        refusals.put(zip(Map.of("index.html", "<p>x</p>", "a.css", new byte[] {(byte) 0xC3, 0x28})), "UTF-8이 아닙니다");
        refusals.put(zip(Map.of("index.html", "<p>x</p>", "A.css", "a{}", "a.css", "b{}")), "대소문자");
        refusals.put(zip(Map.of("index.html", "<p>x</p>", "big.png", zeros)), "5MB");
        refusals.put(zip(Map.of("a.html", "<p>a</p>", "b.html", "<p>b</p>")), "entry");
        for (var refusal : refusals.entrySet())
            assertThat(toolError("create_page", Map.of("title", "안 됨", "upload_id", upload(refusal.getKey()))))
                    .contains(refusal.getValue());
        assertThat(count("SELECT count(*) FROM page_version")).isZero();
        assertThat(count("SELECT count(*) FROM document")).isZero();
        assertThat(count("SELECT count(*) FROM blob"))
                .as("no bundle file was kept")
                .isZero();

        var notZip = ticket("fake.zip", 9, "page");
        put(notZip, "<p>x</p>!".getBytes(StandardCharsets.UTF_8), "application/zip");
        assertThat(toolError(
                        "create_page",
                        Map.of("title", "안 됨", "upload_id", notZip.path("id").asString())))
                .contains("zip이 아닙니다");
        var attachment = ticket("page.zip", 22, "attachment");
        put(attachment, zip(Map.of()), "application/zip");
        assertThat(toolError(
                        "create_page",
                        Map.of(
                                "title",
                                "안 됨",
                                "upload_id",
                                attachment.path("id").asString())))
                .contains("FILE_UPLOAD_PURPOSE");
    }

    @Test
    void aPagesBodyChangesOnlyThroughANewVersion() throws Exception {
        String id = tool("create_page", Map.of("title", "시안", "upload_id", upload(zip(Map.of("index.html", INDEX)))))
                .path("id")
                .asString();
        var patched = http(
                session,
                "PATCH",
                "/api/v1/workspaces/" + workspace + "/documents/" + id,
                JSON.writeValueAsString(Map.of("expectedVersion", 0, "body", "# 덮어쓰기")));
        expect(patched, 400);
        assertThat(patched.body()).contains("update_page");
        expect(
                http(
                        session,
                        "PATCH",
                        "/api/v1/workspaces/" + workspace + "/documents/" + id,
                        JSON.writeValueAsString(Map.of("expectedVersion", 0, "title", "시안 (확정)"))),
                204);
        assertThat(toolError("update_document", Map.of("id", id, "body", "덮어쓰기")))
                .contains("update_page");
        var upload = ticket("note.txt", 2, "attachment");
        put(upload, "hi".getBytes(StandardCharsets.UTF_8), "text/plain");
        assertThat(toolError(
                        "attach_files",
                        Map.of(
                                "type",
                                "document",
                                "id",
                                id,
                                "uploadIds",
                                List.of(upload.path("id").asString()))))
                .contains("update_page");
        assertThat(count("SELECT count(*) FROM attachment")).isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT body FROM document WHERE document_id=?", String.class, id))
                .isEqualTo("문서함 시안 카드를 고르는 화면");

        var markdown = http(
                session,
                "POST",
                "/api/v1/workspaces/" + workspace + "/documents",
                JSON.writeValueAsString(Map.of("title", "메모", "body", "본문")));
        expect(markdown, 201);
        String markdownId =
                markdown.headers().firstValue("Location").orElseThrow().replaceAll(".*/", "");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT kind FROM document WHERE document_id=?", String.class, markdownId))
                .isEqualTo("markdown");
        assertThat(toolError(
                        "update_page",
                        Map.of("id", markdownId, "upload_id", upload(zip(Map.of("index.html", "<p>x</p>"))))))
                .contains("DOCUMENT_NOT_PAGE");
    }

    @Test
    void anApiKeyMakesReadsAndDownloadsAPageOverRest() throws Exception {
        var bytes = Map.<String, Object>of(
                "index.html", INDEX, "css/app.css", "body{margin:0}", "img/로고.png", PNG, "empty.json", "");
        var created = bearer(
                "POST",
                "/api/v1/workspaces/" + workspace + "/documents/pages",
                JSON.writeValueAsString(Map.of("title", "REST 시안", "uploadId", upload(zip(bytes)))));
        expect(created, 201);
        var published = JSON.readTree(created.body());
        String id = published.path("documentId").asString();
        assertThat(created.headers().firstValue("Location"))
                .hasValue("/api/v1/workspaces/" + workspace + "/documents/" + id);

        var next = bearer(
                "POST",
                "/api/v1/workspaces/" + workspace + "/documents/" + id + "/versions",
                JSON.writeValueAsString(Map.of("uploadId", upload(zip(bytes)), "note", "같은 내용")));
        expect(next, 201);
        assertThat(next.headers().firstValue("Location"))
                .hasValue("/api/v1/workspaces/" + workspace + "/documents/" + id + "/versions/2");

        var detail = JSON.readTree(bearer("GET", "/api/v1/workspaces/" + workspace + "/documents/" + id, null)
                .body());
        assertThat(detail.path("kind").asString()).isEqualTo("page");
        assertThat(detail.path("page").path("latest").asInt()).isEqualTo(2);
        assertThat(detail.path("page").path("versions").size()).isEqualTo(2);
        var version = bearer("GET", "/api/v1/workspaces/" + workspace + "/documents/" + id + "/versions/1", null);
        expect(version, 200);
        assertThat(JSON.readTree(version.body()).path("files").size()).isEqualTo(4);
        assertThat(JSON.readTree(version.body()).path("viewUrl").asString()).startsWith("/pages/");
        expect(bearer("GET", "/api/v1/workspaces/" + workspace + "/documents/" + id + "/versions/3", null), 404);

        var bundle = HttpClient.newHttpClient()
                .send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/workspaces/" + workspace
                                        + "/documents/" + id + "/bundle?version=1"))
                                .header("Authorization", "Bearer " + key)
                                .build(),
                        HttpResponse.BodyHandlers.ofByteArray());
        assertThat(bundle.statusCode()).isEqualTo(200);
        assertThat(bundle.headers().firstValue("Content-Type")).hasValue("application/zip");
        var unpacked = unzip(bundle.body());
        assertThat(unpacked.keySet())
                .containsExactlyInAnyOrder("index.html", "css/app.css", "img/로고.png", "empty.json");
        assertThat(unpacked.get("img/로고.png")).isEqualTo(PNG);
        assertThat(new String(unpacked.get("index.html"), StandardCharsets.UTF_8))
                .isEqualTo(INDEX);
        assertThat(unpacked.get("empty.json")).isEmpty();
    }

    private String upload(byte[] zip) throws Exception {
        var ticket = ticket("page.zip", zip.length, "page");
        put(ticket, zip, "application/zip");
        return ticket.path("id").asString();
    }

    private JsonNode ticket(String filename, long size, String purpose) throws Exception {
        var response = bearer(
                "POST",
                "/api/v1/files/uploads",
                JSON.writeValueAsString(Map.of("filename", filename, "size", size, "purpose", purpose)));
        expect(response, 201);
        return JSON.readTree(response.body());
    }

    private void put(JsonNode ticket, byte[] bytes, String type) throws Exception {
        var response = HttpClient.newHttpClient()
                .send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port
                                        + ticket.path("url").asString()))
                                .header("Content-Type", type)
                                .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes))
                                .build(),
                        HttpResponse.BodyHandlers.ofString());
        expect(response, 200);
    }

    private static byte[] zip(Map<String, ?> files) throws IOException {
        var out = new ByteArrayOutputStream();
        try (var zip = new ZipOutputStream(out, StandardCharsets.UTF_8)) {
            for (var file : files.entrySet()) {
                zip.putNextEntry(new ZipEntry(file.getKey()));
                zip.write(
                        file.getValue() instanceof byte[] bytes
                                ? bytes
                                : file.getValue().toString().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return out.toByteArray();
    }

    private static Map<String, byte[]> unzip(byte[] zip) throws IOException {
        var files = new LinkedHashMap<String, byte[]>();
        try (var in = new ZipInputStream(new ByteArrayInputStream(zip), StandardCharsets.UTF_8)) {
            for (ZipEntry entry; (entry = in.getNextEntry()) != null; ) files.put(entry.getName(), in.readAllBytes());
        }
        return files;
    }

    private JsonNode tool(String name, Map<String, Object> arguments) throws Exception {
        var result = JSON.readTree(mcp(name, arguments).body()).path("result");
        assertThat(result.path("isError").asBoolean()).as(result.toString()).isFalse();
        return JSON.readTree(result.path("content").get(0).path("text").asString());
    }

    private String toolError(String name, Map<String, Object> arguments) throws Exception {
        var result = JSON.readTree(mcp(name, arguments).body()).path("result");
        assertThat(result.path("isError").asBoolean()).as(result.toString()).isTrue();
        return result.path("content").get(0).path("text").asString();
    }

    private HttpResponse<String> mcp(String name, Map<String, Object> arguments) throws Exception {
        var args = new LinkedHashMap<>(arguments);
        args.put("workspace", workspace);
        String body = JSON.writeValueAsString(Map.of(
                "jsonrpc",
                "2.0",
                "id",
                ++rpc,
                "method",
                "tools/call",
                "params",
                Map.of("name", name, "arguments", args)));
        var response = HttpClient.newHttpClient()
                .send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/mcp"))
                                .header("Authorization", "Bearer " + key)
                                .header("Content-Type", "application/json")
                                .header("Accept", "application/json, text/event-stream")
                                .POST(HttpRequest.BodyPublishers.ofString(body))
                                .build(),
                        HttpResponse.BodyHandlers.ofString());
        expect(response, 200);
        return response;
    }

    private HttpResponse<String> bearer(String method, String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Authorization", "Bearer " + key)
                .header("Accept", "application/json");
        if (body != null) request.header("Content-Type", "application/json");
        return HttpClient.newHttpClient()
                .send(
                        request.method(
                                        method,
                                        body == null
                                                ? HttpRequest.BodyPublishers.noBody()
                                                : HttpRequest.BodyPublishers.ofString(body))
                                .build(),
                        HttpResponse.BodyHandlers.ofString());
    }

    private int count(String sql) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }

    private CurrentUser identity(String role) {
        String user = Ids.newId();
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
                passwordEncoder.encode(role + " password phrase for pages"),
                now);
        String credential = Ids.newId();
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

    private HttpClient login(CurrentUser actor) throws Exception {
        var row = jdbcTemplate.queryForMap("SELECT email, name FROM iam_user WHERE iam_user_id=?", actor.userId());
        var client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build();
        expect(
                http(
                        client,
                        "POST",
                        "/api/v1/auth/sessions",
                        JSON.writeValueAsString(Map.of(
                                "email",
                                row.get("email"),
                                "password",
                                row.get("name") + " password phrase for pages"))),
                201);
        return client;
    }

    private static void expect(HttpResponse<?> response, int status) {
        assertThat(response.statusCode()).as(String.valueOf(response.body())).isEqualTo(status);
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
                            JSON.readTree(csrf.body()).path("token").asString());
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
