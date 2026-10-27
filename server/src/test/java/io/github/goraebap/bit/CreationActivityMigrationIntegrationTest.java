package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@Tag("integration")
class CreationActivityMigrationIntegrationTest {
    @TempDir
    Path directory;

    @Test
    void recoversMissingDocumentCreationFromItsAuditWithoutDuplicatingExistingEvents() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("creation.db");
        Flyway.configure().dataSource(url, null, null).target("20").load().migrate();
        String at = "2026-10-26T01:02:03.000000Z";
        try (var connection = DriverManager.getConnection(url)) {
            insert(
                    connection,
                    "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                    "user000001",
                    "audit@example.test",
                    "Author",
                    at,
                    at);
            insert(
                    connection,
                    "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)",
                    "space00001",
                    "Audit",
                    "audit",
                    at,
                    "user000001",
                    at,
                    "user000001");
            for (String id : java.util.List.of("doc0000001", "doc0000002"))
                insert(
                        connection,
                        "INSERT INTO document(document_id,workspace_id,title,body,created_at,created_by,created_by_agent,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                        id,
                        "space00001",
                        "Imported",
                        "Body",
                        at,
                        "user000001",
                        "codex",
                        at,
                        "user000001");
            insert(
                    connection,
                    "INSERT INTO activity(activity_id,workspace_id,target_type,target_id,type,actor_id,actor_agent,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
                    "event00001",
                    "space00001",
                    "document",
                    "doc0000002",
                    "created",
                    "user000001",
                    "codex",
                    at);
        }
        Flyway.configure().dataSource(url, null, null).load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var statement = connection.createStatement()) {
            try (var rows = statement.executeQuery(
                    "SELECT target_id,actor_id,actor_agent,occurred_at FROM activity WHERE type='created' ORDER BY target_id")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("doc0000001");
                assertThat(rows.getString(2)).isEqualTo("user000001");
                assertThat(rows.getString(3)).isEqualTo("codex");
                assertThat(rows.getString(4)).isEqualTo(at);
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("doc0000002");
                assertThat(rows.next()).isFalse();
            }
        }
    }

    private void insert(java.sql.Connection connection, String sql, Object... values) throws java.sql.SQLException {
        try (var statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
            statement.executeUpdate();
        }
    }
}
