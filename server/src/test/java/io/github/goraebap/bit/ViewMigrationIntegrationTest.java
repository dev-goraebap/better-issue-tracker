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
class ViewMigrationIntegrationTest {
    private static final String NOW = "2026-10-25T00:00:00.000000Z";
    private static final String USUAL = "[\"status\",\"priority\",\"assignee\",\"labels\",\"updated\"]";

    @TempDir
    Path directory;

    @Test
    void upgradesV5BySeedingTheFourStarterViewsForEveryWorkspaceInOrder() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("5").load().migrate();
        String creator = UUID.randomUUID().toString();
        String member = UUID.randomUUID().toString();
        String w1 = UUID.randomUUID().toString();
        String w2 = UUID.randomUUID().toString();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            for (String user : new String[] {creator, member})
                jdbc.update(
                        "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                        user,
                        user + "@example.test",
                        "Existing",
                        NOW,
                        NOW);
            for (String workspace : new String[] {w1, w2})
                jdbc.update(
                        "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                        workspace,
                        "Existing",
                        "existing-" + workspace,
                        NOW,
                        creator,
                        NOW,
                        member);
        }
        Flyway.configure().dataSource(url, null, null).target("6").load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            for (String workspace : new String[] {w1, w2}) {
                var views =
                        jdbc.queryForList("SELECT * FROM issue_view WHERE workspace_id=? ORDER BY position", workspace);
                assertThat(views).hasSize(4);
                assertThat(views.stream().map(v -> v.get("name"))).containsExactly("백로그", "진행 보드", "캘린더", "결정기록");
                assertThat(views.stream().map(v -> v.get("layout")))
                        .containsExactly("list", "board", "calendar", "history");
                assertThat(views.stream().map(v -> v.get("icon")))
                        .containsExactly("rows", "board", "calendar", "decision");
                assertThat(views.stream().map(v -> v.get("color")))
                        .containsExactly("#95959f", "#f2c94c", "#4cb782", "#5e6ad2");
                assertThat(views.stream().map(v -> v.get("filters")))
                        .containsExactly("{\"status\":\"none\"}", "{}", "{}", "{\"label\":\"system\"}");
                assertThat(views.stream().map(v -> v.get("sort_key") + " " + v.get("sort_direction")))
                        .containsExactly("priority asc", "updated desc", "updated desc", "updated desc");
                assertThat(views.stream().map(v -> v.get("columns")))
                        .containsExactly(USUAL, USUAL, USUAL, "[\"assignee\",\"labels\",\"updated\"]");
                for (var view : views) {
                    assertThat(view.get("owner_id")).isEqualTo(creator);
                    assertThat(view.get("created_by")).isEqualTo(creator);
                    assertThat(view.get("is_personal")).isEqualTo(0);
                    assertThat((String) view.get("issue_view_id"))
                            .matches("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
                    assertThat((String) view.get("created_at"))
                            .matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{6}Z");
                }
            }
            assertThatThrownBy(() -> view(jdbc, w1, creator, "gallery", "{}", "[]"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> view(jdbc, w1, creator, "list", "[]", "[]"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> view(jdbc, w1, creator, "list", "{}", "not json"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            view(jdbc, w1, creator, "list", "{}", "[]");
            tweak(jdbc, w1, member, "all", "{\"layout\":\"board\"}");
            assertThatThrownBy(() -> tweak(jdbc, w1, member, "all", "{}"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> tweak(jdbc, w1, member, "other", "[1]"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> tweak(jdbc, w1, UUID.randomUUID().toString(), "all", "{}"))
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

    private static void view(
            JdbcTemplate jdbc, String workspace, String user, String layout, String filters, String columns) {
        jdbc.update(
                "INSERT INTO issue_view(issue_view_id,workspace_id,owner_id,name,icon,color,layout,filters,sort_key,sort_direction,columns,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                UUID.randomUUID().toString(),
                workspace,
                user,
                "Added",
                "list",
                "#000000",
                layout,
                filters,
                "updated",
                "desc",
                columns,
                9,
                NOW,
                user,
                NOW,
                user);
    }

    private static void tweak(JdbcTemplate jdbc, String workspace, String user, String key, String body) {
        jdbc.update(
                "INSERT INTO issue_view_tweak(workspace_id,iam_user_id,view_key,tweak,updated_at) VALUES (?,?,?,?,?)",
                workspace,
                user,
                key,
                body,
                NOW);
    }
}
