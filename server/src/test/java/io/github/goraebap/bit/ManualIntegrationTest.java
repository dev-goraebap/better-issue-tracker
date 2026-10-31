package io.github.goraebap.bit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.manual.application.ManualQuery;
import io.github.goraebap.bit.module.manual.application.ManualRequests;
import io.github.goraebap.bit.module.manual.application.ManualService;
import io.github.goraebap.bit.module.manual.application.ManualViews;
import io.github.goraebap.bit.module.manual.domain.ManualContent;
import io.github.goraebap.bit.module.project.application.ProjectService;
import io.github.goraebap.bit.module.workspace.application.WorkspaceService;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.persistence.InstantTextBinding;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@Tag("integration")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.secrets.generate=false", "app.auth.secret=manual-integration-secret-at-least-32-characters"})
class ManualIntegrationTest {
    @Autowired
    private ManualService manualService;

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:"
                + Path.of("build/test-db/manual-" + Ids.newId() + ".db").toAbsolutePath();
        registry.add("spring.datasource.url", () -> url);
    }

    @Test
    void listFiltersCountsAndCursorUseTheSameScopeWithoutSendingBodies() {
        var owner = identity();
        String workspace = workspaceService.create(owner, "Listing", "listing-" + Ids.newId());
        String project = projectService.create(owner, workspace, "Project", "LST", null);
        var content = new ManualContent(List.of(), List.of(), List.of());
        for (String title : List.of("Alpha", "Beta", "Gamma")) {
            manualService.save(
                    owner,
                    workspace,
                    new ManualRequests.Save(
                            Ids.newId(),
                            title.equals("Gamma") ? null : project,
                            null,
                            title,
                            "점검 안내",
                            "book",
                            title.equals("Beta") ? "#654321" : "#123456",
                            content,
                            List.of()),
                    true);
        }
        var search = new ManualQuery.Search("점검", null, null, "title", true);
        var first = manualService.search(owner, workspace, null, search, null, 1);
        assertThat(first.total()).isEqualTo(3);
        assertThat(first.items().getFirst().title()).isEqualTo("Alpha");
        var second = manualService.search(owner, workspace, null, search, first.nextCursor(), 1);
        assertThat(second.items().getFirst().title()).isEqualTo("Beta");
        var last = manualService.search(owner, workspace, null, search, second.nextCursor(), 1);
        assertThat(last.items().getFirst().title()).isEqualTo("Gamma");
        assertThat(last.nextCursor()).isNull();
        assertThat(manualService
                        .search(
                                owner,
                                workspace,
                                null,
                                new ManualQuery.Search(null, "workspace", null, "title", true),
                                null,
                                100)
                        .total())
                .isEqualTo(1);
        assertThat(manualService
                        .search(
                                owner,
                                workspace,
                                project,
                                new ManualQuery.Search(null, null, "#123456", "updated", false),
                                null,
                                100)
                        .total())
                .isEqualTo(1);
    }

    @Test
    void scopePermissionsConflictAndProvenanceArePreserved() {
        var owner = identity();
        String workspace = workspaceService.create(owner, "Manual test", "manual-" + Ids.newId());
        String project = projectService.create(owner, workspace, "Project", "MAN", null);
        String id = Ids.newId();
        var content = new ManualContent(
                List.of(new ManualContent.Section("start", "시작")),
                List.of(new ManualContent.Page("welcome", "안내", "원문", "start", null)),
                List.of());
        manualService.save(
                owner,
                workspace,
                new ManualRequests.Save(id, project, null, "설명서", "설명", "s:notebook-2", "#bb87fc", content, List.of()),
                true);
        var saved = manualService.get(owner, workspace, id);
        assertThat(saved.version()).isZero();
        assertThat(saved.content().pages().getFirst().updatedAt()).isNotNull();
        assertThat(manualService.list(owner, workspace, null, null, 100).items())
                .hasSize(1);
        assertThat(manualService.list(owner, workspace, project, null, 100).items())
                .hasSize(1);

        var viewer = identity();
        membership(viewer, workspace, "viewer");
        assertThat(manualService.get(viewer, workspace, id).canEdit()).isFalse();
        assertThat(manualService.list(viewer, workspace, null, null, 100).canCreate())
                .isFalse();
        assertThatThrownBy(() -> manualService.save(viewer, workspace, request(saved, saved.content()), false))
                .isInstanceOf(BusinessException.class);
        var outsider = identity();
        assertThatThrownBy(() -> manualService.get(outsider, workspace, id)).isInstanceOf(BusinessException.class);
        String otherWorkspace = workspaceService.create(owner, "Other", "other-" + Ids.newId());
        assertThatThrownBy(() -> manualService.get(owner, otherWorkspace, id)).isInstanceOf(BusinessException.class);

        var comment = new ManualContent.Comment(
                "opinion", "welcome", "개선 의견", true, Instant.EPOCH, "fake", "가짜", "fake", Instant.EPOCH, "fake");
        manualService.save(
                owner,
                workspace,
                request(
                        saved,
                        new ManualContent(
                                saved.content().sections(), saved.content().pages(), List.of(comment))),
                false);
        var updated = manualService.get(owner, workspace, id);
        var actual = updated.content().comments().getFirst();
        assertThat(actual.authorId()).isEqualTo(owner.userId());
        assertThat(actual.agentName()).isNull();
        assertThat(actual.resolved()).isFalse();
        assertThat(actual.createdAt()).isAfter(Instant.EPOCH);
        assertThatThrownBy(() -> manualService.save(owner, workspace, request(saved, saved.content()), false))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("초안");
        assertThat(manualService.get(owner, workspace, id).content().comments()).hasSize(1);
        manualService.delete(owner, workspace, id, updated.version());
        assertThat(manualService.list(owner, workspace, null, null, 100).items())
                .isEmpty();
        assertThatThrownBy(() -> manualService.get(owner, workspace, id)).isInstanceOf(BusinessException.class);
    }

    @Test
    void brokenStructuresForeignImagesAndDuplicateIdsAreRejectedWithoutSaving() {
        var owner = identity();
        String workspace = workspaceService.create(owner, "Checks", "checks-" + Ids.newId());
        String id = Ids.newId();
        var invalid = new ManualContent(
                List.of(),
                List.of(new ManualContent.Page("page", "제목", "![비공개](attachment:Abcdef1234)", "", null)),
                List.of());
        assertThatThrownBy(() -> manualService.save(
                        owner,
                        workspace,
                        new ManualRequests.Save(id, null, null, "설명서", "", "book", "#123456", invalid, List.of()),
                        true))
                .isInstanceOf(BusinessException.class);
        assertThat(manualService.list(owner, workspace, null, null, 100).items())
                .isEmpty();
        var duplicated = new ManualContent(
                List.of(new ManualContent.Section("same", "A"), new ManualContent.Section("same", "B")),
                List.of(),
                List.of());
        assertThatThrownBy(() -> manualService.save(
                        owner,
                        workspace,
                        new ManualRequests.Save(id, null, null, "설명서", "", "book", "#123456", duplicated, List.of()),
                        true))
                .isInstanceOf(IllegalArgumentException.class);
        var missingSection = new ManualContent(
                List.of(), List.of(new ManualContent.Page("page", "제목", "본문", "missing", null)), List.of());
        assertThatThrownBy(() -> manualService.save(
                        owner,
                        workspace,
                        new ManualRequests.Save(
                                id, null, null, "설명서", "", "book", "#123456", missingSection, List.of()),
                        true))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static ManualRequests.Save request(ManualViews.Detail d, ManualContent content) {
        return new ManualRequests.Save(
                d.id(),
                d.projectId(),
                d.version(),
                d.title(),
                d.description(),
                d.icon(),
                d.color(),
                content,
                List.of());
    }

    private CurrentUser identity() {
        String id = Ids.newId();
        String now = InstantTextBinding.text(Instant.now());
        jdbcTemplate.update(
                "INSERT INTO iam_user(iam_user_id,email,name,created_at,updated_at) VALUES(?,?,?,?,?)",
                id,
                id + "@example.test",
                "작성자",
                now,
                now);
        String credential = Ids.newId();
        jdbcTemplate.update(
                "INSERT INTO iam_password(iam_user_id,password_hash,changed_at) VALUES(?,?,?)", id, "test-hash", now);
        jdbcTemplate.update(
                "INSERT INTO iam_session(iam_session_id,iam_user_id,token_hash,expires_at,absolute_expires_at,last_seen_at,created_at) VALUES(?,?,?,?,?,?,?)",
                credential,
                id,
                credential,
                InstantTextBinding.text(Instant.now().plusSeconds(3600)),
                InstantTextBinding.text(Instant.now().plusSeconds(7200)),
                now,
                now);
        return new CurrentUser(id, false, CurrentUser.Method.SESSION, credential, null, false);
    }

    private void membership(CurrentUser actor, String workspace, String role) {
        jdbcTemplate.update(
                "INSERT INTO workspace_member(workspace_member_id,workspace_id,iam_user_id,role,joined_at) VALUES(?,?,?,?,?)",
                Ids.newId(),
                workspace,
                actor.userId(),
                role,
                InstantTextBinding.text(Instant.now()));
    }
}
