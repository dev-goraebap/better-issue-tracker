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
class LabelMigrationIntegrationTest {
    private static final String NOW = "2026-10-24T00:00:00.000000Z";

    @TempDir
    Path directory;

    @Test
    void upgradesV4ByBackfillingColumnCategoriesAndSeedingOneDecisionLabelPerWorkspace() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("4").load().migrate();
        String user = UUID.randomUUID().toString();
        String w1 = UUID.randomUUID().toString();
        String w2 = UUID.randomUUID().toString();
        String p1 = UUID.randomUUID().toString();
        String p2 = UUID.randomUUID().toString();
        String deletedFirst = UUID.randomUUID().toString();
        String first = UUID.randomUUID().toString();
        String middle = UUID.randomUUID().toString();
        String finalColumn = UUID.randomUUID().toString();
        String finalFirst = UUID.randomUUID().toString();
        String afterFinal = UUID.randomUUID().toString();
        String task = UUID.randomUUID().toString();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            jdbc.update(
                    "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                    user,
                    "label-migration@example.test",
                    "Existing user",
                    NOW,
                    NOW);
            for (String workspace : new String[] {w1, w2})
                jdbc.update(
                        "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                        workspace,
                        "Existing",
                        "existing-" + workspace,
                        NOW,
                        user,
                        NOW,
                        user);
            project(jdbc, p1, w1, user);
            project(jdbc, p2, w2, user);
            column(jdbc, deletedFirst, p1, 0, false, user);
            jdbc.update("UPDATE board_column SET deleted_at=? WHERE board_column_id=?", NOW, deletedFirst);
            column(jdbc, first, p1, 1, false, user);
            column(jdbc, middle, p1, 2, false, user);
            column(jdbc, finalColumn, p1, 3, true, user);
            column(jdbc, finalFirst, p2, 0, true, user);
            column(jdbc, afterFinal, p2, 1, false, user);
            jdbc.update(
                    "INSERT INTO work_item(work_item_id,project_id,number,title,board_column_id,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    task,
                    p1,
                    1,
                    "Existing task",
                    middle,
                    0,
                    NOW,
                    user,
                    NOW,
                    user);
        }
        Flyway.configure().dataSource(url, null, null).target("5").load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            assertThat(category(jdbc, deletedFirst)).isEqualTo("doing");
            assertThat(category(jdbc, first)).isEqualTo("todo");
            assertThat(category(jdbc, middle)).isEqualTo("doing");
            assertThat(category(jdbc, finalColumn)).isEqualTo("done");
            assertThat(category(jdbc, finalFirst)).isEqualTo("done");
            assertThat(category(jdbc, afterFinal)).isEqualTo("todo");
            for (String workspace : new String[] {w1, w2}) {
                var label = jdbc.queryForMap("SELECT * FROM label WHERE workspace_id=?", workspace);
                assertThat(label.get("name")).isEqualTo("결정기록");
                assertThat(label.get("is_system")).isEqualTo(1);
                assertThat(label.get("system_key")).isEqualTo("decision");
                assertThat(label.get("created_by")).isEqualTo(user);
                assertThat((String) label.get("label_id"))
                        .matches("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
                assertThat((String) label.get("created_at"))
                        .matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{6}Z");
            }
            String decision = jdbc.queryForObject("SELECT label_id FROM label WHERE workspace_id=?", String.class, w1);
            assertThatThrownBy(() -> label(jdbc, w1, "결정기록", "#000000", user))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> label(jdbc, w1, "Bug", "red", user))
                    .isInstanceOf(DataIntegrityViolationException.class);
            label(jdbc, w1, "Bug", "#aa0000", user);
            assertThatThrownBy(() -> label(jdbc, w1, "BUG", "#aa0000", user))
                    .isInstanceOf(DataIntegrityViolationException.class);
            label(jdbc, w2, "Bug", "#aa0000", user);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO label(label_id,workspace_id,name,color,is_system,system_key,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,1,'decision',?,?,?,?)",
                            UUID.randomUUID().toString(),
                            w1,
                            "Second",
                            "#000000",
                            NOW,
                            user,
                            NOW,
                            user))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update("UPDATE label SET deleted_at=? WHERE label_id=?", NOW, decision))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() ->
                            jdbc.update("UPDATE board_column SET category='later' WHERE board_column_id=?", first))
                    .isInstanceOf(DataIntegrityViolationException.class);
            link(jdbc, task, decision, user);
            assertThatThrownBy(() -> link(jdbc, task, decision, user))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> link(jdbc, task, UUID.randomUUID().toString(), user))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check")).isEmpty();
            assertThat(jdbc.queryForObject("PRAGMA integrity_check", String.class))
                    .isEqualTo("ok");
        }
    }

    private static JdbcTemplate jdbc(java.sql.Connection connection) {
        var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
        jdbc.setExceptionTranslator(new SqliteExceptionTranslator());
        jdbc.execute("PRAGMA foreign_keys=ON");
        return jdbc;
    }

    private static void project(JdbcTemplate jdbc, String project, String workspace, String user) {
        jdbc.update(
                "INSERT INTO project(project_id,workspace_id,name,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)",
                project,
                workspace,
                "Existing project",
                0,
                NOW,
                user,
                NOW,
                user);
    }

    private static void column(JdbcTemplate jdbc, String id, String project, int position, boolean last, String user) {
        jdbc.update(
                "INSERT INTO board_column(board_column_id,project_id,name,position,is_final,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                id,
                project,
                "Column " + position,
                position,
                last ? 1 : 0,
                NOW,
                user,
                NOW,
                user);
    }

    private static String category(JdbcTemplate jdbc, String column) {
        return jdbc.queryForObject("SELECT category FROM board_column WHERE board_column_id=?", String.class, column);
    }

    private static void label(JdbcTemplate jdbc, String workspace, String name, String color, String user) {
        jdbc.update(
                "INSERT INTO label(label_id,workspace_id,name,color,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)",
                UUID.randomUUID().toString(),
                workspace,
                name,
                color,
                NOW,
                user,
                NOW,
                user);
    }

    private static void link(JdbcTemplate jdbc, String task, String label, String user) {
        jdbc.update(
                "INSERT INTO work_item_label(work_item_label_id,work_item_id,label_id,created_at,created_by) VALUES (?,?,?,?,?)",
                UUID.randomUUID().toString(),
                task,
                label,
                NOW,
                user);
    }
}
