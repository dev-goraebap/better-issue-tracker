package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.decision.DecisionFacade;
import io.github.goraebap.bit.module.decision.application.DecisionService;
import io.github.goraebap.bit.module.decision.domain.Decision;
import io.github.goraebap.bit.module.decision.domain.DecisionRepository;
import io.github.goraebap.bit.module.link.LinkFacade;
import io.github.goraebap.bit.module.link.TargetFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.session.SessionFacade;
import io.github.goraebap.bit.module.session.application.SessionService;
import io.github.goraebap.bit.module.session.domain.Participant;
import io.github.goraebap.bit.module.session.domain.SessionRecord;
import io.github.goraebap.bit.module.session.domain.SessionRepository;
import io.github.goraebap.bit.module.workitem.application.WorkItemService;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.persistence.InstantTextBinding;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false",
            "app.auth.secret=target-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false"
        })
class TargetPersistenceIntegrationTest {
    @Autowired
    private DecisionRepository decisions;

    @Autowired
    private DecisionService decisionService;

    @Autowired
    private SessionRepository sessions;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private TargetFacade targets;

    @Autowired
    private LinkFacade links;

    @Autowired
    private ProjectService projects;

    @Autowired
    private WorkItemService workItems;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private UUID workspace;
    private UUID project;
    private CurrentUser actor;
    private final Instant now = Instant.parse("2026-10-23T00:00:00Z");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/target-" + UUID.randomUUID() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() {
        jdbc.execute("DROP TRIGGER IF EXISTS reject_guest_participant");
        jdbc.execute("DROP TRIGGER IF EXISTS reject_activity");
        jdbc.execute("DROP TRIGGER IF EXISTS reject_bundle");
        for (String table : List.of(
                "comment",
                "activity",
                "link",
                "session_participant",
                "session_record",
                "decision",
                "work_item",
                "board_column",
                "project_key",
                "project",
                "workspace_invitation",
                "workspace_member",
                "workspace",
                "iam_api_key",
                "iam_session",
                "iam_password",
                "iam_user")) jdbc.update("DELETE FROM " + table);
        UUID user = UUID.randomUUID();
        UUID credential = UUID.randomUUID();
        workspace = UUID.randomUUID();
        Instant created = Instant.now();
        String time = InstantTextBinding.text(created);
        jdbc.update(
                "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES(?,?,?,?,?)",
                user.toString(),
                "target@example.test",
                "Current owner",
                time,
                time);
        jdbc.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES(?,?,?)",
                user.toString(),
                "fixture-hash",
                time);
        jdbc.update(
                "INSERT INTO iam_session(iam_session_id,iam_user_id,token_hash,expires_at,absolute_expires_at,last_seen_at,created_at) VALUES(?,?,?,?,?,?,?)",
                credential.toString(),
                user.toString(),
                "target-fixture-session",
                InstantTextBinding.text(created.plusSeconds(3600)),
                InstantTextBinding.text(created.plusSeconds(7200)),
                time,
                time);
        jdbc.update(
                "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?)",
                workspace.toString(),
                "Target workspace",
                "target-test",
                time,
                user.toString(),
                time,
                user.toString());
        jdbc.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES(?,?,?,?,?)",
                UUID.randomUUID().toString(),
                workspace.toString(),
                user.toString(),
                "owner",
                time);
        actor = new CurrentUser(user, true, CurrentUser.Method.SESSION, credential, null, false);
        project = projects.create(actor, workspace, "Target project", "OLD", null);
    }

    private TransactionTemplate transaction() {
        return new TransactionTemplate(transactionManager);
    }

    private UUID decision() {
        return transaction().execute(status -> {
            var d = Decision.create(
                    project,
                    projects.allocateDecisionNumber(actor, workspace, project),
                    Decision.Details.of("A decision", "Reason", "Rejected", "planned"),
                    actor.userId(),
                    "original-agent",
                    now);
            decisions.save(d);
            return d.id();
        });
    }

    private void denied(Runnable action, int status) {
        assertThatThrownBy(action::run).isInstanceOf(BusinessException.class).satisfies(error -> assertThat(
                        ((BusinessException) error).errorCode().status().value())
                .isEqualTo(status));
    }

    @Test
    void repositoriesRoundTripDecisionAndParticipantSnapshotsAndTargetsAlwaysUseCurrentKey() {
        UUID decision = decision();
        UUID session = transaction().execute(status -> {
            var record = SessionRecord.create(
                    project,
                    projects.allocateSessionNumber(actor, workspace, project),
                    SessionRecord.Details.of("meeting", "Review", "Session summary", now),
                    List.of(
                            Participant.of("user", actor.userId(), "Historical name"),
                            Participant.of("guest", null, "Guest")),
                    actor.userId(),
                    "session-agent",
                    now);
            sessions.save(record);
            return record.id();
        });
        assertThat(decisions
                        .findById(project, decision, false)
                        .orElseThrow()
                        .audit()
                        .createdByAgent())
                .isEqualTo("original-agent");
        assertThat(sessions.findById(project, session, false).orElseThrow().participants())
                .extracting(Participant::displayName)
                .containsExactlyInAnyOrder("Historical name", "Guest");
        projects.revise(actor, workspace, project, 0, null, false, "NEW", true, null, false);
        assertThat(targets.requireAccess(actor, workspace, TargetType.decision, decision, false)
                        .reference())
                .isEqualTo("NEW D-001");
        assertThat(targets.requireAccess(actor, workspace, TargetType.session_record, session, false)
                        .reference())
                .isEqualTo("NEW S-001");
        assertThat(projects.findByKey(actor, workspace, "OLD").key()).isEqualTo("NEW");
        jdbc.update(
                "UPDATE iam_user SET name='Current renamed user' WHERE iam_user_id=?",
                actor.userId().toString());
        assertThat(sessions.findById(project, session, false).orElseThrow().participants())
                .extracting(Participant::displayName)
                .contains("Historical name");
    }

    @Test
    void targetChecksUseCurrentRolesAndMustChangeStateAndNeverInventMissingTypes() {
        UUID decision = decision();
        jdbc.update("UPDATE workspace_member SET role='viewer' WHERE workspace_id=?", workspace.toString());
        assertThat(targets.requireAccess(actor, workspace, TargetType.decision, decision, false)
                        .title())
                .isEqualTo("A decision");
        denied(() -> targets.requireAccess(actor, workspace, TargetType.decision, decision, true), 403);
        denied(() -> targets.requireAccess(actor, workspace, TargetType.artifact, UUID.randomUUID(), false), 404);
        denied(() -> targets.requireAccess(actor, workspace, TargetType.decision, UUID.randomUUID(), false), 404);
        denied(() -> targets.requireAccess(actor, UUID.randomUUID(), TargetType.decision, decision, false), 404);
        jdbc.update(
                "UPDATE iam_password SET must_change=1 WHERE iam_user_id=?",
                actor.userId().toString());
        denied(() -> targets.requireAccess(actor, workspace, TargetType.decision, decision, false), 403);
    }

    @Test
    void deletedTargetsAreHiddenAndArchivedProjectsRemainReadableButNotWritable() {
        UUID decision = decision();
        UUID item = workItems.create(
                actor, workspace, project, new WorkItem.Details("Work", null, null, null, null, null, null), null);
        assertThat(targets.requireAccess(actor, workspace, TargetType.work_item, item, false)
                        .reference())
                .isEqualTo("OLD-1");
        transaction().executeWithoutResult(status -> {
            var d = decisions.findById(project, decision, false).orElseThrow();
            d.delete(actor.userId(), null, now);
            decisions.save(d);
        });
        denied(() -> targets.requireAccess(actor, workspace, TargetType.decision, decision, false), 404);
        transaction().executeWithoutResult(status -> {
            var d = decisions.findById(project, decision, true).orElseThrow();
            d.restore(actor.userId(), null, now);
            decisions.save(d);
        });
        assertThat(targets.requireAccess(actor, workspace, TargetType.decision, decision, false)
                        .reference())
                .isEqualTo("OLD D-001");
        projects.archive(actor, workspace, project, 0, true);
        assertThat(targets.requireAccess(actor, workspace, TargetType.work_item, item, false)
                        .id())
                .isEqualTo(item);
        denied(() -> targets.requireAccess(actor, workspace, TargetType.work_item, item, true), 409);
        projects.delete(actor, workspace, project, 1);
        denied(() -> targets.requireAccess(actor, workspace, TargetType.decision, decision, false), 404);
        denied(() -> targets.requireAccess(actor, workspace, TargetType.work_item, item, false), 404);
    }

    @Test
    void failedParticipantSaveRollsBackTheSessionAndTheAllocatedNumber() {
        jdbc.execute(
                "CREATE TRIGGER reject_guest_participant BEFORE INSERT ON session_participant WHEN NEW.kind='guest' BEGIN SELECT RAISE(ABORT,'forced participant failure'); END");
        assertThatThrownBy(() -> transaction().executeWithoutResult(status -> {
                    var record = SessionRecord.create(
                            project,
                            projects.allocateSessionNumber(actor, workspace, project),
                            SessionRecord.Details.of("meeting", "Atomic session", "Summary", now),
                            List.of(
                                    Participant.of("user", actor.userId(), "Owner"),
                                    Participant.of("guest", null, "Failure")),
                            actor.userId(),
                            null,
                            now);
                    sessions.save(record);
                }))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM session_record", Integer.class))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM session_participant", Integer.class))
                .isZero();
        assertThat(jdbc.queryForObject(
                        "SELECT last_session_number FROM project WHERE project_id=?", Long.class, project.toString()))
                .isZero();
        jdbc.execute("DROP TRIGGER reject_guest_participant");
        assertThat(projects.allocateSessionNumber(actor, workspace, project)).isEqualTo(1);
    }

    private UUID item(String title) {
        return workItems.create(
                actor, workspace, project, new WorkItem.Details(title, null, null, null, null, null, null), null);
    }

    @Test
    void symmetricLinksAreIdempotentAndReconnectingRetainsTheDisconnectedHistory() {
        UUID a = item("A");
        UUID b = item("B");
        UUID first = links.connect(actor, workspace, TargetType.work_item, a, "relates_to", TargetType.work_item, b);
        assertThat(links.connect(actor, workspace, TargetType.work_item, b, "relates_to", TargetType.work_item, a))
                .isEqualTo(first);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                .isEqualTo(1);
        links.disconnect(actor, workspace, first);
        links.disconnect(actor, workspace, first);
        UUID next = links.connect(actor, workspace, TargetType.work_item, a, "relates_to", TargetType.work_item, b);
        assertThat(next).isNotEqualTo(first);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                .isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link WHERE deleted_at IS NOT NULL", Integer.class))
                .isEqualTo(1);
        denied(() -> links.connect(actor, workspace, TargetType.work_item, a, "blocks", TargetType.work_item, a), 400);
        denied(
                () -> links.connect(
                        actor, workspace, TargetType.work_item, a, "not-a-relation", TargetType.work_item, b),
                400);
    }

    @Test
    void cycleChecksIncludeHiddenNodesSoRestoringThemCannotIntroduceCycles() {
        UUID a = item("A");
        UUID b = item("B");
        UUID c = item("C");
        links.connect(actor, workspace, TargetType.work_item, a, "blocks", TargetType.work_item, b);
        links.connect(actor, workspace, TargetType.work_item, b, "blocks", TargetType.work_item, c);
        jdbc.update(
                "UPDATE work_item SET deleted_at=? WHERE work_item_id=?", InstantTextBinding.text(now), b.toString());
        denied(() -> links.connect(actor, workspace, TargetType.work_item, c, "blocks", TargetType.work_item, a), 409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link WHERE deleted_at IS NULL", Integer.class))
                .isEqualTo(2);
        denied(() -> links.connect(actor, workspace, TargetType.work_item, c, "blocks", TargetType.work_item, b), 404);
    }

    @Test
    void subtaskLinksHaveOneParentAndRejectTransitiveCycles() {
        UUID a = item("A");
        UUID b = item("B");
        UUID c = item("C");
        links.connect(actor, workspace, TargetType.work_item, a, "subtask_of", TargetType.work_item, b);
        denied(
                () -> links.connect(actor, workspace, TargetType.work_item, a, "subtask_of", TargetType.work_item, c),
                409);
        links.connect(actor, workspace, TargetType.work_item, b, "subtask_of", TargetType.work_item, c);
        denied(
                () -> links.connect(actor, workspace, TargetType.work_item, c, "subtask_of", TargetType.work_item, a),
                409);
    }

    @Test
    void linkCommandsCannotCrossWorkspacesOrBypassChangedRoles() {
        UUID a = item("A");
        UUID b = item("B");
        UUID other = UUID.randomUUID();
        String time = InstantTextBinding.text(now);
        jdbc.update(
                "INSERT INTO workspace(workspace_id,name,slug,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?)",
                other.toString(),
                "Other",
                "other-target",
                time,
                actor.userId().toString(),
                time,
                actor.userId().toString());
        jdbc.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES(?,?,?,?,?)",
                UUID.randomUUID().toString(),
                other.toString(),
                actor.userId().toString(),
                "owner",
                time);
        UUID otherProject = projects.create(actor, other, "Other project", "OTH", null);
        UUID foreign = workItems.create(
                actor, other, otherProject, new WorkItem.Details("Foreign", null, null, null, null, null, null), null);
        denied(
                () -> links.connect(actor, workspace, TargetType.work_item, a, "blocks", TargetType.work_item, foreign),
                404);
        UUID link = links.connect(actor, workspace, TargetType.work_item, a, "blocks", TargetType.work_item, b);
        jdbc.update("UPDATE workspace_member SET role='viewer' WHERE workspace_id=?", workspace.toString());
        denied(() -> links.disconnect(actor, workspace, link), 403);
        denied(() -> links.connect(actor, workspace, TargetType.work_item, b, "blocks", TargetType.work_item, a), 403);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link WHERE deleted_at IS NULL", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void supersessionCannotBeCreatedOrRemovedThroughGenericLinksAndCoordinatedFailureRollsBack() {
        UUID old = decision();
        UUID replacement = decision();
        denied(
                () -> links.connect(
                        actor, workspace, TargetType.decision, replacement, "supersedes", TargetType.decision, old),
                409);
        transaction().executeWithoutResult(status -> {
            for (UUID id : List.of(old, replacement)) {
                var d = decisions.findById(project, id, false).orElseThrow();
                d.accept(actor.userId(), null, now);
                decisions.save(d);
            }
        });
        assertThatThrownBy(() -> transaction().executeWithoutResult(status -> {
                    links.connectSupersession(actor, workspace, replacement, old);
                    var d = decisions.findById(project, old, false).orElseThrow();
                    d.supersede(actor.userId(), null, now);
                    decisions.save(d);
                    throw new IllegalStateException("forced coordinator rollback");
                }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(decisions.findById(project, old, false).orElseThrow().state())
                .isEqualTo(Decision.State.ACCEPTED);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                .isZero();
        UUID link = transaction().execute(status -> {
            UUID id = links.connectSupersession(actor, workspace, replacement, old);
            var d = decisions.findById(project, old, false).orElseThrow();
            d.supersede(actor.userId(), null, now);
            decisions.save(d);
            return id;
        });
        denied(() -> links.disconnect(actor, workspace, link), 409);
    }

    @Test
    void decisionCommandsPreserveAcceptanceAndCorrectionsAndProtectSupersededHistory() {
        var draft = new DecisionFacade.Draft("Original", "Reason", "Other choice", "planned");
        UUID old = decisionService.create(actor, workspace, project, draft);
        UUID replacement = decisionService.create(actor, workspace, project, draft);
        decisionService.accept(actor, workspace, project, old, 0);
        var acceptedAt = decisions.findById(project, old, false).orElseThrow().acceptedAt();
        decisionService.accept(actor, workspace, project, old, 1);
        assertThat(activityCount()).isEqualTo(3);
        decisionService.revise(
                actor,
                workspace,
                project,
                old,
                new DecisionFacade.Draft("Correction", "Amended reason", null, null),
                1);
        assertThat(decisions.findById(project, old, false).orElseThrow().acceptedAt())
                .isEqualTo(acceptedAt);
        assertThat(jdbc.queryForObject(
                        "SELECT json_extract(payload,'$.before') FROM activity WHERE target_id=? AND json_extract(payload,'$.field')='body'",
                        String.class,
                        old.toString()))
                .isEqualTo("Reason");
        denied(() -> decisionService.revise(actor, workspace, project, old, draft, 1), 409);
        denied(() -> decisionService.delete(actor, workspace, project, old, 2), 409);
        denied(() -> decisionService.supersede(actor, workspace, project, old, 2, replacement, 0), 409);
        decisionService.accept(actor, workspace, project, replacement, 0);
        decisionService.supersede(actor, workspace, project, old, 2, replacement, 1);
        var superseded = decisions.findById(project, old, false).orElseThrow();
        assertThat(superseded.state()).isEqualTo(Decision.State.SUPERSEDED);
        assertThat(superseded.acceptedAt()).isEqualTo(acceptedAt);
        assertThat(superseded.supersededAt()).isNotNull();
        assertThat(superseded.version()).isEqualTo(3);
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM link WHERE relation='supersedes' AND to_id=?",
                        Integer.class,
                        old.toString()))
                .isEqualTo(1);
        denied(() -> decisionService.revise(actor, workspace, project, old, draft, 3), 409);
        denied(() -> decisionService.accept(actor, workspace, project, old, 3), 409);
        denied(() -> decisionService.restore(actor, workspace, project, old, 3), 409);
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM activity WHERE occurred_at<>? AND target_id=?",
                        Integer.class,
                        InstantTextBinding.text(superseded.audit().updatedAt()),
                        old.toString()))
                .isGreaterThan(0);
    }

    @Test
    void failedActivityRollsBackDecisionNumbersAndTheRealSupersessionCoordinator() {
        rejectActivities();
        assertThatThrownBy(() -> decisionService.create(
                        actor, workspace, project, new DecisionFacade.Draft("New", "Reason", null, null)))
                .isInstanceOf(RuntimeException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM decision", Integer.class))
                .isZero();
        assertThat(jdbc.queryForObject(
                        "SELECT last_decision_number FROM project WHERE project_id=?",
                        Integer.class,
                        project.toString()))
                .isZero();
        jdbc.execute("DROP TRIGGER reject_activity");
        var ids = decisionService.createAll(
                actor,
                workspace,
                project,
                List.of(
                        new DecisionFacade.Draft("Old", "Reason", null, null),
                        new DecisionFacade.Draft("New", "Reason", null, null)));
        for (UUID id : ids) decisionService.accept(actor, workspace, project, id, 0);
        int before = activityCount();
        rejectActivities();
        assertThatThrownBy(
                        () -> decisionService.supersede(actor, workspace, project, ids.getFirst(), 1, ids.getLast(), 1))
                .isInstanceOf(RuntimeException.class);
        assertThat(decisions
                        .findById(project, ids.getFirst(), false)
                        .orElseThrow()
                        .state())
                .isEqualTo(Decision.State.ACCEPTED);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                .isZero();
        assertThat(activityCount()).isEqualTo(before);
    }

    @Test
    void largeEscapedDecisionCorrectionsAreLosslessAndEveryActivityStaysBelowTheByteLimit() {
        String before = "x" + "\u0001".repeat(19999);
        String after = "y" + "\u0002".repeat(19999);
        UUID id = decisionService.create(
                actor, workspace, project, new DecisionFacade.Draft("Long", before, before, null));
        decisionService.accept(actor, workspace, project, id, 0);
        decisionService.revise(actor, workspace, project, id, new DecisionFacade.Draft("Long", after, after, null), 1);
        for (String field : List.of("body", "rejectedAlternatives")) {
            var rows = jdbc.queryForList(
                    "SELECT payload FROM activity WHERE target_id=? AND json_extract(payload,'$.field')=? ORDER BY json_extract(payload,'$.part')",
                    String.class,
                    id.toString(),
                    field);
            var json = tools.jackson.databind.json.JsonMapper.builder().build();
            var oldText = new StringBuilder();
            var newText = new StringBuilder();
            for (String row : rows) {
                assertThat(row.getBytes(java.nio.charset.StandardCharsets.UTF_8).length)
                        .isLessThanOrEqualTo(131072);
                var payload = json.readTree(row);
                oldText.append(payload.path("before").asText());
                newText.append(payload.path("after").asText());
                assertThat(payload.path("parts").asInt()).isEqualTo(5);
            }
            assertThat(oldText.toString()).isEqualTo(before);
            assertThat(newText.toString()).isEqualTo(after);
        }
    }

    @Test
    void proposedDeletionRestoreAndCurrentKeyReferencesRespectVersionsAndCurrentRoles() {
        var draft = new DecisionFacade.Draft("Proposed", "Reason", null, null);
        UUID id = decisionService.create(actor, workspace, project, draft);
        String oldKey = projects.findByKey(actor, workspace, "OLD").key();
        assertThat(decisionService.findByRef(actor, workspace, project, "D-001").id())
                .isEqualTo(id);
        assertThat(decisionService
                        .findByRef(actor, workspace, project, oldKey + " D-001")
                        .id())
                .isEqualTo(id);
        decisionService.delete(actor, workspace, project, id, 0);
        denied(() -> decisionService.findByRef(actor, workspace, project, "D-001"), 404);
        denied(() -> decisionService.restore(actor, workspace, project, id, 0), 409);
        decisionService.restore(actor, workspace, project, id, 1);
        assertThat(decisionService.findByRef(actor, workspace, project, "D-001").id())
                .isEqualTo(id);
        jdbc.update("UPDATE workspace_member SET role='viewer' WHERE workspace_id=?", workspace.toString());
        assertThat(decisionService.findByRef(actor, workspace, project, "D-001").id())
                .isEqualTo(id);
        denied(() -> decisionService.accept(actor, workspace, project, id, 2), 403);
        denied(() -> decisionService.create(actor, workspace, project, draft), 403);
        denied(() -> decisionService.findByRef(actor, workspace, project, "D-9999999999999999999"), 404);
    }

    @Test
    void concurrentDecisionCreationAllocatesUniqueNumbersAndEvents() throws Exception {
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var jobs = new java.util.ArrayList<java.util.concurrent.Future<UUID>>();
            for (int i = 0; i < 8; i++)
                jobs.add(executor.submit(() -> decisionService.create(
                        actor, workspace, project, new DecisionFacade.Draft("Concurrent", "Reason", null, null))));
            var ids = new java.util.HashSet<UUID>();
            for (var job : jobs) ids.add(job.get(20, java.util.concurrent.TimeUnit.SECONDS));
            assertThat(ids).hasSize(8);
        }
        assertThat(jdbc.queryForList("SELECT number FROM decision ORDER BY number", Long.class))
                .containsExactly(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);
        assertThat(activityCount()).isEqualTo(8);
    }

    private int activityCount() {
        return java.util.Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM activity", Integer.class));
    }

    @Test
    void apiKeyDecisionProvenanceUsesTheHumanOwnerAndAgentWithoutPersistingCredentials() {
        UUID credential = UUID.randomUUID();
        String time = InstantTextBinding.text(Instant.now());
        jdbc.update(
                "INSERT INTO iam_api_key(iam_api_key_id,iam_user_id,name,agent_name,prefix,key_hash,created_at) VALUES(?,?,?,?,?,?,?)",
                credential.toString(),
                actor.userId().toString(),
                "Decision tool",
                "Decision agent",
                "fixture",
                "never-log-fixture-key-hash",
                time);
        var agent =
                new CurrentUser(actor.userId(), true, CurrentUser.Method.API_KEY, credential, "Decision agent", false);
        UUID id = decisionService.create(
                agent, workspace, project, new DecisionFacade.Draft("Agent decision", "Reason", null, null));
        decisionService.accept(agent, workspace, project, id, 0);
        var decision = decisions.findById(project, id, false).orElseThrow();
        assertThat(decision.audit().createdBy()).isEqualTo(actor.userId());
        assertThat(decision.audit().createdByAgent()).isEqualTo("Decision agent");
        assertThat(jdbc.queryForList("SELECT actor_id FROM activity", String.class))
                .containsOnly(actor.userId().toString());
        assertThat(jdbc.queryForList("SELECT actor_agent FROM activity", String.class))
                .containsOnly("Decision agent");
        for (String payload : jdbc.queryForList("SELECT payload FROM activity", String.class))
            assertThat(payload).doesNotContain("never-log-fixture-key-hash", credential.toString());
        jdbc.update("UPDATE iam_api_key SET revoked_at=? WHERE iam_api_key_id=?", time, credential.toString());
        denied(
                () -> decisionService.revise(
                        agent, workspace, project, id, new DecisionFacade.Draft("Revoked", "Reason", null, null), 1),
                401);
        assertThat(activityCount()).isEqualTo(2);
    }

    private void rejectActivities() {
        jdbc.execute(
                "CREATE TRIGGER reject_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'forced activity failure'); END");
    }

    @Test
    void sessionBundleSavesCanonicalParticipantSnapshotsDecisionsAndDeduplicatedLinks() {
        UUID work = workItem("Related work");
        UUID id = sessionService.record(
                actor,
                workspace,
                project,
                sessionDraft("Summary"),
                List.of(
                        new SessionFacade.Person("user", actor.userId(), "Untrusted client name"),
                        new SessionFacade.Person("user", actor.userId(), "Another supplied name"),
                        new SessionFacade.Person("agent", null, "Assistant")),
                List.of(
                        new DecisionFacade.Draft("Decision A", "Reason A", null, null),
                        new DecisionFacade.Draft("Decision B", "Reason B", null, null)),
                List.of(work, work));
        var record = sessions.findById(project, id, false).orElseThrow();
        assertThat(record.participants())
                .extracting(Participant::displayName)
                .containsExactlyInAnyOrder("Current owner", "Assistant");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM decision", Integer.class))
                .isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                .isEqualTo(3);
        assertThat(activityCount()).isEqualTo(3);
        transaction()
                .executeWithoutResult(status -> links.connectSessionRecord(
                        actor,
                        workspace,
                        project,
                        id,
                        jdbc.queryForList("SELECT decision_id FROM decision", String.class).stream()
                                .map(UUID::fromString)
                                .toList(),
                        List.of(work)));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                .isEqualTo(3);
        projects.revise(actor, workspace, project, 0, null, false, "NEW", true, null, false);
        assertThat(sessionService
                        .findByRef(actor, workspace, project, "OLD S-001")
                        .reference())
                .isEqualTo("NEW S-001");
        assertThat(decisionService
                        .findByRef(actor, workspace, project, "OLD D-001")
                        .reference())
                .isEqualTo("NEW D-001");
        assertThat(sessionService.findByRef(actor, workspace, project, "S-001").id())
                .isEqualTo(id);
    }

    @Test
    void failureAtParticipantsLinksOrActivitiesRollsBackTheEntireSessionBundleAndBothCounters() {
        UUID work = workItem("Related work");
        for (String table : List.of("session_participant", "link", "activity")) {
            jdbc.execute("CREATE TRIGGER reject_bundle BEFORE INSERT ON " + table
                    + " BEGIN SELECT RAISE(ABORT,'forced bundle failure'); END");
            try {
                assertThatThrownBy(() -> sessionService.record(
                                actor,
                                workspace,
                                project,
                                sessionDraft("Summary"),
                                List.of(new SessionFacade.Person("guest", null, "Guest")),
                                List.of(new DecisionFacade.Draft("Decision", "Reason", null, null)),
                                List.of(work)))
                        .isInstanceOf(RuntimeException.class);
                for (String child : List.of("session_record", "session_participant", "decision", "link", "activity"))
                    assertThat(jdbc.queryForObject("SELECT count(*) FROM " + child, Integer.class))
                            .isZero();
                assertThat(jdbc.queryForObject(
                                "SELECT last_session_number+last_decision_number FROM project WHERE project_id=?",
                                Integer.class,
                                project.toString()))
                        .isZero();
                assertThat(jdbc.queryForObject("SELECT count(*) FROM work_item", Integer.class))
                        .isEqualTo(1);
            } finally {
                jdbc.execute("DROP TRIGGER reject_bundle");
            }
        }
    }

    @Test
    void sessionCreationRejectsInvalidParticipantsAndCrossProjectOrHiddenRelatedWork() {
        denied(
                () -> sessionService.record(
                        actor,
                        workspace,
                        project,
                        sessionDraft("Summary"),
                        List.of(new SessionFacade.Person("user", UUID.randomUUID(), "Spoof")),
                        List.of(),
                        List.of()),
                400);
        denied(
                () -> sessionService.record(
                        actor,
                        workspace,
                        project,
                        sessionDraft("Summary"),
                        List.of(new SessionFacade.Person("guest", actor.userId(), "Guest")),
                        List.of(),
                        List.of()),
                400);
        denied(
                () -> sessionService.record(
                        actor,
                        workspace,
                        project,
                        sessionDraft("Summary"),
                        List.of(new SessionFacade.Person("user", null, "Missing identity")),
                        List.of(),
                        List.of()),
                400);
        UUID another = projects.create(actor, workspace, "Other project", "OTH", null);
        UUID otherWork = workItems.create(
                actor, workspace, another, new WorkItem.Details("Other", null, null, null, null, null, null), null);
        denied(
                () -> sessionService.record(
                        actor,
                        workspace,
                        project,
                        sessionDraft("Summary"),
                        List.of(),
                        List.of(new DecisionFacade.Draft("Decision", "Reason", null, null)),
                        List.of(otherWork)),
                404);
        UUID hidden = workItem("Hidden");
        workItems.delete(actor, workspace, project, hidden, 0);
        denied(
                () -> sessionService.record(
                        actor, workspace, project, sessionDraft("Summary"), List.of(), List.of(), List.of(hidden)),
                404);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM session_record", Integer.class))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM decision", Integer.class))
                .isZero();
        assertThat(jdbc.queryForObject(
                        "SELECT last_session_number+last_decision_number FROM project WHERE project_id=?",
                        Integer.class,
                        project.toString()))
                .isZero();
    }

    @Test
    void summaryCorrectionPreservesHistoricalMembersAndDoesNotCopyTheSummaryIntoActivity() {
        UUID id = sessionService.record(
                actor,
                workspace,
                project,
                sessionDraft("Original private summary"),
                List.of(new SessionFacade.Person("user", actor.userId(), null)),
                List.of(),
                List.of());
        jdbc.update(
                "UPDATE iam_user SET name='Renamed owner' WHERE iam_user_id=?",
                actor.userId().toString());
        sessionService.revise(actor, workspace, project, id, sessionDraft("New private summary"), null, 0);
        assertThat(sessions.findById(project, id, false).orElseThrow().participants())
                .extracting(Participant::displayName)
                .containsExactly("Current owner");
        for (String payload : jdbc.queryForList("SELECT payload FROM activity", String.class))
            assertThat(payload).doesNotContain("Original private summary", "New private summary");
        denied(() -> sessionService.revise(actor, workspace, project, id, sessionDraft("Stale"), null, 0), 409);
        sessionService.delete(actor, workspace, project, id, 1);
        denied(() -> sessionService.findByRef(actor, workspace, project, "S-001"), 404);
        sessionService.restore(actor, workspace, project, id, 2);
        assertThat(sessionService.findByRef(actor, workspace, project, "S-001").id())
                .isEqualTo(id);
        jdbc.update("UPDATE workspace_member SET role='viewer' WHERE workspace_id=?", workspace.toString());
        denied(() -> sessionService.delete(actor, workspace, project, id, 3), 403);
        assertThat(sessionService.findByRef(actor, workspace, project, "S-001").id())
                .isEqualTo(id);
    }

    @Test
    void sessionBundleSupportsTheFullParticipantDecisionAndWorkItemLimits() {
        var work = new java.util.ArrayList<UUID>();
        var people = new java.util.ArrayList<SessionFacade.Person>();
        var drafts = new java.util.ArrayList<DecisionFacade.Draft>();
        for (int i = 0; i < 100; i++) {
            work.add(workItem("Related " + i));
            people.add(new SessionFacade.Person("guest", null, "Guest " + i));
        }
        for (int i = 0; i < 20; i++) drafts.add(new DecisionFacade.Draft("Decision " + i, "Reason", null, null));
        UUID id = sessionService.record(actor, workspace, project, sessionDraft("Summary"), people, drafts, work);
        assertThat(sessions.findById(project, id, false).orElseThrow().participants())
                .hasSize(100);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM decision", Integer.class))
                .isEqualTo(20);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                .isEqualTo(120);
        assertThat(activityCount()).isEqualTo(21);
    }

    @Test
    void concurrentSessionBundlesAllocateIndependentSessionAndDecisionNumbers() throws Exception {
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var jobs = new java.util.ArrayList<java.util.concurrent.Future<UUID>>();
            for (int i = 0; i < 4; i++)
                jobs.add(executor.submit(() -> sessionService.record(
                        actor,
                        workspace,
                        project,
                        sessionDraft("Concurrent"),
                        List.of(),
                        List.of(
                                new DecisionFacade.Draft("A", "Reason", null, null),
                                new DecisionFacade.Draft("B", "Reason", null, null)),
                        List.of())));
            var ids = new java.util.HashSet<UUID>();
            for (var job : jobs) ids.add(job.get(20, java.util.concurrent.TimeUnit.SECONDS));
            assertThat(ids).hasSize(4);
        }
        assertThat(jdbc.queryForList("SELECT number FROM session_record ORDER BY number", Long.class))
                .containsExactly(1L, 2L, 3L, 4L);
        assertThat(jdbc.queryForList("SELECT number FROM decision ORDER BY number", Long.class))
                .containsExactly(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM link", Integer.class))
                .isEqualTo(8);
        assertThat(activityCount()).isEqualTo(12);
    }

    private SessionFacade.Draft sessionDraft(String summary) {
        return new SessionFacade.Draft("meeting", "Review", summary, now);
    }

    private UUID workItem(String title) {
        return workItems.create(
                actor, workspace, project, new WorkItem.Details(title, null, null, null, null, null, null), null);
    }
}
