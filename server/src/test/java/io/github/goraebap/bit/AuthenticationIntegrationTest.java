package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false", "app.auth.secret=authentication-test-secret-at-least-32-characters",
            "app.auth.cookie-secure=false", "app.auth.allowed-origins=http://localhost:8080"
        })
@Import(AuthenticationIntegrationTest.TimeConfig.class)
class AuthenticationIntegrationTest {
    private static final String PASSWORD = "correct horse battery staple";
    private static final String EMAIL = "admin@example.test";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private MutableClock mutableClock;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/auth-" + UUID.randomUUID() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void clean() {
        for (String table : List.of("iam_api_key", "iam_session", "iam_password", "iam_email_otp", "iam_user"))
            jdbcTemplate.update("DELETE FROM " + table);
        mutableClock.advance(Duration.ofDays(40));
    }

    @Test
    void firstSignupIsAtomicAndNeverReopensForDeletedUsers() throws Exception {
        try (Client first = new Client();
                Client second = new Client();
                var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            first.csrf();
            second.csrf();
            var a = pool.submit(() -> first.write(
                    "POST", "/auth/bootstrap", Map.of("name", "First", "email", EMAIL, "password", PASSWORD)));
            var b = pool.submit(() -> second.write(
                    "POST",
                    "/auth/bootstrap",
                    Map.of("name", "Second", "email", "other@example.test", "password", PASSWORD)));
            assertThat(List.of(a.get().statusCode(), b.get().statusCode())).containsExactlyInAnyOrder(201, 409);
            assertThat(jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM iam_user WHERE is_instance_admin=1", Integer.class))
                    .isEqualTo(1);
            jdbcTemplate.update("UPDATE iam_user SET deleted_at='2026-10-22T00:00:00.000000Z'");
            assertThat(first.get("/auth/bootstrap").body()).contains("\"canBootstrap\":false");
            assertThat(first.write(
                                    "POST",
                                    "/auth/bootstrap",
                                    Map.of("name", "Again", "email", "again@example.test", "password", PASSWORD))
                            .statusCode())
                    .isEqualTo(409);
        }
    }

    @Test
    void csrfOriginAndCookieSecurityAreEnforced() throws Exception {
        try (Client client = new Client()) {
            assertThat(client.send("POST", "/auth/bootstrap", Map.of(), null, null, null)
                            .statusCode())
                    .isEqualTo(403);
            client.csrf();
            var noToken = client.send("POST", "/auth/bootstrap", Map.of(), "http://localhost:8080", null, null);
            assertThat(noToken.statusCode()).isEqualTo(403);
            assertThat(noToken.body()).contains("AUTH_CSRF_INVALID", "traceId");
            assertThat(client.send("POST", "/auth/bootstrap", Map.of(), "http://evil.example", client.csrfToken, null)
                            .statusCode())
                    .isEqualTo(403);
            assertThat(client.send("POST", "/auth/bootstrap", Map.of(), "null", client.csrfToken, null)
                            .statusCode())
                    .isEqualTo(403);
            assertThat(client.bootstrap(" " + EMAIL.toUpperCase(java.util.Locale.ROOT) + " ", PASSWORD)
                            .statusCode())
                    .isEqualTo(201);
            String anonymousCsrf = client.csrfToken;
            var login = client.login(EMAIL, PASSWORD);
            assertThat(login.statusCode()).isEqualTo(201);
            String sessionCookie = login.headers().allValues("Set-Cookie").stream()
                    .filter(s -> s.startsWith("bit_session="))
                    .findFirst()
                    .orElseThrow();
            assertThat(sessionCookie)
                    .contains("HttpOnly", "Path=/", "SameSite=Lax")
                    .doesNotContain("Secure");
            assertThat(login.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
            assertThat(client.send(
                                    "POST",
                                    "/me/api-keys",
                                    Map.of("name", "key", "currentPassword", PASSWORD),
                                    "http://localhost:8080",
                                    anonymousCsrf,
                                    null)
                            .body())
                    .contains("AUTH_CSRF_INVALID");
            client.csrf();
            assertThat(client.csrfToken).isNotEqualTo(anonymousCsrf);
            assertThat(client.get("/auth/sessions/current").statusCode()).isEqualTo(200);
        }
    }

    @Test
    void passwordFailuresCommitAndLockExpiresWithoutExtension() throws Exception {
        try (Client client = new Client()) {
            client.bootstrap(EMAIL, PASSWORD);
            String changed = jdbcTemplate.queryForObject("SELECT changed_at FROM iam_password", String.class);
            String failure = null;
            for (int i = 0; i < 5; i++) {
                var response = client.login(EMAIL, "wrong password value");
                assertThat(response.statusCode()).isEqualTo(401);
                failure = JSON.readTree(response.body()).path("code").asText();
            }
            assertThat(jdbcTemplate.queryForObject("SELECT failed_count FROM iam_password", Integer.class))
                    .isEqualTo(5);
            String locked = jdbcTemplate.queryForObject("SELECT locked_until FROM iam_password", String.class);
            mutableClock.advance(Duration.ofMinutes(5));
            assertThat(client.login(EMAIL, PASSWORD).statusCode()).isEqualTo(401);
            assertThat(jdbcTemplate.queryForObject("SELECT locked_until FROM iam_password", String.class))
                    .isEqualTo(locked);
            assertThat(JSON.readTree(client.login("nobody@example.test", PASSWORD)
                                    .body())
                            .path("code")
                            .asText())
                    .isEqualTo(failure);
            mutableClock.advance(Duration.ofMinutes(11));
            assertThat(client.login(EMAIL, PASSWORD).statusCode()).isEqualTo(201);
            assertThat(jdbcTemplate.queryForObject("SELECT failed_count FROM iam_password", Integer.class))
                    .isZero();
            assertThat(jdbcTemplate.queryForObject("SELECT changed_at FROM iam_password", String.class))
                    .isEqualTo(changed);
        }
    }

    @Test
    void sessionsSlideAtIntervalsAndHonorAbsoluteExpiry() throws Exception {
        try (Client client = signedIn()) {
            String seen = jdbcTemplate.queryForObject("SELECT last_seen_at FROM iam_session", String.class);
            mutableClock.advance(Duration.ofMinutes(4));
            assertThat(client.get("/me").statusCode()).isEqualTo(200);
            assertThat(jdbcTemplate.queryForObject("SELECT last_seen_at FROM iam_session", String.class))
                    .isEqualTo(seen);
            mutableClock.advance(Duration.ofMinutes(1));
            assertThat(client.get("/me").statusCode()).isEqualTo(200);
            assertThat(jdbcTemplate.queryForObject("SELECT last_seen_at FROM iam_session", String.class))
                    .isNotEqualTo(seen);
            for (int i = 0; i < 4; i++) {
                mutableClock.advance(Duration.ofDays(6));
                assertThat(client.get("/me").statusCode()).isEqualTo(200);
            }
            mutableClock.advance(Duration.ofDays(6));
            assertThat(client.get("/me").statusCode()).isEqualTo(401);
        }
    }

    @Test
    void idleExpiryAndDeletedUserRejectBothAuthenticationMethods() throws Exception {
        try (Client client = signedIn()) {
            String key = createKey(client, 30).path("key").asText();
            mutableClock.advance(Duration.ofDays(7));
            assertThat(client.get("/me").statusCode()).isEqualTo(401);
            assertThat(client.bearer("GET", "/me", key).statusCode()).isEqualTo(200);
            jdbcTemplate.update("UPDATE iam_user SET deleted_at='2026-10-22T00:00:00.000000Z'");
            assertThat(client.bearer("GET", "/me", key).statusCode()).isEqualTo(401);
        }
    }

    @Test
    void keysNeverAuthorizeAccountSecurityAndInvalidBearerDoesNotFallback() throws Exception {
        try (Client client = signedIn()) {
            JsonNode key = createKey(client, 1);
            String raw = key.path("key").asText();
            assertThat(raw).startsWith("bit_");
            assertThat(client.bearer("GET", "/me", raw).body()).contains("API_KEY", "codex");
            assertThat(client.get("/me/api-keys").body()).doesNotContain(raw, "keyHash", "key_hash");
            assertThat(jdbcTemplate.queryForObject("SELECT key_hash FROM iam_api_key", String.class))
                    .doesNotContain(raw);
            assertThat(client.bearer("GET", "/me", "bit_invalid").statusCode()).isEqualTo(401);
            for (String path : List.of("/me/api-keys", "/auth/sessions/current", "/auth/sessions"))
                assertThat(client.bearer("GET", path, raw).statusCode()).isEqualTo(403);
            assertThat(client.bearer("POST", "/me/api-keys", raw).statusCode()).isEqualTo(403);
            assertThat(client.bearer("PUT", "/me/password", raw).statusCode()).isEqualTo(403);
            assertThat(client.bearer("POST", "/admin/users/" + UUID.randomUUID() + "/temporary-passwords", raw)
                            .statusCode())
                    .isEqualTo(403);
            String used = jdbcTemplate.queryForObject("SELECT last_used_at FROM iam_api_key", String.class);
            mutableClock.advance(Duration.ofSeconds(59));
            client.bearer("GET", "/me", raw);
            assertThat(jdbcTemplate.queryForObject("SELECT last_used_at FROM iam_api_key", String.class))
                    .isEqualTo(used);
            mutableClock.advance(Duration.ofSeconds(1));
            client.bearer("GET", "/me", raw);
            assertThat(jdbcTemplate.queryForObject("SELECT last_used_at FROM iam_api_key", String.class))
                    .isNotEqualTo(used);
            assertThat(client.write("DELETE", "/me/api-keys/" + key.path("id").asText(), null)
                            .statusCode())
                    .isEqualTo(204);
            assertThat(client.write("DELETE", "/me/api-keys/" + key.path("id").asText(), null)
                            .statusCode())
                    .isEqualTo(204);
            assertThat(client.bearer("GET", "/me", raw).statusCode()).isEqualTo(401);
        }
    }

    @Test
    void keyExpiryAndLogoutAllHaveDifferentLifecycles() throws Exception {
        try (Client first = signedIn();
                Client second = new Client()) {
            second.login(EMAIL, PASSWORD);
            String key = createKey(first, 1).path("key").asText();
            assertThat(first.write("DELETE", "/auth/sessions", null).statusCode())
                    .isEqualTo(204);
            assertThat(first.get("/me").statusCode()).isEqualTo(401);
            assertThat(second.get("/me").statusCode()).isEqualTo(401);
            assertThat(first.bearer("GET", "/me", key).statusCode()).isEqualTo(200);
            mutableClock.advance(Duration.ofDays(1));
            assertThat(first.bearer("GET", "/me", key).statusCode()).isEqualTo(401);
        }
    }

    @Test
    void passwordChangeRotatesCurrentSessionAndRevokesOtherCredentials() throws Exception {
        try (Client first = signedIn();
                Client second = new Client()) {
            second.login(EMAIL, PASSWORD);
            String raw = createKey(first, 0).path("key").asText();
            String oldCookie = first.cookies.getCookieStore().getCookies().stream()
                    .filter(c -> c.getName().equals("bit_session"))
                    .findFirst()
                    .orElseThrow()
                    .getValue();
            var response = first.write(
                    "PUT",
                    "/me/password",
                    Map.of("currentPassword", PASSWORD, "newPassword", "new secure password phrase"));
            assertThat(response.statusCode()).isEqualTo(204);
            assertThat(first.get("/me").statusCode()).isEqualTo(200);
            assertThat(second.get("/me").statusCode()).isEqualTo(401);
            assertThat(first.bearer("GET", "/me", raw).statusCode()).isEqualTo(401);
            try (Client stale = new Client()) {
                var cookie = new java.net.HttpCookie("bit_session", oldCookie);
                cookie.setPath("/");
                stale.cookies.getCookieStore().add(URI.create("http://localhost:" + port), cookie);
                assertThat(stale.get("/me").statusCode()).isEqualTo(401);
            }
            assertThat(first.cookies.getCookieStore().getCookies().stream()
                            .filter(c -> c.getName().equals("bit_session"))
                            .findFirst()
                            .orElseThrow()
                            .getValue())
                    .isNotEqualTo(oldCookie);
            assertThat(first.write("DELETE", "/auth/sessions/current", null).statusCode())
                    .isEqualTo(204);
            assertThat(first.get("/me").statusCode()).isEqualTo(401);
        }
    }

    @Test
    void adminResetRestrictsTemporarySessionsAndCannotBeCalledByMember() throws Exception {
        try (Client admin = signedIn();
                Client member = new Client()) {
            UUID userId = fixtureUser("member@example.test");
            member.login("member@example.test", PASSWORD);
            String key = createKey(member, 0).path("key").asText();
            member.csrf();
            var denied = member.send(
                    "POST",
                    "/admin/users/" + userId + "/temporary-passwords",
                    "broken json",
                    "http://localhost:8080",
                    member.csrfToken,
                    null);
            assertThat(denied.statusCode()).isEqualTo(403);
            var reset = admin.write(
                    "POST", "/admin/users/" + userId + "/temporary-passwords", Map.of("currentPassword", PASSWORD));
            assertThat(reset.statusCode()).isEqualTo(200);
            String temporary =
                    JSON.readTree(reset.body()).path("temporaryPassword").asText();
            assertThat(reset.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
            assertThat(member.get("/me").statusCode()).isEqualTo(401);
            assertThat(member.bearer("GET", "/me", key).statusCode()).isEqualTo(401);
            assertThat(member.login("member@example.test", temporary).statusCode())
                    .isEqualTo(201);
            assertThat(member.get("/me").body()).contains("\"mustChangePassword\":true");
            assertThat(member.get("/me/api-keys").statusCode()).isEqualTo(403);
            assertThat(member.write(
                                    "PUT",
                                    "/me/password",
                                    Map.of("currentPassword", temporary, "newPassword", PASSWORD))
                            .statusCode())
                    .isEqualTo(204);
            assertThat(member.get("/me/api-keys").statusCode()).isEqualTo(200);
        }
    }

    @Test
    void foreignKeysAndPaginationCannotLeakAnotherUsersKeys() throws Exception {
        try (Client admin = signedIn();
                Client member = new Client()) {
            fixtureUser("member@example.test");
            member.login("member@example.test", PASSWORD);
            JsonNode one = createKey(admin, 30);
            mutableClock.advance(Duration.ofSeconds(1));
            createKey(admin, 30);
            assertThat(member.write("DELETE", "/me/api-keys/" + one.path("id").asText(), null)
                            .statusCode())
                    .isEqualTo(404);
            JsonNode page = JSON.readTree(admin.get("/me/api-keys?size=1").body());
            assertThat(page.path("items").size()).isEqualTo(1);
            String next = page.path("nextCursor").asText();
            assertThat(JSON.readTree(admin.get("/me/api-keys?size=1&cursor=" + next)
                                    .body())
                            .path("items")
                            .get(0)
                            .path("id")
                            .asText())
                    .isEqualTo(one.path("id").asText());
            assertThat(member.get("/me/api-keys?cursor=" + next).statusCode()).isEqualTo(400);
            assertThat(admin.get("/me/api-keys?cursor=invalid").statusCode()).isEqualTo(400);
            assertThat(admin.get("/me/api-keys?direction=ASC").statusCode()).isEqualTo(400);
        }
    }

    @Test
    void passwordsRespectBytesWithoutTruncationAndRateLimitsExpire() throws Exception {
        try (Client client = new Client()) {
            assertThat(client.bootstrap(EMAIL, "가".repeat(25)).statusCode()).isEqualTo(400);
            assertThat(client.bootstrap(EMAIL, "a".repeat(14)).statusCode()).isEqualTo(400);
            String unicode = "가".repeat(24);
            assertThat(client.bootstrap(EMAIL, unicode).statusCode()).isEqualTo(201);
            assertThat(client.login(EMAIL, unicode).statusCode()).isEqualTo(201);
            assertThat(client.login(EMAIL, unicode + "a").statusCode()).isEqualTo(401);
            for (int i = 0; i < 5; i++) client.login("unknown@example.test", PASSWORD);
            assertThat(client.login("unknown@example.test", PASSWORD).statusCode())
                    .isEqualTo(429);
            mutableClock.advance(Duration.ofSeconds(60));
            assertThat(client.login(EMAIL, unicode).statusCode()).isEqualTo(201);
        }
    }

    @Test
    void whitespacePasswordsAreNeitherTrimmedNorRejectedByCompositionRules() throws Exception {
        try (Client client = new Client()) {
            String spaces = " ".repeat(15);
            assertThat(client.bootstrap(EMAIL, spaces).statusCode()).isEqualTo(201);
            assertThat(client.login(EMAIL, spaces).statusCode()).isEqualTo(201);
            assertThat(client.login(EMAIL, " ".repeat(14)).statusCode()).isEqualTo(401);
        }
    }

    private Client signedIn() throws Exception {
        Client client = new Client();
        assertThat(client.bootstrap(EMAIL, PASSWORD).statusCode()).isEqualTo(201);
        assertThat(client.login(EMAIL, PASSWORD).statusCode()).isEqualTo(201);
        return client;
    }

    private JsonNode createKey(Client client, int days) throws Exception {
        var response = client.write(
                "POST",
                "/me/api-keys",
                Map.of(
                        "name",
                        "Local agent",
                        "agentName",
                        "codex",
                        "expiresInDays",
                        days,
                        "currentPassword",
                        PASSWORD));
        assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
        return JSON.readTree(response.body());
    }

    private UUID fixtureUser(String email) {
        UUID id = UUID.randomUUID();
        String now = "2026-10-22T00:00:00.000000Z";
        jdbcTemplate.update(
                "INSERT INTO iam_user(iam_user_id,email,name,is_instance_admin,created_at,updated_at) VALUES(?,?,?,0,?,?)",
                id.toString(),
                email,
                "Member",
                now,
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES(?,?,?)",
                id.toString(),
                passwordEncoder.encode(PASSWORD),
                now);
        return id;
    }

    private class Client implements AutoCloseable {
        private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        private final HttpClient http =
                HttpClient.newBuilder().cookieHandler(cookies).build();
        private String csrfToken;

        HttpResponse<String> get(String path) throws Exception {
            return send("GET", path, null, null, null, null);
        }

        void csrf() throws Exception {
            csrfToken = JSON.readTree(get("/auth/csrf").body()).path("token").asText();
        }

        HttpResponse<String> bootstrap(String email, String password) throws Exception {
            return write("POST", "/auth/bootstrap", Map.of("email", email, "name", "Admin", "password", password));
        }

        HttpResponse<String> login(String email, String password) throws Exception {
            return write("POST", "/auth/sessions", Map.of("email", email, "password", password));
        }

        HttpResponse<String> write(String method, String path, Object body) throws Exception {
            csrf();
            return send(method, path, body, "http://localhost:8080", csrfToken, null);
        }

        HttpResponse<String> bearer(String method, String path, String key) throws Exception {
            return send(method, path, null, null, null, key);
        }

        HttpResponse<String> send(String method, String path, Object body, String origin, String csrf, String key)
                throws IOException, InterruptedException {
            var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                    .header("Accept", "application/json");
            if (origin != null) request.header("Origin", origin);
            if (csrf != null) request.header("X-CSRF-Token", csrf);
            if (key != null) request.header("Authorization", "Bearer " + key);
            String content = body == null ? "" : body instanceof String text ? text : JSON.writeValueAsString(body);
            if (body != null) request.header("Content-Type", "application/json");
            return http.send(
                    request.method(method, HttpRequest.BodyPublishers.ofString(content))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
        }

        @Override
        public void close() {
            http.close();
        }
    }

    static class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-10-22T00:00:00Z");

        synchronized void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public synchronized Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            if (!zone.equals(ZoneOffset.UTC)) throw new IllegalArgumentException("UTC only");
            return this;
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TimeConfig {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock();
        }
    }
}
