package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.file.FileOwner;
import io.github.goraebap.bit.module.file.Picture;
import io.github.goraebap.bit.module.file.application.FileService;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.error.DomainRuleViolation;
import io.github.goraebap.bit.shared.persistence.InstantTextBinding;
import io.github.goraebap.bit.shared.storage.ObjectStorage;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Uploads through the local storage's signed URLs, binding, opening and discarding (D-029, D-090). */
@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.secrets.generate=false", "app.auth.secret=file-integration-secret-at-least-32-characters",
            "app.auth.cookie-secure=false", "app.auth.allowed-origins=http://localhost:8080"
        })
class FileIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final byte[] PNG = {
        (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 'I', 'H', 'D', 'R', 1, 2, 3
    };

    @LocalServerPort
    private int port;

    @Autowired
    private FileService fileService;

    @Autowired
    private ObjectStorage objectStorage;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private CurrentUser owner;
    private HttpClient session;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/file-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @BeforeEach
    void prepare() throws Exception {
        for (String table : List.of(
                "attachment",
                "blob",
                "pending_upload",
                "work_item_view_order",
                "work_item_view_tweak",
                "work_item_view",
                "label",
                "workspace_invitation",
                "workspace_member",
                "workspace",
                "iam_api_key",
                "iam_session",
                "iam_password",
                "iam_user")) jdbcTemplate.update("DELETE FROM " + table);
        owner = identity("owner");
        session = login(owner);
    }

    @Test
    void aPictureGoesStraightToStorageAndOpensAsItWasSent() throws Exception {
        var ticket = upload(session, "화면.png", PNG.length, "#AABBCC", 2, 1);
        assertThat(ticket.path("method").asText()).isEqualTo("PUT");
        // The signed URL allows exactly the declared type and size, without a session.
        expect(put(ticket, PNG.length + 1, "image/png"), 403);
        expect(put(ticket, PNG.length, "image/jpeg"), 403);
        expect(put(ticket, PNG.length, "image/png"), 200);

        String workItem = Ids.newId();
        var attached = fileService.attach(owner, List.of(ticket.path("id").asText()), FileOwner.WORK_ITEM, workItem);
        assertThat(attached).singleElement().satisfies(file -> {
            assertThat(file.id()).isEqualTo(ticket.path("id").asText());
            assertThat(file.filename()).isEqualTo("화면.png");
            assertThat(file.image()).isTrue();
            assertThat(file.dominantColor()).isEqualTo("#aabbcc");
            assertThat(file.width()).isEqualTo(2);
            assertThat(file.height()).isEqualTo(1);
        });
        assertThat(fileService
                        .attachmentsOf(FileOwner.WORK_ITEM, List.of(workItem))
                        .get(workItem))
                .extracting(file -> file.id())
                .containsExactly(ticket.path("id").asText());

        URI url = fileService
                .openUrl(FileOwner.WORK_ITEM, workItem, ticket.path("id").asText(), false)
                .orElseThrow();
        var opened = HttpClient.newHttpClient()
                .send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port + url))
                                .build(),
                        HttpResponse.BodyHandlers.ofByteArray());
        assertThat(opened.statusCode()).isEqualTo(200);
        assertThat(opened.body()).isEqualTo(PNG);
        assertThat(opened.headers().firstValue("Content-Type")).hasValue("image/png");
        assertThat(opened.headers().firstValue("X-Content-Type-Options")).hasValue("nosniff");
        assertThat(opened.headers().firstValue("Content-Disposition").orElseThrow())
                .startsWith("inline");
        // A changed URL opens nothing.
        var altered = HttpClient.newHttpClient()
                .send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port
                                        + url.toString().replace("type=image", "type=text")))
                                .build(),
                        HttpResponse.BodyHandlers.discarding());
        assertThat(altered.statusCode()).isEqualTo(403);
        // An upload binds once; another owner cannot open it under its own name.
        assertThat(code(() -> fileService.attach(
                        owner, List.of(ticket.path("id").asText()), FileOwner.WORK_ITEM, Ids.newId())))
                .isEqualTo("FILE_UPLOAD_MISSING");
        assertThat(fileService.openUrl(
                        FileOwner.COMMENT, workItem, ticket.path("id").asText(), false))
                .isEmpty();
    }

    @Test
    void uploadsAreRefusedByFormatSizeAndWhoSentThem() throws Exception {
        var refused = http(session, "POST", "/api/v1/files/uploads", body("drawing.svg", 10, null, null, null));
        expect(refused, 400);
        assertThat(refused.body()).contains("올릴 수 없는 파일 형식입니다");
        var heavy = http(
                session, "POST", "/api/v1/files/uploads", body("big.pdf", 20L * 1024 * 1024 + 1, null, null, null));
        expect(heavy, 400);
        assertThat(heavy.body()).contains("20MB");
        expect(http(session, "POST", "/api/v1/files/uploads", body("a.png", 3, "red", null, null)), 400);

        // A page dressed as a picture: its bytes do not start as a PNG does.
        byte[] page = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
        var disguised = upload(session, "cat.png", page.length, null, null, null);
        expect(put(disguised, page, "image/png"), 200);
        assertThatThrownBy(() -> fileService.attach(
                        owner, List.of(disguised.path("id").asText()), FileOwner.WORK_ITEM, Ids.newId()))
                .isInstanceOf(DomainRuleViolation.class)
                .hasMessageContaining("파일 형식과 맞지 않습니다");

        var unsent = upload(session, "later.pdf", 10, null, null, null);
        assertThat(code(() -> fileService.attach(
                        owner, List.of(unsent.path("id").asText()), FileOwner.WORK_ITEM, Ids.newId())))
                .isEqualTo("FILE_NOT_STORED");

        var other = identity("other");
        var theirs = upload(login(other), "theirs.png", PNG.length, null, null, null);
        expect(put(theirs, PNG, "image/png"), 200);
        assertThat(code(() -> fileService.attach(
                        owner, List.of(theirs.path("id").asText()), FileOwner.WORK_ITEM, Ids.newId())))
                .isEqualTo("FILE_UPLOAD_MISSING");

        // Without a session no upload starts: the CSRF check refuses it before authentication does.
        Integer before = jdbcTemplate.queryForObject("SELECT count(*) FROM pending_upload", Integer.class);
        var anonymous =
                http(HttpClient.newHttpClient(), "POST", "/api/v1/files/uploads", body("a.pdf", 10, null, null, null));
        assertThat(anonymous.statusCode()).isIn(401, 403);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM pending_upload", Integer.class))
                .isEqualTo(before);
    }

    @Test
    void discardedFilesLoseTheirBytesUnlessACopyStillKeepsThem() throws Exception {
        String workItem = Ids.newId();
        String copyOwner = Ids.newId();
        String id = attachPng(workItem);
        String key = jdbcTemplate.queryForObject(
                "SELECT b.storage_key FROM blob b JOIN attachment a ON a.blob_id=b.blob_id WHERE a.attachment_id=?",
                String.class,
                id);
        var copies = fileService.copy(FileOwner.WORK_ITEM, workItem, copyOwner, List.of(id, Ids.newId()), owner);
        assertThat(copies).containsOnlyKeys(id);

        fileService.discard(FileOwner.WORK_ITEM, workItem, List.of(id), owner);
        assertThat(fileService.attachmentsOf(FileOwner.WORK_ITEM, List.of(workItem)))
                .isEmpty();
        assertThat(objectStorage.find(key)).isPresent();
        assertThat(fileService.openUrl(FileOwner.WORK_ITEM, copyOwner, copies.get(id), true))
                .isPresent();

        fileService.discardAll(FileOwner.WORK_ITEM, copyOwner, owner);
        assertThat(objectStorage.find(key)).isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT deleted_by FROM blob WHERE storage_key=?", String.class, key))
                .isEqualTo(owner.userId());
    }

    @Test
    void aPictureIsASquareJpegThatDecodesWholeAndReplacesTheLastOne() throws Exception {
        byte[] square = jpeg(64, 64);
        var first = upload(session, picture("me.jpg", square.length));
        expect(put(first, square, "image/jpeg"), 200);
        var picture = fileService.replacePicture(owner, first.path("id").asText(), FileOwner.USER, owner.userId(), 64);
        assertThat(picture.width()).isEqualTo(64);
        assertThat(picture.dominantColor()).isEqualTo("#112233");

        byte[] wide = jpeg(80, 40);
        var second = upload(session, picture("wide.jpg", wide.length));
        expect(put(second, wide, "image/jpeg"), 200);
        assertThatThrownBy(() -> fileService.replacePicture(
                        owner, second.path("id").asText(), FileOwner.USER, owner.userId(), 64))
                .isInstanceOf(DomainRuleViolation.class);

        byte[] broken = new byte[200];
        broken[0] = (byte) 0xFF;
        broken[1] = (byte) 0xD8;
        broken[2] = (byte) 0xFF;
        var third = upload(session, picture("broken.jpg", broken.length));
        expect(put(third, broken, "image/jpeg"), 200);
        assertThat(code(() -> fileService.replacePicture(
                        owner, third.path("id").asText(), FileOwner.USER, owner.userId(), 64)))
                .isEqualTo("FILE_PICTURE_INVALID");

        var fourth = upload(session, picture("again.jpg", square.length));
        expect(put(fourth, square, "image/jpeg"), 200);
        fileService.replacePicture(owner, fourth.path("id").asText(), FileOwner.USER, owner.userId(), 64);
        assertThat(fileService
                        .attachmentsOf(FileOwner.USER, List.of(owner.userId()))
                        .get(owner.userId()))
                .extracting(file -> file.id())
                .containsExactly(fourth.path("id").asText());

        // A picture must be a JPEG.
        expect(http(session, "POST", "/api/v1/files/uploads", picture("me.png", 10)), 400);
    }

    @Test
    void membersAndWorkspacesShowTheirPictureAtAnAddressBrowsersKeep() throws Exception {
        byte[] square = jpeg(Picture.SIDE, Picture.SIDE);
        // The member's own picture: sent, made theirs, and shown with its colour on what lists them.
        var mine = upload(session, picture("me.jpg", square.length));
        expect(put(mine, square, "image/jpeg"), 200);
        String avatar = mine.path("id").asText();
        expect(http(session, "PUT", "/api/v1/me/avatar", "{\"uploadId\":\"" + avatar + "\"}"), 204);
        var me = JSON.readTree(http(session, "GET", "/api/v1/me", null).body());
        assertThat(me.path("avatar").path("id").asText()).isEqualTo(avatar);
        assertThat(me.path("avatar").path("color").asText()).isEqualTo("#112233");
        var created = http(
                session,
                "POST",
                "/api/v1/workspaces",
                "{\"name\":\"Pictures\",\"slug\":\"pictures-" + Ids.newId().toLowerCase(Locale.ROOT) + "\"}");
        expect(created, 201);
        String location = created.headers().firstValue("Location").orElseThrow();
        String workspace = location.substring(location.lastIndexOf('/') + 1);
        var members = JSON.readTree(http(session, "GET", "/api/v1/workspaces/" + workspace + "/members", null)
                .body());
        assertThat(members.path("items").get(0).path("avatar").path("id").asText())
                .isEqualTo(avatar);
        var bytes = image(session, "/api/v1/users/" + owner.userId() + "/avatar/" + avatar);
        expect(bytes, 200);
        assertThat(bytes.headers().firstValue("Content-Type")).hasValue("image/jpeg");
        assertThat(bytes.headers().firstValue("Cache-Control").orElse("")).contains("immutable", "private");

        // The workspace's logo, which only its admins change and only its members see.
        var logo = upload(session, picture("logo.jpg", square.length));
        expect(put(logo, square, "image/jpeg"), 200);
        String logoId = logo.path("id").asText();
        expect(
                http(session, "PUT", "/api/v1/workspaces/" + workspace + "/logo", "{\"uploadId\":\"" + logoId + "\"}"),
                204);
        var space = JSON.readTree(
                http(session, "GET", "/api/v1/workspaces/" + workspace, null).body());
        assertThat(space.path("logo").path("id").asText()).isEqualTo(logoId);
        var spaces = JSON.readTree(
                http(session, "GET", "/api/v1/me/workspaces", null).body());
        assertThat(spaces.path("items").get(0).path("logo").path("id").asText()).isEqualTo(logoId);
        expect(image(session, "/api/v1/workspaces/" + workspace + "/logo/" + logoId), 200);
        var stranger = login(identity("member"));
        expect(image(stranger, "/api/v1/workspaces/" + workspace + "/logo/" + logoId), 404);
        expect(http(stranger, "DELETE", "/api/v1/workspaces/" + workspace + "/logo", null), 404);

        // Taken away, both fall back to their drawn stand-ins.
        expect(http(session, "DELETE", "/api/v1/me/avatar", null), 204);
        expect(http(session, "DELETE", "/api/v1/workspaces/" + workspace + "/logo", null), 204);
        me = JSON.readTree(http(session, "GET", "/api/v1/me", null).body());
        assertThat(me.path("avatar").isMissingNode() || me.path("avatar").isNull())
                .isTrue();
        space = JSON.readTree(
                http(session, "GET", "/api/v1/workspaces/" + workspace, null).body());
        assertThat(space.path("logo").isMissingNode() || space.path("logo").isNull())
                .isTrue();
    }

    @Test
    void cleanupRemovesUploadsNobodyTookWithTheirBytes() throws Exception {
        var stale = upload(session, "old.pdf", 5, null, null, null);
        expect(put(stale, "%PDF-".getBytes(StandardCharsets.US_ASCII), "application/pdf"), 200);
        var fresh = upload(session, "new.pdf", 5, null, null, null);
        String key = jdbcTemplate.queryForObject(
                "SELECT storage_key FROM pending_upload WHERE pending_upload_id=?",
                String.class,
                stale.path("id").asText());
        jdbcTemplate.update(
                "UPDATE pending_upload SET created_at=? WHERE pending_upload_id=?",
                InstantTextBinding.text(Instant.now().minus(Duration.ofDays(2))),
                stale.path("id").asText());

        assertThat(fileService.cleanUp()).isEqualTo(1);
        assertThat(objectStorage.find(key)).isEmpty();
        assertThat(jdbcTemplate.queryForList("SELECT pending_upload_id FROM pending_upload", String.class))
                .containsExactly(fresh.path("id").asText());
    }

    @Test
    void capabilitiesAndTheAdminSeeTheStorageInUse() throws Exception {
        var capabilities = JSON.readTree(http(HttpClient.newHttpClient(), "GET", "/api/v1/capabilities", null)
                .body());
        assertThat(capabilities.path("objectStorage").asBoolean()).isTrue();
        assertThat(capabilities.path("fileMaxBytes").asLong()).isEqualTo(20L * 1024 * 1024);

        expect(http(session, "GET", "/api/v1/admin/storage", null), 403);
        jdbcTemplate.update("UPDATE iam_user SET is_instance_admin=1 WHERE iam_user_id=?", owner.userId());
        var storage = http(login(owner), "GET", "/api/v1/admin/storage", null);
        expect(storage, 200);
        var view = JSON.readTree(storage.body());
        assertThat(view.path("adapter").asText()).isEqualTo("local");
        assertThat(view.path("available").asBoolean()).isTrue();
        assertThat(view.path("problem").isNull() || view.path("problem").isMissingNode())
                .isTrue();
    }

    private String attachPng(String workItem) throws Exception {
        var ticket = upload(session, "shot.png", PNG.length, null, null, null);
        expect(put(ticket, PNG, "image/png"), 200);
        return fileService
                .attach(owner, List.of(ticket.path("id").asText()), FileOwner.WORK_ITEM, workItem)
                .getFirst()
                .id();
    }

    private JsonNode upload(HttpClient client, String filename, long size, String color, Integer width, Integer height)
            throws Exception {
        return upload(client, body(filename, size, color, width, height));
    }

    private JsonNode upload(HttpClient client, String body) throws Exception {
        var response = http(client, "POST", "/api/v1/files/uploads", body);
        expect(response, 201);
        return JSON.readTree(response.body());
    }

    private static String body(String filename, long size, String color, Integer width, Integer height) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("filename", filename);
        body.put("size", size);
        if (color != null) body.put("dominantColor", color);
        if (width != null) body.put("width", width);
        if (height != null) body.put("height", height);
        return JSON.writeValueAsString(body);
    }

    private static String picture(String filename, long size) {
        return JSON.writeValueAsString(
                Map.of("filename", filename, "size", size, "purpose", "picture", "dominantColor", "#112233"));
    }

    private HttpResponse<String> put(JsonNode ticket, int length, String type) throws Exception {
        byte[] bytes = new byte[length];
        System.arraycopy(PNG, 0, bytes, 0, Math.min(length, PNG.length));
        return put(ticket, bytes, type);
    }

    private HttpResponse<String> put(JsonNode ticket, byte[] bytes, String type) throws Exception {
        return HttpClient.newHttpClient()
                .send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port
                                        + ticket.path("url").asText()))
                                .header("Content-Type", type)
                                .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes))
                                .build(),
                        HttpResponse.BodyHandlers.ofString());
    }

    private static byte[] jpeg(int width, int height) throws Exception {
        var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", out);
        return out.toByteArray();
    }

    private static String code(Runnable call) {
        try {
            call.run();
        } catch (BusinessException failure) {
            return failure.errorCode().code();
        }
        throw new AssertionError("expected a business error");
    }

    private CurrentUser identity(String role) {
        String user = Ids.newId();
        String credential = Ids.newId();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)",
                user,
                role + user.toLowerCase(Locale.ROOT) + "@example.test",
                role,
                now,
                now);
        jdbcTemplate.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES (?,?,?)",
                user,
                passwordEncoder.encode(role + " password phrase for files"),
                now);
        return new CurrentUser(user, false, CurrentUser.Method.SESSION, credential, null, false);
    }

    private HttpClient login(CurrentUser actor) throws Exception {
        var row = jdbcTemplate.queryForMap("SELECT email, name FROM iam_user WHERE iam_user_id=?", actor.userId());
        var client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build();
        expect(
                http(
                        client,
                        "POST",
                        "/api/v1/auth/sessions",
                        JSON.writeValueAsString(Map.of(
                                "email",
                                row.get("email"),
                                "password",
                                row.get("name") + " password phrase for files"))),
                201);
        return client;
    }

    private static void expect(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(status);
    }

    /** A picture as an image element asks for it. */
    private HttpResponse<String> image(HttpClient client, String path) throws Exception {
        return client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                        .header("Accept", "image/avif,image/webp,image/*,*/*;q=0.8")
                        .build(),
                HttpResponse.BodyHandlers.ofString(StandardCharsets.ISO_8859_1));
    }

    private HttpResponse<String> http(HttpClient client, String method, String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json");
        if (!method.equals("GET")) {
            var csrf = client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/csrf"))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            request.header("Origin", "http://localhost:8080")
                    .header(
                            "X-CSRF-Token",
                            JSON.readTree(csrf.body()).path("token").asText());
        }
        if (body != null) request.header("Content-Type", "application/json");
        return client.send(
                request.method(
                                method,
                                body == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }
}
