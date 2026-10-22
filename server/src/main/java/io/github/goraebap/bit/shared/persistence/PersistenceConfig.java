package io.github.goraebap.bit.shared.persistence;

import org.springframework.boot.jooq.autoconfigure.ExceptionTranslatorExecuteListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * The SQLite database: its file's folder made before the first connection, and jOOQ's errors through the SQLite
 * translator, so a broken constraint is a conflict and not a server error.
 */
@Configuration
public class PersistenceConfig {
    @Bean
    static SqliteFolder sqliteFolder(Environment environment) {
        return new SqliteFolder(environment);
    }

    @Bean
    ExceptionTranslatorExecuteListener jooqExceptionTranslator() {
        var translator = new SqliteExceptionTranslator();
        return ExceptionTranslatorExecuteListener.of(context -> translator);
    }
}
