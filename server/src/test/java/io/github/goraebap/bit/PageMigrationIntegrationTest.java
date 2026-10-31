package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.persistence.SqliteExceptionTranslator;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** V30 (D-113): documents gain a kind, pages their versions, and the unused artifact slot goes. */
@Tag("integration")
class PageMigrationIntegrationTest {
    private static final String NOW = "2026-10-31T00:00:00.000000Z";

    @TempDir
    Path directory;

    @Test
    void upgradesV29KeepingEveryRowAndClosingTheArtifactSlot() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("upgrade.db");
        Flyway.configure().dataSource(url, null, null).target("29").load().migrate();
        var seed = new Seed();
        try (var connection = DriverManager.getConnection(url)) {
            seed.write(jdbc(connection));
        }

        Flyway.configure().dataSource(url, null, null).load().migrate();

        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            assertThat(jdbc.queryForObject("SELECT kind FROM document WHERE document_id=?", String.class, seed.document))
                    .isEqualTo("markdown");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                    .isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM comment", Integer.class))
                    .isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM activity", Integer.class))
                    .isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM pending_upload", Integer.class))
                    .isEqualTo(1);
            assertThat(jdbc.queryForList("SELECT name FROM pragma_table_info('link')", String.class))
                    .doesNotContain("artifact_version_id", "anchor");
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check")).isEmpty();
            assertThat(jdbc.queryForObject("PRAGMA integrity_check", String.class))
                    .isEqualTo("ok");

            assertThatThrownBy(() -> jdbc.update(
                            "UPDATE link SET to_type='artifact' WHERE link_id=?", seed.link))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(
                            "UPDATE comment SET target_type='artifact' WHERE comment_id=?", seed.comment))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(
                            "UPDATE activity SET target_type='artifact' WHERE activity_id=?", seed.activity))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(
                            "UPDATE document SET kind='slides' WHERE document_id=?", seed.document))
                    .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update("UPDATE pending_upload SET purpose='page'");
        }
    }

    @Test
    void stopsWithoutDroppingARowThatStillNamesTheArtifactSlot() throws SQLException {
        String url = "jdbc:sqlite:" + directory.resolve("artifact.db");
        Flyway.configure().dataSource(url, null, null).target("29").load().migrate();
        var seed = new Seed();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            seed.write(jdbc);
            jdbc.update("UPDATE comment SET target_type='artifact' WHERE comment_id=?", seed.comment);
        }

        assertThatThrownBy(() -> Flyway.configure().dataSource(url, null, null).load().migrate())
                .isInstanceOf(FlywayException.class)
                .hasStackTraceContaining("ck_no_row_may_still_name_artifact");

        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = jdbc(connection);
            assertThat(jdbc.queryForObject("SELECT target_type FROM comment", String.class))
                    .isEqualTo("artifact");
            assertThat(jdbc.queryForList("SELECT name FROM pragma_table_info('link')", String.class))
                    .contains("artifact_version_id", "anchor");
        }
    }

    private static final class Seed {
        final String owner = Ids.newId();
        final String workspace = Ids.newId();
        final String document = Ids.newId();
        final String other = Ids.newId();
        final String link = Ids.newId();
        final String comment = Ids.newId();
        final String activity = Ids.newId();

        void write(JdbcTemplate jdbc) {
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
            for (String id : new String[] {document, other}) {
                jdbc.update(
                        "INSERT INTO document(document_id,workspace_id,title,body,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)",
                        id,
                        workspace,
                        "Notes",
                        "body",
                        NOW,
                        owner,
                        NOW,
                        owner);
            }
            jdbc.update(
                    "INSERT INTO link(link_id,workspace_id,from_type,from_id,to_type,to_id,relation,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    link,
                    workspace,
                    "document",
                    document,
                    "document",
                    other,
                    "references",
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO comment(comment_id,workspace_id,target_type,target_id,body,created_at,created_by,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    comment,
                    workspace,
                    "document",
                    document,
                    "Looks right",
                    NOW,
                    owner,
                    NOW,
                    owner);
            jdbc.update(
                    "INSERT INTO activity(activity_id,workspace_id,target_type,target_id,type,actor_id,occurred_at) VALUES (?,?,?,?,?,?,?)",
                    activity,
                    workspace,
                    "document",
                    document,
                    "created",
                    owner,
                    NOW);
            jdbc.update(
                    "INSERT INTO pending_upload(pending_upload_id,blob_id,storage_key,purpose,filename,content_type,byte_size,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
                    Ids.newId(),
                    Ids.newId(),
                    "uploads/2026/10/x.zip",
                    "attachment",
                    "x.zip",
                    "application/zip",
                    10,
                    NOW,
                    owner);
        }
    }

    private static JdbcTemplate jdbc(java.sql.Connection connection) {
        var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
        jdbc.setExceptionTranslator(new SqliteExceptionTranslator());
        jdbc.execute("PRAGMA foreign_keys=ON");
        return jdbc;
    }
}
