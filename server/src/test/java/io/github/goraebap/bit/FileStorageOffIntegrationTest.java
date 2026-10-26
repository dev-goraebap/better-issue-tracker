package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.goraebap.bit.shared.domain.Ids;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;

/** An S3 storage that does not answer turns files off and leaves the server running (D-030, D-090). */
@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false",
            "app.auth.secret=file-off-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false",
            "app.auth.allowed-origins=http://localhost:8080",
            "app.storage.endpoint=http://127.0.0.1:1",
            "app.storage.bucket=bit",
            "app.storage.access-key=key-id",
            "app.storage.secret-key=key-secret"
        })
class FileStorageOffIntegrationTest {
    @LocalServerPort
    private int port;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/file-off-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @Test
    void theServerStartsAndSaysFilesAreOff() throws Exception {
        var client = HttpClient.newHttpClient();
        var health = client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/health"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(health.statusCode()).isEqualTo(200);
        var capabilities = client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/capabilities"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(JsonMapper.builder()
                        .build()
                        .readTree(capabilities.body())
                        .path("objectStorage")
                        .asBoolean())
                .isFalse();
        // The local storage's path is not served when files live in S3.
        var local = client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/storage?key=a"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(local.statusCode()).isEqualTo(404);
    }
}
