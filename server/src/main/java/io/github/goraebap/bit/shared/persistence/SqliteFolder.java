package io.github.goraebap.bit.shared.persistence;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.sql.DataSource;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.env.Environment;

/**
 * Makes the folder the SQLite file lives in before anything connects, since SQLite makes the file but not its folder:
 * a fresh server's data folder, or build/test-db on a clean build.
 */
final class SqliteFolder implements BeanPostProcessor {
    private static final String PREFIX = "jdbc:sqlite:";

    private final Environment environment;

    SqliteFolder(Environment environment) {
        this.environment = environment;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String name) {
        if (bean instanceof DataSource) make(environment.getProperty("spring.datasource.url"));
        return bean;
    }

    static void make(String url) {
        if (url == null || !url.startsWith(PREFIX)) return;
        String file = url.substring(PREFIX.length());
        int query = file.indexOf('?');
        if (query >= 0) file = file.substring(0, query);
        if (file.isBlank() || file.startsWith(":memory:") || file.startsWith("file:")) return;
        Path parent = Path.of(file).toAbsolutePath().getParent();
        try {
            if (parent != null) Files.createDirectories(parent);
        } catch (IOException e) {
            throw new UncheckedIOException("SQLite 파일 폴더를 만들 수 없습니다: " + parent, e);
        }
    }
}
