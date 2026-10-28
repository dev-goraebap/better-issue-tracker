package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.github.goraebap.bit.module.coderef.application.CodeRefRequests;
import io.github.goraebap.bit.module.coderef.application.InboundService;
import io.github.goraebap.bit.module.coderef.application.IntegrationService;
import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.workitem.application.WorkItemRequests;
import io.github.goraebap.bit.module.workitem.application.WorkItemService;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.persistence.InstantTextBinding;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executor;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A project connected to a stand-in GitHub (D-087): what BIT writes reaches it, and its signed webhooks link branches,
 * commits and pull requests, move issues by the default rules and mirror its issues and comments, without echoing.
 */
@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false", "app.auth.secret=repository-integration-secret-at-least-32-chars",
            "app.git.encryption-key=repository-integration-encryption-key", "app.auth.cookie-secure=false",
            "app.auth.allowed-origins=http://localhost:8080", "spring.main.allow-bean-definition-overriding=true"
        })
class RepositoryIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    /** What leaves for repositories runs in the test's own thread, so each step can be checked right after it. */
    @TestConfiguration
    static class Synchronous {
        @Bean(name = "repositorySyncExecutor")
        Executor repositorySyncExecutor() {
            return Runnable::run;
        }
    }

    @LocalServerPort
    private int port;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private WorkItemService workItemService;

    @Autowired
    private IntegrationService integrationService;

    @Autowired
    private InboundService inboundService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final List<Request> received = new CopyOnWriteArrayList<>();
    private final Map<String, String> openIssues = new ConcurrentHashMap<>();
    private HttpServer github;
    private String workspace;
    private String project;
    private CurrentUser owner;
    private Map<String, String> columns;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/repository-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() throws IOException {
        github = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        github.createContext("/", this::answer);
        github.start();
        for (String table : List.of(
                "notification",
                "code_link",
                "integration_rule",
                "repository_integration",
                "comment",
                "activity",
                "work_item_person",
                "work_item_label",
                "work_item",
                "work_item_type_parent",
                "work_item_type",
                "board_column",
                "project_member",
                "project_key",
                "project",
                "workspace_member",
                "work_item_view_tweak",
                "work_item_view",
                "label",
                "workspace",
                "iam_session",
                "iam_password",
                "iam_user")) jdbcTemplate.update("DELETE FROM " + table);
        workspace = Ids.newId();
        owner = identity();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                workspace,
                "Repo",
                "repo-test",
                now,
                owner.userId(),
                now,
                owner.userId());
        WorkItemTypeSeeds.seed(jdbcTemplate, workspace, owner.userId());
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                Ids.newId(),
                workspace,
                owner.userId(),
                "owner",
                now);
        project = projectService.create(owner, workspace, "Project", "BIT", null);
        columns = new java.util.HashMap<>();
        projectService.columns(owner, workspace, project).forEach(c -> columns.put(c.name(), c.id()));
    }

    @AfterEach
    void stop() {
        github.stop(0);
    }

    @Test
    void aConnectedRepositoryAndBitKeepIssuesBranchesAndPullRequestsInStep() throws Exception {
        var integration = integrationService.connect(
                owner,
                workspace,
                project,
                new CodeRefRequests.Connect(Provider.github, base(), "acme/app", "ghp-not-a-real-token"));
        assertThat(integration.repository()).isEqualTo("acme/app");
        assertThat(integration.accountLogin()).isEqualTo("bit-bot");
        assertThat(integration.webhookRegistered()).isTrue();
        assertThat(jdbcTemplate.queryForObject("SELECT token_cipher FROM repository_integration", String.class))
                .startsWith("v1:")
                .doesNotContain("ghp-not-a-real-token");
        assertThat(sent("POST", "/api/v3/repos/acme/app/hooks")
                        .path("config")
                        .path("secret")
                        .asString())
                .isEqualTo(integration.webhookSecret());
        assertThatThrownBy(() -> integrationService.connect(
                        owner,
                        workspace,
                        project,
                        new CodeRefRequests.Connect(Provider.github, base(), "acme/app", "again")))
                .isInstanceOf(BusinessException.class);

        // A new BIT issue becomes the repository's issue, with its column and priority as labels and a link back.
        String login = workItemService.create(
                owner,
                workspace,
                project,
                new WorkItem.Details("Login fails", "Steps", WorkItem.Priority.high, null, null, null, null),
                columns.get("할 일"));
        var opened = sent("POST", "/api/v3/repos/acme/app/issues");
        assertThat(opened.path("title").asString()).isEqualTo("Login fails");
        assertThat(opened.path("body").asString())
                .startsWith("Steps")
                .contains("<!-- bit:work_item:")
                .contains("BIT-1");
        assertThat(JSON.convertValue(opened.path("labels"), List.class)).contains("priority:high", "status:할 일");
        assertThat(link("issue", login)).isEqualTo("101");

        // A change made in BIT reaches it; a webhook echoing BIT's own issue makes no second issue.
        var update = new WorkItemRequests.Update();
        update.setExpectedVersion(0L);
        update.setTitle("Login fails on Safari");
        workItemService.revise(owner, workspace, project, login, update);
        assertThat(sent("PATCH", "/api/v3/repos/acme/app/issues/101")
                        .path("title")
                        .asString())
                .isEqualTo("Login fails on Safari");
        hook(
                integration.id(),
                integration.webhookSecret(),
                "issues",
                Map.of(
                        "action",
                        "opened",
                        "sender",
                        Map.of("login", "bit-bot"),
                        "issue",
                        issue(101, "Login fails", opened.path("body").asString(), List.of())));
        assertThat(count("SELECT count(*) FROM work_item")).isEqualTo(1);

        // A pushed branch named after it links the branch and its commit and starts the work.
        hook(
                integration.id(),
                integration.webhookSecret(),
                "push",
                Map.of(
                        "ref",
                        "refs/heads/bit-1-login",
                        "sender",
                        Map.of("login", "alice"),
                        "repository",
                        Map.of("html_url", "https://github.example/acme/app"),
                        "commits",
                        List.of(Map.of(
                                "id",
                                "abc1234def",
                                "message",
                                "Fix the cookie",
                                "url",
                                "https://github.example/c/abc",
                                "author",
                                Map.of("name", "Alice")))));
        assertThat(link("branch", login)).isEqualTo("bit-1-login");
        assertThat(link("commit", login)).isEqualTo("abc1234def");
        assertThat(column(login)).isEqualTo(columns.get("진행 중"));
        // A move the repository's code made is news to its issue: the status label follows (BIT-18).
        assertThat(JSON.convertValue(
                        sent("PATCH", "/api/v3/repos/acme/app/issues/101").path("labels"), List.class))
                .contains("status:진행 중");

        // A pull request for it moves it to review, and its merge finishes it.
        Map<String, Object> pr = Map.of(
                "number",
                12,
                "title",
                "Cookie fix",
                "body",
                "",
                "html_url",
                "https://github.example/acme/app/pull/12",
                "merged",
                false,
                "draft",
                false,
                "head",
                Map.of("ref", "bit-1-login"));
        hook(
                integration.id(),
                integration.webhookSecret(),
                "pull_request",
                Map.of("action", "opened", "sender", Map.of("login", "alice"), "pull_request", pr));
        assertThat(column(login)).isEqualTo(columns.get("검토 중"));
        assertThat(JSON.convertValue(
                        sent("PATCH", "/api/v3/repos/acme/app/issues/101").path("labels"), List.class))
                .contains("status:검토 중");
        var merged = new java.util.HashMap<>(pr);
        merged.put("merged", true);
        hook(
                integration.id(),
                integration.webhookSecret(),
                "pull_request",
                Map.of("action", "closed", "sender", Map.of("login", "alice"), "pull_request", merged));
        assertThat(column(login)).isEqualTo(columns.get("완료"));
        var closing = sent("PATCH", "/api/v3/repos/acme/app/issues/101");
        assertThat(closing.path("state").asString()).isEqualTo("closed");
        assertThat(JSON.convertValue(closing.path("labels"), List.class)).contains("status:완료");
        assertThat(jdbcTemplate.queryForObject("SELECT state FROM code_link WHERE kind='pull_request'", String.class))
                .isEqualTo("merged");

        // A late echo of an earlier write (its label a column behind, older than BIT's last write) moves nothing back;
        // a change made there after it still counts.
        hook(
                integration.id(),
                integration.webhookSecret(),
                "issues",
                Map.of(
                        "action",
                        "labeled",
                        "sender",
                        Map.of("login", "bit-bot"),
                        "issue",
                        edited(
                                101,
                                List.of("priority:high", "status:진행 중"),
                                Instant.now().minusSeconds(60))));
        assertThat(column(login)).isEqualTo(columns.get("완료"));
        hook(
                integration.id(),
                integration.webhookSecret(),
                "issues",
                Map.of(
                        "action",
                        "labeled",
                        "sender",
                        Map.of("login", "alice"),
                        "issue",
                        edited(
                                101,
                                List.of("priority:high", "status:검토 중"),
                                Instant.now().plusSeconds(60))));
        assertThat(column(login)).isEqualTo(columns.get("검토 중"));
        assertThat(integrationService.pulls(owner, workspace, List.of(login), List.of(project)))
                .singleElement()
                .satisfies(badge -> assertThat(badge.number()).isEqualTo("12"));

        // An issue opened in the repository becomes a BIT issue; its comments follow it; BIT says so on it once.
        hook(
                integration.id(),
                integration.webhookSecret(),
                "issues",
                Map.of(
                        "action",
                        "opened",
                        "sender",
                        Map.of("login", "carol"),
                        "issue",
                        issue(5, "Export to CSV", "Please", List.of("priority:low", "feature"))));
        String exported = jdbcTemplate.queryForObject(
                "SELECT work_item_id FROM code_link WHERE kind='issue' AND external_id='5'", String.class);
        assertThat(jdbcTemplate.queryForMap(
                        "SELECT title, priority, created_by_agent FROM work_item WHERE work_item_id=?", exported))
                .containsEntry("title", "Export to CSV")
                .containsEntry("priority", "low")
                .containsEntry("created_by_agent", "GitHub · carol");
        assertThat(
                        count(
                                "SELECT count(*) FROM work_item_label il JOIN label l ON l.label_id=il.label_id WHERE l.name='feature'"))
                .isEqualTo(1);
        assertThat(sent("POST", "/api/v3/repos/acme/app/issues/5/comments")
                        .path("body")
                        .asString())
                .contains("BIT-2")
                .contains("<!-- bit:");
        hook(
                integration.id(),
                integration.webhookSecret(),
                "issue_comment",
                Map.of(
                        "action",
                        "created",
                        "issue",
                        Map.of("number", 5),
                        "comment",
                        Map.of(
                                "body",
                                "Any update?",
                                "html_url",
                                "u",
                                "user",
                                Map.of("login", "carol", "type", "User"))));
        assertThat(jdbcTemplate.queryForMap("SELECT body, created_by_agent FROM comment WHERE target_id=?", exported))
                .containsEntry("body", "Any update?")
                .containsEntry("created_by_agent", "GitHub · carol");
        hook(
                integration.id(),
                integration.webhookSecret(),
                "issues",
                Map.of(
                        "action",
                        "closed",
                        "sender",
                        Map.of("login", "carol"),
                        "issue",
                        issue(5, "Export to CSV", "Please", List.of())));
        assertThat(column(exported)).isEqualTo(columns.get("완료"));

        // A manager brings in the open issues not yet mirrored.
        openIssues.put("5", "Export to CSV");
        openIssues.put("6", "Dark mode");
        var imported = inboundService.importOpen(owner, workspace, project, integration.id());
        assertThat(imported.issues()).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM work_item")).isEqualTo(3);

        // A delivery not signed with the secret changes nothing.
        var refused = deliver(integration.id(), "issues", "{\"action\":\"opened\"}", "sha256=00");
        assertThat(refused.statusCode()).isEqualTo(401);

        // Disconnecting removes the connection, its links and the webhook BIT registered.
        integrationService.disconnect(owner, workspace, project, integration.id());
        assertThat(count("SELECT count(*) FROM repository_integration")).isZero();
        assertThat(count("SELECT count(*) FROM code_link")).isZero();
        assertThat(received.stream()
                        .anyMatch(r -> r.method.equals("DELETE") && r.path.equals("/api/v3/repos/acme/app/hooks/7")))
                .isTrue();
    }

    private void answer(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        received.add(
                new Request(method, path, body, exchange.getRequestHeaders().getFirst("Authorization")));
        Object reply;
        if (method.equals("GET") && path.equals("/api/v3/repos/acme/app"))
            reply = Map.of("full_name", "acme/app", "id", 77, "html_url", "https://github.example/acme/app");
        else if (method.equals("GET") && path.equals("/api/v3/user")) reply = Map.of("login", "bit-bot");
        else if (method.equals("POST") && path.endsWith("/hooks")) reply = Map.of("id", 7);
        else if (method.equals("POST") && path.equals("/api/v3/repos/acme/app/issues"))
            reply = issue(101, JSON.readTree(body).path("title").asString(), "", List.of());
        else if (method.equals("GET") && path.equals("/api/v3/repos/acme/app/issues"))
            reply = openIssues.entrySet().stream()
                    .map(e -> issue(Integer.parseInt(e.getKey()), e.getValue(), "", List.of()))
                    .toList();
        else if (method.equals("GET") && (path.endsWith("/comments") || path.endsWith("/pulls"))) reply = List.of();
        else reply = Map.of();
        byte[] out = JSON.writeValueAsBytes(reply);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(method.equals("POST") ? 201 : 200, out.length);
        exchange.getResponseBody().write(out);
        exchange.close();
    }

    private static Map<String, Object> issue(int number, String title, String body, List<String> labels) {
        return Map.of(
                "number",
                number,
                "title",
                title,
                "body",
                body,
                "state",
                "open",
                "html_url",
                "https://github.example/acme/app/issues/" + number,
                "labels",
                labels.stream().map(name -> Map.of("name", name)).toList(),
                "user",
                Map.of("login", "carol"));
    }

    /** BIT's mirror of "Login fails on Safari" as GitHub tells of it at a given time, with these labels. */
    private static Map<String, Object> edited(int number, List<String> labels, Instant updatedAt) {
        var issue = new java.util.HashMap<>(issue(number, "Login fails on Safari", "", labels));
        issue.remove("body");
        issue.put(
                "updated_at",
                updatedAt.truncatedTo(java.time.temporal.ChronoUnit.SECONDS).toString());
        return issue;
    }

    private void hook(String integrationId, String secret, String event, Map<String, Object> payload) throws Exception {
        String body = JSON.writeValueAsString(payload);
        var response = deliver(integrationId, event, body, "sha256=" + hmac(body, secret));
        assertThat(response.statusCode()).as(response.body()).isEqualTo(202);
    }

    private HttpResponse<String> deliver(String integrationId, String event, String body, String signature)
            throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            return client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/hooks/" + integrationId))
                            .header("Content-Type", "application/json")
                            .header("X-GitHub-Event", event)
                            .header("X-Hub-Signature-256", signature)
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
        }
    }

    private JsonNode sent(String method, String path) {
        return received.stream()
                .filter(r -> r.method.equals(method) && r.path.equals(path))
                .reduce((first, second) -> second)
                .map(r -> JSON.readTree(r.body))
                .orElseThrow(() -> new AssertionError(method + " " + path + " was not sent; sent: " + received));
    }

    private String link(String kind, String workItemId) {
        return jdbcTemplate.queryForObject(
                "SELECT external_id FROM code_link WHERE kind=? AND work_item_id=? ORDER BY updated_at DESC LIMIT 1",
                String.class,
                kind,
                workItemId);
    }

    private String column(String workItemId) {
        return jdbcTemplate.queryForObject(
                "SELECT board_column_id FROM work_item WHERE work_item_id=?", String.class, workItemId);
    }

    private int count(String sql) {
        Integer found = jdbcTemplate.queryForObject(sql, Integer.class);
        return found == null ? 0 : found;
    }

    private String base() {
        return "http://127.0.0.1:" + github.getAddress().getPort();
    }

    private static String hmac(String body, String secret) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }

    private CurrentUser identity() {
        String user = Ids.newId();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                user,
                "owner" + user.toLowerCase(Locale.ROOT) + "@example.test",
                "Owner",
                now,
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES (?,?,?)",
                user,
                "fixture-hash",
                now);
        String session = Ids.newId();
        jdbcTemplate.update(
                "INSERT INTO iam_session(iam_session_id,iam_user_id,token_hash,expires_at,absolute_expires_at,last_seen_at,created_at) VALUES (?,?,?,?,?,?,?)",
                session,
                user,
                session,
                InstantTextBinding.text(Instant.now().plusSeconds(3600)),
                InstantTextBinding.text(Instant.now().plusSeconds(7200)),
                now,
                now);
        return new CurrentUser(user, false, CurrentUser.Method.SESSION, session, null, false);
    }

    private record Request(String method, String path, String body, String authorization) {}
}
