package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.SqliteExceptionTranslator;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

@Tag("integration")
class IdMigrationIntegrationTest {
    private static final String NOW = "2026-10-26T00:00:00.000000Z";
    private static final int ITEMS = 8;

    @TempDir
    Path directory;

    @Test
    void upgradesV8ByGivingEveryIdAndEveryReferenceToItTheSameShortId() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("8").load().migrate();
        String owner = uuid();
        String member = uuid();
        String workspace = uuid();
        String project = uuid();
        String todo = uuid();
        String done = uuid();
        String bug = uuid();
        String idea = uuid();
        String view = uuid();
        String comment = uuid();
        String change = uuid();
        var items = new ArrayList<String>();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            for (String user : List.of(owner, member)) {
                jdbc.update(
                        "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                        user,
                        (user.equals(owner) ? "owner" : "member") + "@example.test",
                        "Existing",
                        NOW,
                        NOW);
                jdbc.update(
                        "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES (?,?,?)",
                        user,
                        "unchanged-hash",
                        NOW);
            }
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
                    "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES (?,?,?,?,?)",
                    uuid(),
                    workspace,
                    owner,
                    "owner",
                    NOW);
            jdbc.update(
                    "INSERT INTO iam_session(iam_session_id,iam_user_id,token_hash,active_workspace_id,expires_at,absolute_expires_at,last_seen_at,created_at) VALUES (?,?,?,?,?,?,?,?)",
                    uuid(),
                    owner,
                    "session-hash",
                    workspace,
                    NOW,
                    NOW,
                    NOW,
                    NOW);
            jdbc.update(
                    "INSERT INTO project(project_id,workspace_id,name,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)",
                    project,
                    workspace,
                    "Existing",
                    0,
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update("INSERT INTO project_key VALUES (?,?,?,?,?,?)", uuid(), project, workspace, "BIT", 1, NOW);
            for (String column : List.of(todo, done))
                jdbc.update(
                        "INSERT INTO board_column(board_column_id,project_id,name,position,is_final,category,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        column,
                        project,
                        column.equals(todo) ? "할 일" : "완료",
                        column.equals(todo) ? 0 : 1,
                        column.equals(todo) ? 0 : 1,
                        column.equals(todo) ? "todo" : "done",
                        NOW,
                        owner,
                        NOW,
                        owner);
            for (String label : List.of(bug, idea))
                jdbc.update(
                        "INSERT INTO label(label_id,workspace_id,name,color,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)",
                        label,
                        workspace,
                        label.equals(bug) ? "버그" : "생각",
                        "#5e6ad2",
                        NOW,
                        owner,
                        NOW,
                        owner);
            for (int number = 1; number <= ITEMS; number++) {
                String item = uuid();
                items.add(item);
                jdbc.update(
                        "INSERT INTO work_item(work_item_id,project_id,number,title,board_column_id,position,assignee_id,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        item,
                        project,
                        number,
                        "Item " + number,
                        todo,
                        number,
                        member,
                        NOW,
                        owner,
                        NOW,
                        owner);
                jdbc.update(
                        "INSERT INTO work_item_label(work_item_label_id,work_item_id,label_id,created_at,created_by) VALUES (?,?,?,?,?)",
                        uuid(),
                        item,
                        bug,
                        NOW,
                        owner);
            }
            // Related-to links keep their ends in text order; the new ids reorder some of these pairs.
            for (int i = 1; i < items.size(); i++) {
                String a = items.get(i - 1);
                String b = items.get(i);
                jdbc.update(
                        "INSERT INTO link(link_id,workspace_id,from_type,from_id,to_type,to_id,relation,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
                        uuid(),
                        workspace,
                        "work_item",
                        a.compareTo(b) < 0 ? a : b,
                        "work_item",
                        a.compareTo(b) < 0 ? b : a,
                        "relates_to",
                        NOW,
                        owner);
            }
            jdbc.update(
                    "INSERT INTO comment(comment_id,workspace_id,target_type,target_id,body,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    comment,
                    workspace,
                    "work_item",
                    items.getFirst(),
                    "Existing comment",
                    NOW,
                    member,
                    NOW,
                    member);
            activity(jdbc, workspace, project, items.getFirst(), "{\"commentId\":\"" + comment + "\",\"version\":0}");
            activity(jdbc, workspace, project, items.getFirst(), change(change, "column", todo, done));
            activity(jdbc, workspace, project, items.getFirst(), change(change, "labels", bug, bug + "," + idea));
            activity(jdbc, workspace, project, items.getFirst(), change(change, "assignee", null, member));
            jdbc.update(
                    "INSERT INTO issue_view(issue_view_id,workspace_id,owner_id,name,icon,color,layout,filters,sort_key,sort_direction,columns,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    view,
                    workspace,
                    owner,
                    "Mine",
                    "rows",
                    "#95959f",
                    "list",
                    "{\"assignee\":\"" + member + "\",\"label\":\"" + bug + ",system\"}",
                    "updated",
                    "desc",
                    "[\"status\"]",
                    0,
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO issue_view_tweak(workspace_id,iam_user_id,view_key,tweak,updated_at) VALUES (?,?,?,?,?)",
                    workspace,
                    member,
                    view,
                    "{}",
                    NOW);
        }
        Flyway.configure().dataSource(url, null, null).load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            String newOwner = id(jdbc, "SELECT iam_user_id FROM iam_user WHERE email='owner@example.test'");
            String newMember = id(jdbc, "SELECT iam_user_id FROM iam_user WHERE email='member@example.test'");
            String newWorkspace = id(jdbc, "SELECT workspace_id FROM workspace WHERE slug='existing'");
            String newTodo = id(jdbc, "SELECT board_column_id FROM board_column WHERE name='할 일'");
            String newDone = id(jdbc, "SELECT board_column_id FROM board_column WHERE name='완료'");
            String newBug = id(jdbc, "SELECT label_id FROM label WHERE name='버그'");
            String newIdea = id(jdbc, "SELECT label_id FROM label WHERE name='생각'");
            String first = id(jdbc, "SELECT work_item_id FROM work_item WHERE number=1");
            String newComment = id(jdbc, "SELECT comment_id FROM comment");
            String newView = id(jdbc, "SELECT issue_view_id FROM issue_view");

            assertThat(jdbc.queryForObject(
                            "SELECT password_hash FROM iam_password WHERE iam_user_id=?", String.class, newOwner))
                    .isEqualTo("unchanged-hash");
            assertThat(jdbc.queryForObject("SELECT active_workspace_id FROM iam_session", String.class))
                    .isEqualTo(newWorkspace);
            assertThat(jdbc.queryForObject(
                            "SELECT count(*) FROM work_item WHERE board_column_id=? AND assignee_id=? AND created_by=?",
                            Integer.class,
                            newTodo,
                            newMember,
                            newOwner))
                    .isEqualTo(ITEMS);
            assertThat(jdbc.queryForObject(
                            "SELECT count(*) FROM work_item_label WHERE label_id=?", Integer.class, newBug))
                    .isEqualTo(ITEMS);
            assertThat(jdbc.queryForList(
                            "SELECT abs(a.number-b.number) FROM link l JOIN work_item a ON a.work_item_id=l.from_id JOIN work_item b ON b.work_item_id=l.to_id",
                            Integer.class))
                    .hasSize(ITEMS - 1)
                    .containsOnly(1);
            assertThat(jdbc.queryForObject("SELECT target_id FROM comment", String.class))
                    .isEqualTo(first);
            assertThat(jdbc.queryForList("SELECT DISTINCT target_id FROM activity", String.class))
                    .containsExactly(first);
            var payloads = jdbc.queryForList("SELECT payload FROM activity ORDER BY rowid", String.class);
            assertThat(payloads.get(0)).isEqualTo("{\"commentId\":\"" + newComment + "\",\"version\":0}");
            String newChange = payloads.get(1).replaceAll(".*\"changeId\":\"([^\"]+)\".*", "$1");
            assertThat(newChange).matches(Ids.PATTERN);
            assertThat(payloads.subList(1, 4)).allSatisfy(p -> assertThat(p).contains("\"changeId\":\"" + newChange));
            assertThat(payloads.get(1))
                    .contains("\"beforeLength\":10,\"afterLength\":10,\"before\":\"" + newTodo + "\",\"after\":\""
                            + newDone + "\"");
            assertThat(payloads.get(2))
                    .contains("\"beforeLength\":10,\"afterLength\":21,\"before\":\"" + newBug + "\",\"after\":\""
                            + newBug + "," + newIdea + "\"");
            assertThat(payloads.get(3))
                    .contains("\"beforeLength\":-1,\"afterLength\":10,\"before\":null,\"after\":\"" + newMember + "\"");
            assertThat(jdbc.queryForObject("SELECT filters FROM issue_view", String.class))
                    .isEqualTo("{\"assignee\":\"" + newMember + "\",\"label\":\"" + newBug + ",system\"}");
            assertThat(jdbc.queryForObject("SELECT view_key FROM issue_view_tweak", String.class))
                    .isEqualTo(newView);

            for (var column : jdbc.queryForList(
                    "SELECT m.name AS tbl, p.name AS col FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND p.type='uuid'")) {
                String table = (String) column.get("tbl");
                String name = (String) column.get("col");
                assertThat(jdbc.queryForList(
                                "SELECT " + name + " FROM " + table + " WHERE " + name + " IS NOT NULL", String.class))
                        .as("%s.%s", table, name)
                        .allSatisfy(value -> assertThat(value).matches(Ids.PATTERN));
            }
            assertThat(jdbc.queryForObject("SELECT count(*) FROM temp.sqlite_master", Integer.class))
                    .isZero();
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check")).isEmpty();
            assertThat(jdbc.queryForObject("PRAGMA integrity_check", String.class))
                    .isEqualTo("ok");
        }
    }

    private static String uuid() {
        return UUID.randomUUID().toString();
    }

    private static String id(JdbcTemplate jdbc, String sql) {
        String id = jdbc.queryForObject(sql, String.class);
        assertThat(id).matches(Ids.PATTERN);
        return id;
    }

    private static String change(String change, String field, String before, String after) {
        return "{\"version\":1,\"changeId\":\"" + change + "\",\"field\":\"" + field
                + "\",\"part\":0,\"parts\":1,\"beforeLength\":" + (before == null ? -1 : before.length())
                + ",\"afterLength\":" + after.length() + ",\"before\":"
                + (before == null ? "null" : "\"" + before + "\"")
                + ",\"after\":\"" + after + "\"}";
    }

    private static void activity(JdbcTemplate jdbc, String workspace, String project, String target, String payload) {
        jdbc.update(
                "INSERT INTO activity(activity_id,workspace_id,project_id,target_type,target_id,type,payload,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
                uuid(),
                workspace,
                project,
                "work_item",
                target,
                "changed",
                payload,
                NOW);
    }

    private static JdbcTemplate jdbc(java.sql.Connection connection) {
        var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
        jdbc.setExceptionTranslator(new SqliteExceptionTranslator());
        jdbc.execute("PRAGMA foreign_keys=ON");
        return jdbc;
    }
}
