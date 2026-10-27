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
class WorkItemMigrationIntegrationTest {
    private static final String NOW = "2026-10-26T00:00:00.000000Z";

    @TempDir
    Path directory;

    @Test
    void upgradesV13ByCallingIssuesWorkItemsInEveryTableColumnAndTargetType() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("13").load().migrate();
        String owner = Ids.newId();
        String workspace = Ids.newId();
        String project = Ids.newId();
        String todo = Ids.newId();
        String bug = Ids.newId();
        String first = Ids.newId();
        String second = Ids.newId();
        String session = Ids.newId();
        String sessionLink = Ids.newId();
        String view = Ids.newId();
        String integration = Ids.newId();
        String blob = Ids.newId();
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
                    "INSERT INTO project(project_id,workspace_id,name,position,last_issue_number,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
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
                        "INSERT INTO issue(issue_id,project_id,number,title,board_column_id,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
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
                        "INSERT INTO issue_label(issue_label_id,issue_id,label_id,created_at,created_by) VALUES (?,?,?,?,?)",
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
            // Before V14 'issue' sorts before 'session_record', so the issue is the from end.
            link(jdbc, sessionLink, workspace, "issue", first, "session_record", session, owner);
            boolean ordered = first.compareTo(second) < 0;
            link(
                    jdbc,
                    Ids.newId(),
                    workspace,
                    "issue",
                    ordered ? first : second,
                    "issue",
                    ordered ? second : first,
                    owner);
            jdbc.update(
                    "INSERT INTO comment(comment_id,workspace_id,target_type,target_id,body,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    Ids.newId(),
                    workspace,
                    "issue",
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
                    "issue",
                    first,
                    "created",
                    NOW);
            jdbc.update(
                    "INSERT INTO blob(blob_id,storage_key,filename,content_type,byte_size,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    blob,
                    "files/" + blob,
                    "log.txt",
                    "text/plain",
                    10,
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO attachment(attachment_id,blob_id,owner_type,owner_id,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)",
                    Ids.newId(),
                    blob,
                    "issue",
                    first,
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO issue_view(issue_view_id,workspace_id,owner_id,name,icon,color,layout,filters,sort_key,sort_direction,columns,position,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    view,
                    workspace,
                    owner,
                    "Bugs",
                    "list",
                    "#5e6ad2",
                    "list",
                    "{}",
                    "updated",
                    "desc",
                    "[]",
                    0.5,
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO issue_view_tweak(workspace_id,iam_user_id,view_key,tweak,updated_at) VALUES (?,?,?,?,?)",
                    workspace,
                    owner,
                    view,
                    "{\"layout\":\"board\"}",
                    NOW);
            jdbc.update(
                    "INSERT INTO issue_view_order(workspace_id,scope,view_keys,updated_at,updated_by) VALUES (?,?,?,?,?)",
                    workspace,
                    "home",
                    "[\"" + view + "\",\"all\"]",
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO repository_integration(repository_integration_id,workspace_id,project_id,provider,base_url,repository,web_url,token_cipher,webhook_secret_cipher,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    integration,
                    workspace,
                    project,
                    "github",
                    "https://api.github.com",
                    "acme/app",
                    "https://github.com/acme/app",
                    "token",
                    "secret",
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO code_link(code_link_id,repository_integration_id,issue_id,kind,external_id,url,title,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    Ids.newId(),
                    integration,
                    first,
                    "issue",
                    "5",
                    "https://github.com/acme/app/issues/5",
                    "First",
                    "open",
                    NOW,
                    NOW);
        }
        Flyway.configure().dataSource(url, null, null).load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            // A repository's own issues keep their name; BIT's are work items everywhere else.
            assertThat(jdbc.queryForList(
                            "SELECT name FROM sqlite_master WHERE name LIKE '%issue%' OR (sql LIKE '%issue%' AND name NOT IN ('code_link','integration_rule','repository_integration'))",
                            String.class))
                    .isEmpty();
            assertThat(jdbc.queryForList("SELECT title FROM work_item ORDER BY number", String.class))
                    .containsExactly("First", "Second");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM work_item_label WHERE label_id=?", Integer.class, bug))
                    .isEqualTo(2);
            assertThat(jdbc.queryForObject(
                            "SELECT last_work_item_number FROM project WHERE project_id=?", Integer.class, project))
                    .isEqualTo(2);
            assertThat(jdbc.queryForObject("SELECT target_type FROM comment", String.class))
                    .isEqualTo("work_item");
            assertThat(jdbc.queryForList("SELECT target_type FROM activity", String.class))
                    .containsOnly("work_item");
            assertThat(jdbc.queryForObject("SELECT owner_type FROM attachment", String.class))
                    .isEqualTo("work_item");
            assertThat(jdbc.queryForMap("SELECT work_item_id,kind FROM code_link"))
                    .containsEntry("work_item_id", first)
                    .containsEntry("kind", "issue");
            assertThat(jdbc.queryForObject(
                            "SELECT position FROM work_item_view WHERE work_item_view_id=?", Double.class, view))
                    .isEqualTo(0.5);
            assertThat(jdbc.queryForObject("SELECT view_key FROM work_item_view_tweak", String.class))
                    .isEqualTo(view);
            assertThat(jdbc.queryForObject("SELECT view_keys FROM work_item_view_order", String.class))
                    .isEqualTo("[\"" + view + "\",\"all\"]");
            // 'work_item' sorts after 'session_record', so the session link starts at the session again.
            assertThat(jdbc.queryForMap(
                            "SELECT from_type,from_id,to_type,to_id FROM link WHERE link_id=?", sessionLink))
                    .containsEntry("from_type", "session_record")
                    .containsEntry("from_id", session)
                    .containsEntry("to_type", "work_item")
                    .containsEntry("to_id", first);
            assertThat(jdbc.queryForObject(
                            "SELECT count(*) FROM link WHERE from_type='work_item' AND to_type='work_item'",
                            Integer.class))
                    .isEqualTo(1);
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check", java.util.Map.class))
                    .isEmpty();
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO comment(comment_id,workspace_id,target_type,target_id,body,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                            Ids.newId(),
                            workspace,
                            "issue",
                            first,
                            "Old type",
                            NOW,
                            owner,
                            NOW,
                            owner))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO code_link(code_link_id,repository_integration_id,work_item_id,kind,external_id,url,title,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            Ids.newId(),
                            integration,
                            Ids.newId(),
                            "branch",
                            "main",
                            "https://github.com/acme/app/tree/main",
                            "main",
                            "open",
                            NOW,
                            NOW))
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
