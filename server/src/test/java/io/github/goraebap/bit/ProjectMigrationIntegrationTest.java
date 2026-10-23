package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.persistence.SqliteExceptionTranslator;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

@Tag("integration")
class ProjectMigrationIntegrationTest {
    private static final String NOW = "2026-10-22T00:00:00.000000Z";

    @TempDir
    Path directory;

    @Test
    void upgradesV2WithoutChangingIdentityAndEnforcesTenantKeysAndProjectColumnOwnership() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("2").load().migrate();
        String user = UUID.randomUUID().toString();
        String workspace = UUID.randomUUID().toString();
        String p1 = UUID.randomUUID().toString();
        String p2 = UUID.randomUUID().toString();
        String column = UUID.randomUUID().toString();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
            jdbc.setExceptionTranslator(new SqliteExceptionTranslator());
            jdbc.execute("PRAGMA foreign_keys=ON");
            jdbc.update(
                    "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                    user,
                    "migration@example.test",
                    "Existing user",
                    NOW,
                    NOW);
            jdbc.update(
                    "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES (?,?,?)",
                    user,
                    "unchanged-test-hash",
                    NOW);
            jdbc.update(
                    "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                    workspace,
                    "Existing workspace",
                    "existing",
                    NOW,
                    user,
                    NOW,
                    user);
        }
        Flyway.configure().dataSource(url, null, null).target("3").load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
            jdbc.setExceptionTranslator(new SqliteExceptionTranslator());
            jdbc.execute("PRAGMA foreign_keys=ON");
            assertThat(jdbc.queryForObject(
                            "SELECT password_hash FROM iam_password WHERE iam_user_id=?", String.class, user))
                    .isEqualTo("unchanged-test-hash");
            for (String project : new String[] {p1, p2}) {
                jdbc.update(
                        "INSERT INTO project(project_id,workspace_id,name,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)",
                        project,
                        workspace,
                        "Test",
                        0,
                        NOW,
                        user,
                        NOW,
                        user);
            }
            jdbc.update(
                    "INSERT INTO project_key VALUES (?,?,?,?,?,?)",
                    UUID.randomUUID().toString(),
                    p1,
                    workspace,
                    "BIT",
                    1,
                    NOW);
            jdbc.update("UPDATE project SET deleted_at=? WHERE project_id=?", NOW, p1);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO project_key VALUES (?,?,?,?,?,?)",
                            UUID.randomUUID().toString(),
                            p2,
                            workspace,
                            "BIT",
                            1,
                            NOW))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO project_key VALUES (?,?,?,?,?,?)",
                            UUID.randomUUID().toString(),
                            p1,
                            workspace,
                            "OLD",
                            1,
                            NOW))
                    .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update(
                    "INSERT INTO board_column(board_column_id,project_id,name,position,is_final,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    column,
                    p1,
                    "Todo",
                    0,
                    0,
                    NOW,
                    user,
                    NOW,
                    user);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO work_item(work_item_id,project_id,number,title,board_column_id,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            UUID.randomUUID().toString(),
                            p2,
                            1,
                            "Task",
                            column,
                            0,
                            NOW,
                            user,
                            NOW,
                            user))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check")).isEmpty();
            assertThat(jdbc.queryForObject("PRAGMA integrity_check", String.class))
                    .isEqualTo("ok");
        }
    }
}
