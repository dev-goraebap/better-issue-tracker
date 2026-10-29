package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.SqliteExceptionTranslator;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** V29 (D-111): every project gains 백로그 first and 취소 last, and every task has a status. */
@Tag("integration")
class StatusCategoryMigrationIntegrationTest {
    private static final String NOW = "2026-10-29T00:00:00.000000Z";

    @TempDir
    Path directory;

    @Test
    void upgradesV28ByAddingTheBacklogAndCanceledColumnsAndGivingEveryTaskAStatus() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("28").load().migrate();
        String owner = Ids.newId();
        String workspace = Ids.newId();
        String project = Ids.newId();
        String todo = Ids.newId();
        String doing = Ids.newId();
        String done = Ids.newId();
        String loose = Ids.newId();
        String placed = Ids.newId();
        String homeless = Ids.newId();
        String finished = Ids.newId();
        String event = Ids.newId();
        String view = Ids.newId();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            jdbc.update(
                    "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                    owner,
                    "owner@example.test",
                    "Owner",
                    NOW,
                    NOW);
            jdbc.update(
                    "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                    workspace,
                    "Existing",
                    "existing",
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO project(project_id,workspace_id,name,position,last_work_item_number,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    project,
                    workspace,
                    "Existing",
                    0,
                    3,
                    NOW,
                    owner,
                    NOW,
                    owner);
            column(jdbc, todo, project, "할 일", 0, false, "todo");
            column(jdbc, doing, project, "진행 중", 1, false, "doing");
            column(jdbc, done, project, "완료", 2, true, "done");
            item(jdbc, loose, workspace, project, 1, "task", null, null, null);
            item(jdbc, placed, workspace, project, 2, "task", doing, null, null);
            item(jdbc, event, workspace, project, 3, "event", null, null, NOW);
            item(jdbc, homeless, workspace, null, 4, "task", null, null, null);
            item(jdbc, finished, workspace, null, 5, "task", null, "done", null);
            jdbc.update(
                    "INSERT INTO work_item_view(work_item_view_id,workspace_id,owner_id,name,icon,color,layout,filters,sort_key,sort_direction,columns,position,created_at,created_by,updated_at,updated_by) "
                            + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    view,
                    workspace,
                    owner,
                    "Waiting",
                    "inbox",
                    "#123456",
                    "list",
                    "{\"status\":\"todo,none\"}",
                    "updated",
                    "desc",
                    "[]",
                    0,
                    NOW,
                    owner,
                    NOW,
                    owner);
        }
        Flyway.configure().dataSource(url, null, null).load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            var columns = jdbc.queryForList(
                    "SELECT board_column_id,name,category,is_final,created_by FROM board_column WHERE project_id=? ORDER BY position",
                    project);
            assertThat(columns.stream().map(c -> c.get("name"))).containsExactly("백로그", "할 일", "진행 중", "완료", "취소");
            assertThat(columns.stream().map(c -> c.get("category")))
                    .containsExactly("backlog", "todo", "doing", "done", "canceled");
            assertThat(columns.stream().map(c -> c.get("is_final"))).containsExactly(0, 0, 0, 1, 1);
            assertThat(columns).allSatisfy(c -> assertThat(c.get("created_by")).isEqualTo(owner));
            assertThat(jdbc.queryForList("SELECT board_column_id FROM board_column", String.class))
                    .allSatisfy(id -> assertThat(id).matches("[A-Za-z][A-Za-z0-9]{9}"));
            String backlog = (String) columns.getFirst().get("board_column_id");

            assertThat(column(jdbc, loose)).isEqualTo(backlog);
            assertThat(column(jdbc, placed)).isEqualTo(doing);
            assertThat(column(jdbc, event)).isNull();
            assertThat(status(jdbc, homeless)).isEqualTo("backlog");
            assertThat(status(jdbc, finished)).isEqualTo("done");
            assertThat(status(jdbc, event)).isNull();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM work_item", Integer.class))
                    .isEqualTo(5);
            assertThat(jdbc.queryForObject(
                            "SELECT json_extract(filters,'$.status') FROM work_item_view WHERE work_item_view_id=?",
                            String.class,
                            view))
                    .isEqualTo("todo,backlog");
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check")).isEmpty();
            assertThat(jdbc.queryForObject("PRAGMA integrity_check", String.class))
                    .isEqualTo("ok");

            // From here a task always has a status, and a canceled column always closes.
            assertThatThrownBy(() -> item(jdbc, Ids.newId(), workspace, project, 6, "task", null, null, null))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> item(jdbc, Ids.newId(), workspace, null, 7, "task", null, null, null))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> column(jdbc, Ids.newId(), project, "보류", 5, false, "canceled"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> column(jdbc, Ids.newId(), project, "닫힘", 5, true, "doing"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            item(jdbc, Ids.newId(), workspace, null, 8, "task", null, "canceled", null);
        }
    }

    private static String column(JdbcTemplate jdbc, String item) {
        return jdbc.queryForObject("SELECT board_column_id FROM work_item WHERE work_item_id=?", String.class, item);
    }

    private static String status(JdbcTemplate jdbc, String item) {
        return jdbc.queryForObject("SELECT workspace_status FROM work_item WHERE work_item_id=?", String.class, item);
    }

    private static void column(
            JdbcTemplate jdbc, String id, String project, String name, int position, boolean closing, String category) {
        jdbc.update(
                "INSERT INTO board_column(board_column_id,project_id,name,position,is_final,category,created_at,created_by,updated_at,updated_by) "
                        + "SELECT ?,?,?,?,?,?,?,iam_user_id,?,iam_user_id FROM iam_user LIMIT 1",
                id,
                project,
                name,
                position,
                closing ? 1 : 0,
                category,
                NOW,
                NOW);
    }

    private static void item(
            JdbcTemplate jdbc,
            String id,
            String workspace,
            String project,
            int number,
            String kind,
            String column,
            String status,
            String startsAt) {
        jdbc.update(
                "INSERT INTO work_item(work_item_id,project_id,workspace_id,number,kind,title,position,board_column_id,workspace_status,starts_at,closed_at,created_at,created_by,updated_at,updated_by) "
                        + "SELECT ?,?,?,?,?,?,?,?,?,?,?,?,iam_user_id,?,iam_user_id FROM iam_user LIMIT 1",
                id,
                project,
                workspace,
                number,
                kind,
                "Item " + number,
                number,
                column,
                status,
                startsAt,
                "done".equals(status) || "canceled".equals(status) ? NOW : null,
                NOW,
                NOW);
    }

    private static JdbcTemplate jdbc(java.sql.Connection connection) {
        var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
        jdbc.setExceptionTranslator(new SqliteExceptionTranslator());
        jdbc.execute("PRAGMA foreign_keys=ON");
        return jdbc;
    }
}
