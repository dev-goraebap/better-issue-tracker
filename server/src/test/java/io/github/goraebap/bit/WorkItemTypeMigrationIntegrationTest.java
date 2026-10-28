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

/** V27 (D-104): every workspace gets the default types and every existing task becomes 작업 within the rules. */
@Tag("integration")
class WorkItemTypeMigrationIntegrationTest {
    private static final String NOW = "2026-10-28T00:00:00.000000Z";

    @TempDir
    Path directory;

    @Test
    void upgradesV26BySeedingTheDefaultTypesAndMakingEveryTaskAWorkItemTypeThatFitsItsParent() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("26").load().migrate();
        String owner = Ids.newId();
        String first = Ids.newId();
        String second = Ids.newId();
        String project = Ids.newId();
        String parent = Ids.newId();
        String child = Ids.newId();
        String grandchild = Ids.newId();
        String event = Ids.newId();
        String alone = Ids.newId();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            jdbc.update(
                    "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                    owner,
                    "owner@example.test",
                    "Owner",
                    NOW,
                    NOW);
            for (String workspace : List.of(first, second))
                jdbc.update(
                        "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                        workspace,
                        "Existing",
                        "existing-" + workspace.toLowerCase(java.util.Locale.ROOT),
                        NOW,
                        owner,
                        NOW,
                        owner);
            jdbc.update(
                    "INSERT INTO project(project_id,workspace_id,name,position,last_work_item_number,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    project,
                    first,
                    "Existing",
                    0,
                    5,
                    NOW,
                    owner,
                    NOW,
                    owner);
            int number = 1;
            for (String task : List.of(parent, child, grandchild, alone))
                item(jdbc, task, first, project, number++, "task", null);
            item(jdbc, event, first, project, number, "event", NOW);
            link(jdbc, first, child, parent, owner);
            link(jdbc, first, grandchild, child, owner);
            // An event may sit under a task, as before; it has no type, so no rule.
            link(jdbc, first, event, parent, owner);
        }
        Flyway.configure().dataSource(url, null, null).load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            for (String workspace : List.of(first, second)) {
                var types = jdbc.queryForList(
                        "SELECT name,icon,is_default,parent_required,created_by FROM work_item_type WHERE workspace_id=? ORDER BY position",
                        workspace);
                assertThat(types.stream().map(t -> t.get("name"))).containsExactly("에픽", "스토리", "작업", "버그");
                assertThat(types.stream().map(t -> t.get("icon"))).containsExactly("epic", "story", "tasks", "bug");
                assertThat(types.stream().map(t -> t.get("is_default"))).containsExactly(0, 0, 1, 0);
                assertThat(types.stream().map(t -> t.get("parent_required"))).containsExactly(0, 1, 0, 0);
                assertThat(types)
                        .allSatisfy(t -> assertThat(t.get("created_by")).isEqualTo(owner));
                assertThat(parents(jdbc, workspace, "에픽")).isEmpty();
                assertThat(parents(jdbc, workspace, "스토리")).containsExactly("에픽");
                assertThat(parents(jdbc, workspace, "작업")).containsExactlyInAnyOrder("에픽", "스토리", "작업");
                assertThat(parents(jdbc, workspace, "버그")).containsExactlyInAnyOrder("에픽", "스토리", "작업");
            }
            assertThat(jdbc.queryForList("SELECT work_item_type_id FROM work_item_type", String.class))
                    .allSatisfy(id -> assertThat(id).matches("[A-Za-z][A-Za-z0-9]{9}"));
            assertThat(jdbc.queryForList(
                            "SELECT t.name FROM work_item w JOIN work_item_type t ON t.work_item_type_id=w.work_item_type_id WHERE w.kind='task'",
                            String.class))
                    .hasSize(4)
                    .containsOnly("작업");
            assertThat(jdbc.queryForObject(
                            "SELECT work_item_type_id FROM work_item WHERE work_item_id=?", String.class, event))
                    .isNull();
            // Every task's subtask_of parent is of a type its own type allows.
            assertThat(jdbc.queryForObject("""
                            SELECT count(*) FROM work_item w
                            JOIN link l ON l.from_id=w.work_item_id AND l.relation='subtask_of' AND l.deleted_at IS NULL
                            JOIN work_item p ON p.work_item_id=l.to_id
                            WHERE w.kind='task' AND (p.kind<>'task' OR NOT EXISTS (
                                SELECT 1 FROM work_item_type_parent a WHERE a.work_item_type_id=w.work_item_type_id
                                    AND a.parent_work_item_type_id=p.work_item_type_id))
                            """, Integer.class)).isZero();
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check")).isEmpty();
            assertThat(jdbc.queryForObject("PRAGMA integrity_check", String.class))
                    .isEqualTo("ok");

            // One default and one live name per workspace; a deleted type frees its name.
            assertThatThrownBy(() -> type(jdbc, first, "Second default", 1))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> type(jdbc, first, "에픽", 0)).isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> type(jdbc, first, "Broken", 0, "red"))
                    .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update("UPDATE work_item_type SET deleted_at=? WHERE workspace_id=? AND name='버그'", NOW, first);
            type(jdbc, first, "버그", 0);
            type(jdbc, second, "Design", 0);
        }
    }

    private static List<String> parents(JdbcTemplate jdbc, String workspace, String name) {
        return jdbc.queryForList("""
                SELECT p.name FROM work_item_type c
                JOIN work_item_type_parent a ON a.work_item_type_id=c.work_item_type_id
                JOIN work_item_type p ON p.work_item_type_id=a.parent_work_item_type_id
                WHERE c.workspace_id=? AND c.name=?
                """, String.class, workspace, name);
    }

    private static void item(
            JdbcTemplate jdbc, String id, String workspace, String project, int number, String kind, String startsAt) {
        jdbc.update(
                "INSERT INTO work_item(work_item_id,project_id,workspace_id,number,kind,title,position,starts_at,created_at,created_by,updated_at,updated_by) "
                        + "SELECT ?,?,?,?,?,?,?,?,?,iam_user_id,?,iam_user_id FROM iam_user LIMIT 1",
                id,
                project,
                workspace,
                number,
                kind,
                "Item " + number,
                number,
                startsAt,
                NOW,
                NOW);
    }

    private static void link(JdbcTemplate jdbc, String workspace, String from, String to, String owner) {
        jdbc.update(
                "INSERT INTO link(link_id,workspace_id,from_type,from_id,to_type,to_id,relation,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
                Ids.newId(),
                workspace,
                "work_item",
                from,
                "work_item",
                to,
                "subtask_of",
                NOW,
                owner);
    }

    private static void type(JdbcTemplate jdbc, String workspace, String name, int isDefault) {
        type(jdbc, workspace, name, isDefault, "#123456");
    }

    private static void type(JdbcTemplate jdbc, String workspace, String name, int isDefault, String color) {
        var owner = jdbc.queryForObject("SELECT iam_user_id FROM iam_user LIMIT 1", String.class);
        jdbc.update(
                "INSERT INTO work_item_type(work_item_type_id,workspace_id,name,color,is_default,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                Ids.newId(),
                workspace,
                name,
                color,
                isDefault,
                NOW,
                owner,
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
