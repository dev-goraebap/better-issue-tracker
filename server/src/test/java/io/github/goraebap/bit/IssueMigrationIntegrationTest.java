package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.SqliteExceptionTranslator;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

@Tag("integration")
class IssueMigrationIntegrationTest {
    private static final String NOW = "2026-10-26T00:00:00.000000Z";

    @TempDir
    Path directory;

    @Test
    void upgradesV9ByCallingWorkItemsIssuesInEveryTableColumnAndTargetType() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("9").load().migrate();
        String owner = Ids.newId();
        String workspace = Ids.newId();
        String project = Ids.newId();
        String todo = Ids.newId();
        String bug = Ids.newId();
        String first = Ids.newId();
        String second = Ids.newId();
        String session = Ids.newId();
        String sessionLink = Ids.newId();
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
                    2,
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO board_column(board_column_id,project_id,name,position,is_final,category,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    todo,
                    project,
                    "할 일",
                    0,
                    0,
                    "todo",
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO label(label_id,workspace_id,name,color,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)",
                    bug,
                    workspace,
                    "버그",
                    "#5e6ad2",
                    NOW,
                    owner,
                    NOW,
                    owner);
            for (String item : List.of(first, second)) {
                jdbc.update(
                        "INSERT INTO work_item(work_item_id,project_id,number,title,board_column_id,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        item,
                        project,
                        item.equals(first) ? 1 : 2,
                        item.equals(first) ? "First" : "Second",
                        todo,
                        item.equals(first) ? 1 : 2,
                        NOW,
                        owner,
                        NOW,
                        owner);
                jdbc.update(
                        "INSERT INTO work_item_label(work_item_label_id,work_item_id,label_id,created_at,created_by) VALUES (?,?,?,?,?)",
                        Ids.newId(),
                        item,
                        bug,
                        NOW,
                        owner);
            }
            jdbc.update(
                    "INSERT INTO session_record(session_record_id,project_id,number,type,title,summary,occurred_at,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    session,
                    project,
                    1,
                    "meeting",
                    "Planning",
                    "Summary",
                    NOW,
                    NOW,
                    owner,
                    NOW,
                    owner);
            // Before V10 'session_record' sorts before 'work_item', so the session is the from end.
            link(jdbc, sessionLink, workspace, "session_record", session, "work_item", first, owner);
            boolean ordered = first.compareTo(second) < 0;
            link(
                    jdbc,
                    Ids.newId(),
                    workspace,
                    "work_item",
                    ordered ? first : second,
                    "work_item",
                    ordered ? second : first,
                    owner);
            jdbc.update(
                    "INSERT INTO comment(comment_id,workspace_id,target_type,target_id,body,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    Ids.newId(),
                    workspace,
                    "work_item",
                    first,
                    "Existing comment",
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO activity(activity_id,workspace_id,project_id,target_type,target_id,type,occurred_at) VALUES (?,?,?,?,?,?,?)",
                    Ids.newId(),
                    workspace,
                    project,
                    "work_item",
                    first,
                    "created",
                    NOW);
        }
        Flyway.configure().dataSource(url, null, null).target("10").load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            assertThat(jdbc.queryForList(
                            "SELECT name FROM sqlite_master WHERE name LIKE '%work_item%' OR sql LIKE '%work_item%'",
                            String.class))
                    .isEmpty();
            assertThat(jdbc.queryForList("SELECT title FROM issue ORDER BY number", String.class))
                    .containsExactly("First", "Second");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM issue_label WHERE label_id=?", Integer.class, bug))
                    .isEqualTo(2);
            assertThat(jdbc.queryForObject(
                            "SELECT last_issue_number FROM project WHERE project_id=?", Integer.class, project))
                    .isEqualTo(2);
            assertThat(jdbc.queryForObject("SELECT target_type FROM comment", String.class))
                    .isEqualTo("issue");
            assertThat(jdbc.queryForObject("SELECT target_type FROM activity", String.class))
                    .isEqualTo("issue");
            // 'issue' sorts before 'session_record', so the session link now starts at the issue.
            assertThat(jdbc.queryForMap(
                            "SELECT from_type,from_id,to_type,to_id FROM link WHERE link_id=?", sessionLink))
                    .containsEntry("from_type", "issue")
                    .containsEntry("from_id", first)
                    .containsEntry("to_type", "session_record")
                    .containsEntry("to_id", session);
            assertThat(jdbc.queryForObject(
                            "SELECT count(*) FROM link WHERE from_type='issue' AND to_type='issue'", Integer.class))
                    .isEqualTo(1);
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check", java.util.Map.class))
                    .isEmpty();
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO comment(comment_id,workspace_id,target_type,target_id,body,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                            Ids.newId(),
                            workspace,
                            "work_item",
                            first,
                            "Old type",
                            NOW,
                            owner,
                            NOW,
                            owner))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO issue_label(issue_label_id,issue_id,label_id,created_at,created_by) VALUES (?,?,?,?,?)",
                            Ids.newId(),
                            Ids.newId(),
                            bug,
                            NOW,
                            owner))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }
    }

    private static void link(
            JdbcTemplate jdbc,
            String id,
            String workspace,
            String fromType,
            String fromId,
            String toType,
            String toId,
            String owner) {
        jdbc.update(
                "INSERT INTO link(link_id,workspace_id,from_type,from_id,to_type,to_id,relation,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
                id,
                workspace,
                fromType,
                fromId,
                toType,
                toId,
                "relates_to",
                NOW,
                owner);
    }

    private static JdbcTemplate jdbc(java.sql.Connection connection) {
        var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
        jdbc.setExceptionTranslator(new SqliteExceptionTranslator());
        jdbc.execute("PRAGMA foreign_keys=ON");
        return jdbc;
    }
}
