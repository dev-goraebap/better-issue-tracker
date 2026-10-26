package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.goraebap.bit.shared.domain.Ids;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false",
            "app.screens=classpath:/screens/",
            "app.auth.secret=authentication-test-secret-at-least-32-characters"
        })
@AutoConfigureMockMvc
class BootstrapIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DataSource dataSource;

    @LocalServerPort
    private int port;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String path = Path.of("build", "test-db", Ids.newId() + ".db")
                .toAbsolutePath()
                .toString();
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + path);
    }

    @Test
    void publicEndpointsWorkWithoutOptionalServices() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
        mockMvc.perform(get("/api/v1/capabilities"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"mail":false,"gitIntegration":false,"objectStorage":true,"documentConversion":false,"pdf":false}
                        """));
    }

    @Test
    void allOtherApiPathsAndMethodsAreClosed() throws Exception {
        for (String path : new String[] {"/api/v1/users", "/api/openapi", "/api/mcp", "/api"}) {
            mockMvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"))
                    .andExpect(jsonPath("$.traceId").isNotEmpty());
        }
        mockMvc.perform(post("/api/v1/health"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void screensHaveFallbackButMissingFilesDoNot() throws Exception {
        mockMvc.perform(get("/workspace/inbox"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("BIT screen fixture")))
                .andExpect(header().string("Cache-Control", "no-cache"));
        mockMvc.perform(get("/assets/app-test.js"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age=31536000")));
        mockMvc.perform(get("/missing.js"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMMON_NOT_FOUND"));
        mockMvc.perform(get("/error"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMMON_NOT_FOUND"));
    }

    @Test
    void migrationsAndConnectionSettingsAreApplied() throws SQLException {
        try (Connection connection = dataSource.getConnection();
                var statement = connection.createStatement()) {
            try (var result = statement.executeQuery(
                    "SELECT count(*) FROM sqlite_master WHERE type='table' AND name LIKE 'iam_%'")) {
                assertThat(result.next()).isTrue();
                assertThat(result.getInt(1)).isEqualTo(5);
            }
            for (String[] setting : new String[][] {
                {"journal_mode", "wal"}, {"synchronous", "1"}, {"foreign_keys", "1"}, {"busy_timeout", "5000"}
            }) {
                try (var result = statement.executeQuery("PRAGMA " + setting[0])) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getString(1)).isEqualTo(setting[1]);
                }
            }
            assertThatThrownBy(
                            () -> statement.executeUpdate(
                                    "INSERT INTO iam_password (iam_user_id,password_hash,changed_at) VALUES ('missing','hash','2026-10-22T00:00:00.000000Z')"))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(
                            () -> statement.executeUpdate(
                                    "INSERT INTO iam_email_otp (iam_email_otp_id,email,purpose,code_hash,expires_at,created_at) VALUES ('otp','test@example.test','unknown','hash','2026-10-22T00:00:00.000000Z','2026-10-22T00:00:00.000000Z')"))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    void realServerAnswersHealthAndRejectsMalformedPathAsProblem() throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            var health = client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/health"))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(health.statusCode()).isEqualTo(200);
            var malformed = client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/a%2Fb"))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(malformed.statusCode()).isEqualTo(400);
            assertThat(malformed.headers().firstValue("Content-Type").orElse(""))
                    .contains("application/problem+json");
            assertThat(malformed.body()).contains("COMMON_INVALID_REQUEST", "traceId");
        }
    }
}
