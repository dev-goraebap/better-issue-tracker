package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.goraebap.bit.shared.domain.Ids;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false",
            "app.auth.secret=workspace-test-secret-at-least-32-characters",
            "app.auth.cookie-secure=false",
            "app.auth.allowed-origins=http://localhost:8080",
            "app.auth.attempts-per-minute=1000"
        })
@Import(WorkspaceIntegrationTest.TimeConfig.class)
class WorkspaceIntegrationTest {
    private static final String PASSWORD = "correct horse battery staple";
    private static final String EMAIL = "owner@example.test";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private MutableClock clock;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/workspace-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void clean() {
        for (String table : List.of(
                "workspace_invitation",
                "workspace_member",
                "issue_view_tweak",
                "issue_view",
                "label",
                "workspace",
                "iam_api_key",
                "iam_session",
                "iam_password",
                "iam_email_otp",
                "iam_user")) jdbc.update("DELETE FROM " + table);
        clock.advance(Duration.ofDays(40));
    }

    @Test
    void creationIsAtomicAndSlugsArePermanent() throws Exception {
        try (Client owner = owner()) {
            String space = space(owner, "team-a");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM workspace_member WHERE role='owner'", Integer.class))
                    .isEqualTo(1);
            expect(owner.write("POST", "/workspaces", Map.of("name", "Other", "slug", " TEAM-A ")), 409);
            expect(owner.write("PATCH", space, Map.of()), 204);
            expect(owner.write("PATCH", space, Map.of("slug", "new-slug")), 400);
            expect(owner.write("PATCH", space, "{\"name\":null}"), 400);
            expect(owner.write("DELETE", space, null), 204);
            expect(owner.get(space), 404);
            expect(owner.write("POST", "/workspaces", Map.of("name", "Other", "slug", "team-a")), 409);
            jdbc.execute(
                    "CREATE TRIGGER fail_owner BEFORE INSERT ON workspace_member BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
            try {
                expect(owner.write("POST", "/workspaces", Map.of("name", "Rollback", "slug", "rollback")), 409);
                assertThat(jdbc.queryForObject("SELECT count(*) FROM workspace WHERE slug='rollback'", Integer.class))
                        .isZero();
            } finally {
                jdbc.execute("DROP TRIGGER fail_owner");
            }
        }
    }

    @Test
    void rolesAndBearerUseLiveMembershipWithoutInstanceAdminBypass() throws Exception {
        try (Client owner = owner()) {
            String path = space(owner, "team-a");
            String id = id(path);
            String ownerKey = key(owner);
            expect(owner.bearer("POST", "/workspaces", ownerKey), 403);
            for (String role : List.of("admin", "member", "viewer")) {
                String user = fixture(role + "@example.test", false);
                member(id, user, role);
                try (Client client = login(role + "@example.test")) {
                    expect(client.get(path), 200);
                    expect(client.send("HEAD", path, null, null, null, null), 200);
                    String raw = key(client);
                    expect(client.bearer("GET", path, raw), 200);
                    expect(
                            client.bearerBody("PATCH", path, raw, Map.of("name", role)),
                            role.equals("admin") ? 204 : 403);
                    expect(client.write("PATCH", path, Map.of("name", role)), role.equals("admin") ? 204 : 403);
                    for (String security :
                            List.of(path + "/invitations", path + "/members/me", "/auth/sessions/current/workspace"))
                        expect(client.bearer("POST", security, raw), 403);
                }
            }
            fixture("instance@example.test", true);
            try (Client admin = login("instance@example.test")) {
                expect(admin.get(path), 404);
                assertThat(tree(admin.get("/me/workspaces")).path("items")).isEmpty();
            }
            expect(owner.bearerBody("PATCH", path, ownerKey, Map.of("name", "Agent changed")), 204);
            assertThat(jdbc.queryForObject(
                            "SELECT updated_by_agent FROM workspace WHERE workspace_id=?", String.class, id))
                    .isEqualTo("workspace-test");
            assertThat(jdbc.queryForObject("SELECT updated_by FROM workspace WHERE workspace_id=?", String.class, id))
                    .isEqualTo(tree(owner.get("/me")).path("id").asText());
            expect(owner.write("PATCH", path, Map.of("name", "Human changed")), 204);
            assertThat(jdbc.queryForObject(
                            "SELECT updated_by_agent FROM workspace WHERE workspace_id=?", String.class, id))
                    .isNull();
        }
    }

    @Test
    void roleHierarchyAndAuthorizationRunBeforeBodyOrAcceptBinding() throws Exception {
        try (Client owner = owner()) {
            String path = space(owner, "team-a");
            String id = id(path);
            String admin = fixture("admin@example.test", false);
            String viewer = fixture("viewer@example.test", false);
            member(id, admin, "admin");
            String viewerMember = member(id, viewer, "viewer");
            String ownMember = jdbc.queryForObject(
                    "SELECT workspace_member_id FROM workspace_member WHERE workspace_id=? AND role='owner'",
                    String.class,
                    id);
            try (Client manager = login("admin@example.test");
                    Client reader = login("viewer@example.test")) {
                expect(manager.write("PATCH", path + "/members/" + ownMember, "{"), 403);
                expect(
                        manager.write(
                                "POST", path + "/invitations", Map.of("email", "new@example.test", "role", "admin")),
                        403);
                expect(manager.write("PATCH", path + "/members/" + viewerMember, Map.of("role", "admin")), 403);
                reader.csrf();
                expect(
                        reader.send("PATCH", path, "{", "http://localhost:8080", reader.csrfToken, null, "text/plain"),
                        403);
                expect(reader.write("PATCH", path + "/members/" + ownMember, "{"), 403);
                expect(owner.write("PATCH", path + "/members/" + viewerMember, Map.of("role", "owner")), 403);
                expect(owner.write("DELETE", path + "/members/me", null), 409);
                expect(
                        owner.write(
                                "PUT",
                                path + "/owner",
                                Map.of("userId", viewer, "currentPassword", "incorrect password")),
                        401);
                assertThat(jdbc.queryForObject(
                                "SELECT failed_count FROM iam_password WHERE iam_user_id=(SELECT iam_user_id FROM iam_user WHERE email=?)",
                                Integer.class,
                                EMAIL))
                        .isEqualTo(1);
                expect(owner.write("PUT", path + "/owner", Map.of("userId", viewer, "currentPassword", PASSWORD)), 204);
                expect(owner.write("PUT", path + "/owner", "{"), 403);
                assertThat(jdbc.queryForObject(
                                "SELECT count(*) FROM workspace_member WHERE workspace_id=? AND role='owner'",
                                Integer.class,
                                id))
                        .isEqualTo(1);
            }
        }
    }

    @Test
    void invitationsAreOneTimeScopedExpiringAndDoNotExposeTheToken() throws Exception {
        try (Client owner = owner();
                Client anonymous = new Client()) {
            String path = space(owner, "team-a");
            String other = space(owner, "team-b");
            JsonNode invitation = invite(owner, path, " NEW@example.test ", "member");
            String raw = invitation.path("token").asText();
            String invitationId = invitation.path("id").asText();
            assertThat(raw).startsWith("biti_").hasSize(48);
            String hash = jdbc.queryForObject("SELECT token_hash FROM workspace_invitation", String.class);
            assertThat(hash).doesNotContain(raw);
            assertThat(owner.get(path + "/invitations").body()).doesNotContain(raw, hash, "tokenHash");
            assertThat(owner.get(path + "/invitations/" + invitationId).body()).doesNotContain(raw, hash);
            expect(owner.get(other + "/invitations/" + invitationId), 404);
            expect(
                    owner.write("POST", path + "/invitations", Map.of("email", "new@example.test", "role", "viewer")),
                    409);
            var preview = anonymous.write("POST", "/invitation-previews", Map.of("token", raw));
            expect(preview, 200);
            assertThat(tree(preview).path("email").asText()).isEqualTo("new@example.test");
            assertThat(preview.headers().firstValue("cache-control").orElse("")).contains("no-store");
            String key = key(owner);
            expect(owner.bearerBody("POST", "/invitation-previews", key, Map.of("token", raw)), 403);
            anonymous.csrf();
            expect(
                    anonymous.send(
                            "POST", "/invitation-previews", Map.of("token", raw), null, anonymous.csrfToken, null),
                    403);
            expect(
                    anonymous.send(
                            "POST", "/invitation-previews", Map.of("token", raw), "http://localhost:8080", null, null),
                    403);
            clock.advance(Duration.ofDays(7));
            expect(anonymous.write("POST", "/invitation-previews", Map.of("token", raw)), 404);
            expect(owner.write("POST", "/auth/sessions", Map.of("email", EMAIL, "password", PASSWORD)), 201);
            invite(owner, path, "new@example.test", "member");
        }
    }

    @Test
    void acceptanceIsEmailBoundIdempotentAndCannotRejoinOrOverwriteRoles() throws Exception {
        try (Client owner = owner()) {
            String path = space(owner, "team-a");
            String invited = fixture("invited@example.test", false);
            fixture("wrong@example.test", false);
            String raw = invite(owner, path, "invited@example.test", "member")
                    .path("token")
                    .asText();
            try (Client correct = login("invited@example.test");
                    Client wrong = login("wrong@example.test")) {
                expect(wrong.write("POST", "/invitation-acceptances", Map.of("token", raw)), 403);
                expect(correct.write("POST", "/invitation-acceptances", Map.of("token", raw)), 201);
                expect(correct.write("POST", "/invitation-acceptances", Map.of("token", raw)), 204);
                String memberId = jdbc.queryForObject(
                        "SELECT workspace_member_id FROM workspace_member WHERE workspace_id=? AND iam_user_id=?",
                        String.class,
                        id(path),
                        invited);
                expect(owner.write("PATCH", path + "/members/" + memberId, Map.of("role", "admin")), 204);
                expect(correct.write("POST", "/invitation-acceptances", Map.of("token", raw)), 204);
                assertThat(tree(correct.get(path)).path("myRole").asText()).isEqualTo("admin");
                expect(owner.write("DELETE", path + "/members/" + memberId, null), 204);
                expect(correct.write("POST", "/invitation-acceptances", Map.of("token", raw)), 404);
                assertThat(jdbc.queryForObject(
                                "SELECT count(*) FROM workspace_member WHERE workspace_id=? AND iam_user_id=?",
                                Integer.class,
                                id(path),
                                invited))
                        .isZero();
            }
        }
    }

    @Test
    void invitedRegistrationIsAtomicAndNeverOverwritesAnExistingIdentity() throws Exception {
        try (Client owner = owner();
                Client anonymous = new Client()) {
            String path = space(owner, "team-a");
            String raw = invite(owner, path, "new@example.test", "viewer")
                    .path("token")
                    .asText();
            expect(
                    owner.write(
                            "POST",
                            "/invitation-registrations",
                            Map.of("token", raw, "name", "New", "password", PASSWORD)),
                    403);
            jdbc.execute(
                    "CREATE TRIGGER fail_member BEFORE INSERT ON workspace_member WHEN NEW.role='viewer' BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
            try {
                expect(
                        anonymous.write(
                                "POST",
                                "/invitation-registrations",
                                Map.of("token", raw, "name", "New", "password", PASSWORD)),
                        409);
                assertThat(jdbc.queryForObject(
                                "SELECT count(*) FROM iam_user WHERE email='new@example.test'", Integer.class))
                        .isZero();
                assertThat(jdbc.queryForObject(
                                "SELECT status FROM workspace_invitation WHERE email='new@example.test'", String.class))
                        .isEqualTo("pending");
            } finally {
                jdbc.execute("DROP TRIGGER fail_member");
            }
            expect(
                    anonymous.write(
                            "POST",
                            "/invitation-registrations",
                            Map.of(
                                    "token",
                                    raw,
                                    "name",
                                    "New",
                                    "password",
                                    PASSWORD,
                                    "isInstanceAdmin",
                                    true,
                                    "role",
                                    "owner")),
                    201);
            assertThat(jdbc.queryForObject(
                            "SELECT is_instance_admin FROM iam_user WHERE email='new@example.test'", Integer.class))
                    .isZero();
            try (Client user = login("new@example.test")) {
                assertThat(tree(user.get(path)).path("myRole").asText()).isEqualTo("viewer");
            }
            fixture("existing@example.test", false);
            String existing = invite(owner, path, "existing@example.test", "member")
                    .path("token")
                    .asText();
            String hash = jdbc.queryForObject(
                    "SELECT password_hash FROM iam_password WHERE iam_user_id=(SELECT iam_user_id FROM iam_user WHERE email='existing@example.test')",
                    String.class);
            expect(
                    anonymous.write(
                            "POST",
                            "/invitation-registrations",
                            Map.of("token", existing, "name", "New", "password", "different valid password")),
                    409);
            assertThat(jdbc.queryForObject(
                            "SELECT password_hash FROM iam_password WHERE iam_user_id=(SELECT iam_user_id FROM iam_user WHERE email='existing@example.test')",
                            String.class))
                    .isEqualTo(hash);
        }
    }

    @Test
    void issuerPermissionLossRevokesOutstandingInvitations() throws Exception {
        try (Client owner = owner();
                Client anonymous = new Client()) {
            String path = space(owner, "team-a");
            String successor = fixture("successor@example.test", false);
            String successorMember = member(id(path), successor, "member");
            String admin = invite(owner, path, "admin-invite@example.test", "admin")
                    .path("token")
                    .asText();
            String member = invite(owner, path, "member-invite@example.test", "member")
                    .path("token")
                    .asText();
            expect(owner.write("PUT", path + "/owner", Map.of("userId", successor, "currentPassword", PASSWORD)), 204);
            expect(anonymous.write("POST", "/invitation-previews", Map.of("token", admin)), 404);
            expect(anonymous.write("POST", "/invitation-previews", Map.of("token", member)), 200);
            String oldMember = jdbc.queryForObject(
                    "SELECT workspace_member_id FROM workspace_member WHERE workspace_id=? AND role='admin'",
                    String.class,
                    id(path));
            try (Client next = login("successor@example.test")) {
                expect(next.write("PATCH", path + "/members/" + oldMember, Map.of("role", "member")), 204);
                expect(anonymous.write("POST", "/invitation-previews", Map.of("token", member)), 404);
                assertThat(tree(next.get(path + "/members")).path("items").toString())
                        .contains(successorMember);
            }
        }
    }

    @Test
    void removalClearsOnlyAffectedPointersAndKeysImmediatelyLoseAccess() throws Exception {
        try (Client owner = owner()) {
            String a = space(owner, "team-a");
            String b = space(owner, "team-b");
            String user = fixture("member@example.test", false);
            String membership = member(id(a), user, "admin");
            member(id(b), user, "member");
            try (Client first = login("member@example.test");
                    Client second = login("member@example.test")) {
                String raw = key(first);
                expect(first.write("PUT", "/auth/sessions/current/workspace", Map.of("workspaceId", id(a))), 204);
                expect(second.write("PUT", "/auth/sessions/current/workspace", Map.of("workspaceId", id(b))), 204);
                expect(first.bearerBody("PATCH", a, raw, Map.of("name", "Before")), 204);
                expect(owner.write("PATCH", a + "/members/" + membership, Map.of("role", "viewer")), 204);
                expect(first.bearerBody("PATCH", a, raw, Map.of("name", "After")), 403);
                expect(owner.write("DELETE", a + "/members/" + membership, null), 204);
                expect(first.bearer("GET", a, raw), 404);
                expect(first.bearer("GET", b, raw), 200);
                assertThat(tree(first.get("/auth/sessions/current"))
                                .path("activeWorkspaceId")
                                .isNull())
                        .isTrue();
                assertThat(tree(second.get("/auth/sessions/current"))
                                .path("activeWorkspaceId")
                                .asText())
                        .isEqualTo(id(b));
                expect(first.get("/me"), 200);
                expect(owner.write("PUT", "/auth/sessions/current/workspace", Map.of("workspaceId", id(a))), 204);
                expect(owner.write("DELETE", a, null), 204);
                assertThat(tree(owner.get("/auth/sessions/current"))
                                .path("activeWorkspaceId")
                                .isNull())
                        .isTrue();
                expect(second.get(b), 200);
            }
        }
    }

    @Test
    void cursorsBindActorWorkspaceFilterAndStableOrdering() throws Exception {
        try (Client owner = owner()) {
            String a = space(owner, "team-a");
            String b = space(owner, "team-b");
            String c = space(owner, "team-c");
            var first = tree(owner.get("/me/workspaces?size=1"));
            String cursor = first.path("nextCursor").asText();
            assertThat(cursor).isNotBlank();
            assertThat(tree(owner.get("/me/workspaces?size=1&cursor=" + cursor))
                            .path("items")
                            .get(0)
                            .path("id")
                            .asText())
                    .isNotEqualTo(first.path("items").get(0).path("id").asText());
            fixture("other@example.test", false);
            try (Client other = login("other@example.test")) {
                expect(other.get("/me/workspaces?cursor=" + cursor), 400);
            }
            for (int i = 0; i < 3; i++) {
                String user = fixture("member" + i + "@example.test", false);
                member(id(a), user, "member");
            }
            var members = tree(owner.get(a + "/members?size=1"));
            String memberCursor = members.path("nextCursor").asText();
            expect(owner.get(b + "/members?cursor=" + memberCursor), 400);
            Set<String> ids = new HashSet<>();
            String next = null;
            do {
                JsonNode page = tree(owner.get(a + "/members?size=1" + (next == null ? "" : "&cursor=" + next)));
                assertThat(ids.add(page.path("items").get(0).path("memberId").asText()))
                        .isTrue();
                next = page.path("nextCursor").isNull()
                        ? null
                        : page.path("nextCursor").asText();
            } while (next != null);
            assertThat(ids).hasSize(4);
            invite(owner, a, "one@example.test", "member");
            invite(owner, a, "two@example.test", "viewer");
            String inviteCursor = tree(owner.get(a + "/invitations?size=1&status=pending"))
                    .path("nextCursor")
                    .asText();
            expect(owner.get(a + "/invitations?cursor=" + inviteCursor), 400);
            expect(owner.get(a + "/invitations?status=unknown"), 400);
            expect(owner.get(a + "/members?size=0"), 400);
            expect(owner.get(a + "/members?direction=DESC"), 400);
            expect(owner.get(c + "/members?cursor=invalid"), 400);
        }
    }

    @Test
    void concurrentAcceptanceAndRegistrationCannotDuplicateOrHalfCommit() throws Exception {
        try (Client owner = owner();
                Client first = new Client();
                Client second = new Client();
                var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            String path = space(owner, "team-a");
            String raw = invite(owner, path, "new@example.test", "member")
                    .path("token")
                    .asText();
            first.csrf();
            second.csrf();
            var a = pool.submit(() -> first.write(
                    "POST", "/invitation-registrations", Map.of("token", raw, "name", "First", "password", PASSWORD)));
            var b = pool.submit(() -> second.write(
                    "POST", "/invitation-registrations", Map.of("token", raw, "name", "Second", "password", PASSWORD)));
            List<Integer> statuses = List.of(a.get().statusCode(), b.get().statusCode());
            assertThat(statuses.stream().filter(s -> s == 201).count()).isEqualTo(1);
            assertThat(statuses).allMatch(s -> s == 201 || s == 404 || s == 409);
            assertThat(jdbc.queryForObject(
                            "SELECT count(*) FROM iam_user WHERE email='new@example.test'", Integer.class))
                    .isEqualTo(1);
            assertThat(jdbc.queryForObject(
                            "SELECT count(*) FROM workspace_member WHERE workspace_id=?", Integer.class, id(path)))
                    .isEqualTo(2);
            String existing = fixture("existing@example.test", false);
            String existingToken = invite(owner, path, "existing@example.test", "viewer")
                    .path("token")
                    .asText();
            try (Client one = login("existing@example.test");
                    Client two = login("existing@example.test")) {
                var x = pool.submit(() -> one.write("POST", "/invitation-acceptances", Map.of("token", existingToken)));
                var y = pool.submit(() -> two.write("POST", "/invitation-acceptances", Map.of("token", existingToken)));
                assertThat(List.of(x.get().statusCode(), y.get().statusCode())).containsExactlyInAnyOrder(201, 204);
                assertThat(jdbc.queryForObject(
                                "SELECT count(*) FROM workspace_member WHERE workspace_id=? AND iam_user_id=?",
                                Integer.class,
                                id(path),
                                existing))
                        .isEqualTo(1);
            }
        }
    }

    @Test
    void ownershipTransferRollsBackAndRacesWithDeparture() throws Exception {
        try (Client owner = owner();
                var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            String path = space(owner, "team-a");
            String candidate = fixture("candidate@example.test", false);
            member(id(path), candidate, "member");
            jdbc.execute(
                    "CREATE TRIGGER fail_transfer BEFORE UPDATE OF role ON workspace_member WHEN NEW.role='owner' BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
            try {
                expect(
                        owner.write("PUT", path + "/owner", Map.of("userId", candidate, "currentPassword", PASSWORD)),
                        409);
                assertThat(jdbc.queryForObject(
                                "SELECT role FROM workspace_member WHERE workspace_id=? AND iam_user_id=?",
                                String.class,
                                id(path),
                                candidate))
                        .isEqualTo("member");
                assertThat(jdbc.queryForObject(
                                "SELECT count(*) FROM workspace_member WHERE workspace_id=? AND role='owner'",
                                Integer.class,
                                id(path)))
                        .isEqualTo(1);
            } finally {
                jdbc.execute("DROP TRIGGER fail_transfer");
            }
            try (Client leaving = login("candidate@example.test")) {
                var transfer = pool.submit(() ->
                        owner.write("PUT", path + "/owner", Map.of("userId", candidate, "currentPassword", PASSWORD)));
                var leave = pool.submit(() -> leaving.write("DELETE", path + "/members/me", null));
                var results = List.of(transfer.get().statusCode(), leave.get().statusCode());
                assertThat(results).contains(204).allMatch(status -> status == 204 || status == 404 || status == 409);
                assertThat(jdbc.queryForObject(
                                "SELECT count(*) FROM workspace_member WHERE workspace_id=? AND role='owner'",
                                Integer.class,
                                id(path)))
                        .isEqualTo(1);
            }
        }
    }

    @Test
    void concurrentOwnershipTransfersLeaveExactlyOneOwner() throws Exception {
        try (Client owner = owner();
                Client second = login(EMAIL);
                var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            String path = space(owner, "team-a");
            String a = fixture("a@example.test", false);
            String b = fixture("b@example.test", false);
            member(id(path), a, "member");
            member(id(path), b, "member");
            var x = pool.submit(() ->
                    owner.write("PUT", path + "/owner", Map.of("userId", a.toString(), "currentPassword", PASSWORD)));
            var y = pool.submit(() ->
                    second.write("PUT", path + "/owner", Map.of("userId", b.toString(), "currentPassword", PASSWORD)));
            assertThat(List.of(x.get().statusCode(), y.get().statusCode())).containsExactlyInAnyOrder(204, 403);
            assertThat(jdbc.queryForObject(
                            "SELECT count(*) FROM workspace_member WHERE workspace_id=? AND role='owner'",
                            Integer.class,
                            id(path)))
                    .isEqualTo(1);
        }
    }

    @Test
    void deletedUsersAndForcedChangeCannotUseWorkspaceCapabilities() throws Exception {
        try (Client owner = owner()) {
            String path = space(owner, "team-a");
            String user = fixture("member@example.test", false);
            member(id(path), user, "member");
            try (Client client = login("member@example.test")) {
                String raw = key(client);
                jdbc.update("UPDATE iam_password SET must_change=1 WHERE iam_user_id=?", user.toString());
                expect(client.get(path), 403);
                expect(client.bearer("GET", path, raw), 401);
                expect(client.write("POST", "/invitation-previews", Map.of("token", "biti_invalid")), 403);
                jdbc.update(
                        "UPDATE iam_user SET deleted_at=? WHERE iam_user_id=?",
                        clock.instant().toString(),
                        user.toString());
                expect(client.get(path), 401);
            }
        }
    }

    private String fixture(String email, boolean admin) {
        String id = Ids.newId();
        String now = "2026-10-22T00:00:00.000000Z";
        jdbc.update(
                "INSERT INTO iam_user(iam_user_id,email,name,is_instance_admin,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                id,
                email,
                email,
                admin ? 1 : 0,
                now,
                now);
        jdbc.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES(?,?,?)",
                id,
                encoder.encode(PASSWORD),
                now);
        return id;
    }

    private String member(String workspace, String user, String role) {
        String id = Ids.newId();
        jdbc.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES(?,?,?,?,?)",
                id,
                workspace,
                user.toString(),
                role,
                "2026-10-22T00:00:00.000000Z");
        return id;
    }

    private Client owner() throws Exception {
        Client client = new Client();
        expect(
                client.write("POST", "/auth/bootstrap", Map.of("name", "Owner", "email", EMAIL, "password", PASSWORD)),
                201);
        expect(client.write("POST", "/auth/sessions", Map.of("email", EMAIL, "password", PASSWORD)), 201);
        return client;
    }

    private Client login(String email) throws Exception {
        Client client = new Client();
        expect(client.write("POST", "/auth/sessions", Map.of("email", email, "password", PASSWORD)), 201);
        return client;
    }

    private String space(Client client, String slug) throws Exception {
        var response = client.write("POST", "/workspaces", Map.of("name", slug, "slug", slug));
        expect(response, 201);
        return response.headers().firstValue("location").orElseThrow().substring("/api/v1".length());
    }

    private String id(String path) {
        return path.substring("/workspaces/".length());
    }

    private JsonNode invite(Client client, String space, String email, String role) throws Exception {
        var response = client.write("POST", space + "/invitations", Map.of("email", email, "role", role));
        expect(response, 201);
        return tree(response);
    }

    private String key(Client client) throws Exception {
        var response = client.write(
                "POST",
                "/me/api-keys",
                Map.of("name", "Workspace test", "agentName", "workspace-test", "currentPassword", PASSWORD));
        expect(response, 201);
        return tree(response).path("key").asText();
    }

    private static JsonNode tree(HttpResponse<String> response) {
        return JSON.readTree(response.body());
    }

    private static void expect(HttpResponse<String> response, int status) {
        assertThat(response.statusCode())
                .as(response.statusCode() == status ? "HTTP status" : response.body())
                .isEqualTo(status);
    }

    private class Client implements AutoCloseable {
        final HttpClient http = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build();
        String csrfToken;

        void csrf() throws Exception {
            csrfToken = tree(get("/auth/csrf")).path("token").asText();
        }

        HttpResponse<String> get(String path) throws Exception {
            return send("GET", path, null, null, null, null);
        }

        HttpResponse<String> write(String method, String path, Object body) throws Exception {
            csrf();
            return send(method, path, body, "http://localhost:8080", csrfToken, null);
        }

        HttpResponse<String> bearer(String method, String path, String key) throws Exception {
            return send(method, path, null, null, null, key);
        }

        HttpResponse<String> bearerBody(String method, String path, String key, Object body) throws Exception {
            return send(method, path, body, null, null, key);
        }

        HttpResponse<String> send(String method, String path, Object body, String origin, String csrf, String key)
                throws Exception {
            return send(method, path, body, origin, csrf, key, "application/json");
        }

        HttpResponse<String> send(
                String method, String path, Object body, String origin, String csrf, String key, String accept)
                throws Exception {
            var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                    .header("Accept", accept);
            if (origin != null) request.header("Origin", origin);
            if (csrf != null) request.header("X-CSRF-Token", csrf);
            if (key != null) request.header("Authorization", "Bearer " + key);
            if (body != null) request.header("Content-Type", "application/json");
            String content = body == null ? "" : body instanceof String text ? text : JSON.writeValueAsString(body);
            return http.send(
                    request.method(method, HttpRequest.BodyPublishers.ofString(content))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
        }

        @Override
        public void close() {
            http.close();
        }
    }

    static class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-10-22T00:00:00Z");

        synchronized void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public synchronized Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            if (!zone.equals(ZoneOffset.UTC)) throw new IllegalArgumentException("UTC only");
            return this;
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TimeConfig {
        @Bean
        @Primary
        MutableClock workspaceClock() {
            return new MutableClock();
        }
    }
}
