package io.github.goraebap.bit.module.coderef.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.goraebap.bit.module.coderef.domain.Remote;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class HostAdaptersTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private final GitHubHost github = new GitHubHost(JSON);
    private final GitLabHost gitlab = new GitLabHost(JSON);
    private final GiteaHost gitea = new GiteaHost(JSON);

    @Test
    void eachHostChecksItsOwnSignature() throws Exception {
        byte[] body = "{\"a\":1}".getBytes(StandardCharsets.UTF_8);
        String hex = hmac(body, "s3cret");
        assertThat(github.signed(Map.of("x-hub-signature-256", "sha256=" + hex), body, "s3cret"))
                .isTrue();
        assertThat(github.signed(Map.of("x-hub-signature-256", "sha256=" + hex), body, "other"))
                .isFalse();
        assertThat(github.signed(Map.of(), body, "s3cret")).isFalse();
        assertThat(gitea.signed(Map.of("x-gitea-signature", hex), body, "s3cret"))
                .isTrue();
        assertThat(gitlab.signed(Map.of("x-gitlab-token", "s3cret"), body, "s3cret"))
                .isTrue();
        assertThat(gitlab.signed(Map.of("x-gitlab-token", "nope"), body, "s3cret"))
                .isFalse();
    }

    @Test
    void gitHubPushesPullRequestsIssuesAndCommentsReadAsCommonEvents() {
        var push = github.read(Map.of("x-github-event", "push"), bytes("""
                {"ref":"refs/heads/bit-1-login","deleted":false,"sender":{"login":"alice"},
                 "repository":{"html_url":"https://github.com/acme/app"},
                 "commits":[{"id":"abc1234def","message":"BIT-1 fix login\\n\\nmore","url":"https://github.com/acme/app/commit/abc","author":{"name":"Alice"}}]}"""));
        assertThat(push).singleElement().isInstanceOfSatisfying(Remote.Push.class, p -> {
            assertThat(p.branch()).isEqualTo("bit-1-login");
            assertThat(p.branchUrl()).isEqualTo("https://github.com/acme/app/tree/bit-1-login");
            assertThat(p.commits())
                    .singleElement()
                    .extracting(Remote.Commit::sha)
                    .isEqualTo("abc1234def");
        });
        assertThat(github.read(Map.of("x-github-event", "push"), bytes("{\"ref\":\"refs/tags/v1\",\"commits\":[]}")))
                .isEmpty();

        var merged = github.read(Map.of("x-github-event", "pull_request"), bytes("""
                {"action":"closed","sender":{"login":"bob"},"pull_request":{"number":12,"title":"Login","body":"Closes #5",
                 "html_url":"https://github.com/acme/app/pull/12","merged":true,"draft":false,"head":{"ref":"bit-1-login"}}}"""));
        assertThat(merged).singleElement().isInstanceOfSatisfying(Remote.PullEvent.class, p -> {
            assertThat(p.action()).isEqualTo("merged");
            assertThat(p.number()).isEqualTo("12");
            assertThat(p.branch()).isEqualTo("bit-1-login");
        });

        var labeled = github.read(Map.of("x-github-event", "issues"), bytes("""
                {"action":"labeled","sender":{"login":"bob"},"issue":{"number":5,"title":"T","body":"B","state":"open",
                 "html_url":"https://github.com/acme/app/issues/5","labels":[{"name":"priority:high"}],"user":{"login":"bob"}}}"""));
        assertThat(labeled).singleElement().isInstanceOfSatisfying(Remote.IssueEvent.class, i -> {
            assertThat(i.action()).isEqualTo("edited");
            assertThat(i.labels()).containsExactly("priority:high");
            assertThat(i.fromPull()).isFalse();
        });

        var onPull = github.read(Map.of("x-github-event", "issue_comment"), bytes("""
                {"action":"created","issue":{"number":12,"pull_request":{}},"comment":{"body":"x","user":{"login":"a","type":"User"}}}"""));
        assertThat(onPull).isEmpty();
        var bot = github.read(Map.of("x-github-event", "issue_comment"), bytes("""
                {"action":"created","issue":{"number":5},"comment":{"body":"x","html_url":"u","user":{"login":"ci","type":"Bot"}}}"""));
        assertThat(bot).singleElement().isInstanceOfSatisfying(Remote.CommentEvent.class, c -> assertThat(c.bot())
                .isTrue());
    }

    @Test
    void gitLabMergeRequestsAndNotesReadAsCommonEvents() {
        var ready = gitlab.read(Map.of("x-gitlab-event", "Merge Request Hook"), bytes("""
                {"user":{"username":"carol"},"object_attributes":{"action":"update","iid":3,"title":"BIT-2 search","description":"",
                 "url":"https://gitlab.com/g/p/-/merge_requests/3","source_branch":"feat","draft":false},
                 "changes":{"draft":{"previous":true,"current":false}}}"""));
        assertThat(ready).singleElement().isInstanceOfSatisfying(Remote.PullEvent.class, p -> assertThat(p.action())
                .isEqualTo("ready"));

        var note = gitlab.read(Map.of("x-gitlab-event", "Note Hook"), bytes("""
                {"user":{"username":"carol"},"object_attributes":{"noteable_type":"Issue","note":"hello","url":"u"},"issue":{"iid":9}}"""));
        assertThat(note).singleElement().isInstanceOfSatisfying(Remote.CommentEvent.class, c -> {
            assertThat(c.number()).isEqualTo("9");
            assertThat(c.author()).isEqualTo("carol");
        });
        assertThat(gitlab.read(Map.of("x-gitlab-event", "Issue Hook"), bytes("""
                {"object_attributes":{"action":"open","iid":1,"confidential":true}}""")))
                .isEmpty();
    }

    @Test
    void giteaIssuesReadAsCommonEvents() {
        var closed = gitea.read(Map.of("x-gitea-event", "issues"), bytes("""
                {"action":"closed","sender":{"login":"dan"},"issue":{"number":4,"title":"T","body":null,"state":"closed",
                 "html_url":"https://git.example/o/r/issues/4","labels":[],"user":{"login":"dan"}}}"""));
        assertThat(closed).singleElement().isInstanceOfSatisfying(Remote.IssueEvent.class, i -> {
            assertThat(i.action()).isEqualTo("closed");
            assertThat(i.number()).isEqualTo("4");
        });
    }

    private static byte[] bytes(String json) {
        return json.getBytes(StandardCharsets.UTF_8);
    }

    private static String hmac(byte[] body, String secret) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(body));
    }
}
