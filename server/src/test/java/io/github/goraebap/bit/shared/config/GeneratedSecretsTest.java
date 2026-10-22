package io.github.goraebap.bit.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

class GeneratedSecretsTest {
    @TempDir
    private Path directory;

    @Test
    void generatedValuesSurviveRestartAndExplicitValuesWin() {
        Path database = directory.resolve("data/bit.db");
        var first = new MockEnvironment().withProperty("DB_PATH", database.toString());
        var processor = new GeneratedSecrets();
        processor.postProcessEnvironment(first, new SpringApplication());
        assertThat(Files.exists(database.resolveSibling("secrets.properties"))).isTrue();
        var restarted = new MockEnvironment()
                .withProperty("DB_PATH", database.toString())
                .withProperty("app.auth.secret", "explicit-test-value");
        processor.postProcessEnvironment(restarted, new SpringApplication());
        assertThat(restarted.getProperty("app.auth.secret")).isEqualTo("explicit-test-value");
        assertThat(restarted.getProperty("app.git.encryption-key"))
                .isEqualTo(first.getProperty("app.git.encryption-key"));
        assertThat(first.getProperty("app.auth.secret")).isNotEqualTo(first.getProperty("app.git.encryption-key"));
    }

    @Test
    void disablingGenerationDoesNotTouchTheFilesystem() {
        var environment = new MockEnvironment()
                .withProperty("DB_PATH", directory.resolve("bit.db").toString())
                .withProperty("app.secrets.generate", "false");
        new GeneratedSecrets().postProcessEnvironment(environment, new SpringApplication());
        assertThat(Files.exists(directory.resolve("secrets.properties"))).isFalse();
    }
}
