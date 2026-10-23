package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.persistence.SqliteExceptionTranslator;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

@Tag("integration")
class DecisionMigrationIntegrationTest {
    private static final String NOW = "2026-10-23T00:00:00.000000Z";

    @TempDir
    Path directory;

    @Test
    void upgradePreservesV3DataAndEnforcesTraceabilityConstraints() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("v4.db");
        Flyway.configure().dataSource(url, null, null).target("3").load().migrate();
        String user = UUID.randomUUID().toString();
        String workspace = UUID.randomUUID().toString();
        String project = UUID.randomUUID().toString();
        String item = UUID.randomUUID().toString();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
            jdbc.update(
                    "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES(?,?,?,?,?)",
                    user,
                    "v4@example.test",
                    "Existing owner",
                    NOW,
                    NOW);
            jdbc.update(
                    "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES(?,?,?)",
                    user,
                    "unchanged-v3-hash",
                    NOW);
            jdbc.update(
                    "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?)",
                    workspace,
                    "Old workspace",
                    "old",
                    NOW,
                    user,
                    NOW,
                    user);
            jdbc.update(
                    "INSERT INTO project(project_id,workspace_id,name,position,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?)",
                    project,
                    workspace,
                    "Old project",
                    0,
                    NOW,
                    user,
                    NOW,
                    user);
            jdbc.update(
                    "INSERT INTO work_item(work_item_id,project_id,number,title,position,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?)",
                    item,
                    project,
                    1,
                    "Existing item",
                    0,
                    NOW,
                    user,
                    NOW,
                    user);
        }
        Flyway.configure().dataSource(url, null, null).target("4").load().migrate();
        try (var connection = DriverManager.getConnection(url)) {
            var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
            jdbc.setExceptionTranslator(new SqliteExceptionTranslator());
            jdbc.execute("PRAGMA foreign_keys=ON");
            assertThat(jdbc.queryForObject(
                            "SELECT password_hash FROM iam_password WHERE iam_user_id=?", String.class, user))
                    .isEqualTo("unchanged-v3-hash");
            assertThat(jdbc.queryForObject("SELECT title FROM work_item WHERE work_item_id=?", String.class, item))
                    .isEqualTo("Existing item");
            String decision = UUID.randomUUID().toString();
            String replacement = UUID.randomUUID().toString();
            for (String id : new String[] {decision, replacement})
                jdbc.update(
                        "INSERT INTO decision(decision_id,project_id,number,title,body,status,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?)",
                        id,
                        project,
                        id.equals(decision) ? 1 : 2,
                        "Title",
                        "Why",
                        "proposed",
                        NOW,
                        user,
                        NOW,
                        user);
            assertThatThrownBy(() -> jdbc.update("UPDATE decision SET status='accepted' WHERE decision_id=?", decision))
                    .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update("UPDATE decision SET status='accepted',accepted_at=? WHERE decision_id=?", NOW, decision);
            assertThatThrownBy(() -> jdbc.update("UPDATE decision SET number=1 WHERE decision_id=?", replacement))
                    .isInstanceOf(DataIntegrityViolationException.class);
            String edge = UUID.randomUUID().toString();
            jdbc.update(
                    "INSERT INTO link(link_id,workspace_id,from_type,from_id,to_type,to_id,relation,created_at,created_by) VALUES(?,?,'decision',?,'decision',?,'supersedes',?,?)",
                    edge,
                    workspace,
                    replacement,
                    decision,
                    NOW,
                    user);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO link(link_id,workspace_id,from_type,from_id,to_type,to_id,relation,created_at,created_by) VALUES(?,?,'decision',?,'decision',?,'supersedes',?,?)",
                            UUID.randomUUID().toString(),
                            workspace,
                            UUID.randomUUID().toString(),
                            decision,
                            NOW,
                            user))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update("UPDATE link SET to_id=from_id WHERE link_id=?", edge))
                    .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update("UPDATE link SET deleted_at=?,deleted_by=? WHERE link_id=?", NOW, user, edge);
            jdbc.update(
                    "INSERT INTO link(link_id,workspace_id,from_type,from_id,to_type,to_id,relation,created_at,created_by) VALUES(?,?,'decision',?,'decision',?,'supersedes',?,?)",
                    UUID.randomUUID().toString(),
                    workspace,
                    replacement,
                    decision,
                    NOW,
                    user);
            String session = UUID.randomUUID().toString();
            jdbc.update(
                    "INSERT INTO session_record(session_record_id,project_id,number,type,title,summary,occurred_at,created_at,created_by,updated_at,updated_by) VALUES(?,?,1,'meeting','Meeting','Summary',?,?,?,?,?)",
                    session,
                    project,
                    NOW,
                    NOW,
                    user,
                    NOW,
                    user);
            jdbc.update(
                    "INSERT INTO session_participant VALUES(?,?,'user',?,'Historical name',?)",
                    UUID.randomUUID().toString(),
                    session,
                    user,
                    NOW);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO session_participant VALUES(?,?,'user',?,'Duplicate',?)",
                            UUID.randomUUID().toString(),
                            session,
                            user,
                            NOW))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO session_participant VALUES(?,?,'guest',?,'Wrong identity',?)",
                            UUID.randomUUID().toString(),
                            session,
                            user,
                            NOW))
                    .isInstanceOf(DataIntegrityViolationException.class);
            for (String payload : new String[] {"{bad json", "\"" + "x".repeat(131073) + "\""}) {
                assertThatThrownBy(() -> jdbc.update(
                                "INSERT INTO activity(activity_id,workspace_id,project_id,target_type,target_id,type,actor_id,payload,occurred_at) VALUES(?,?,?,'decision',?,'decision.created',?,?,?)",
                                UUID.randomUUID().toString(),
                                workspace,
                                project,
                                decision,
                                user,
                                payload,
                                NOW))
                        .isInstanceOf(DataIntegrityViolationException.class);
            }
            assertThat(jdbc.queryForObject("PRAGMA integrity_check", String.class))
                    .isEqualTo("ok");
            assertThat(jdbc.queryForList("PRAGMA foreign_key_check")).isEmpty();
        }
    }
}
