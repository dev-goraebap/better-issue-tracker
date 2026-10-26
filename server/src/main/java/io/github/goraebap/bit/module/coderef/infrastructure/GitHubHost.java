package io.github.goraebap.bit.module.coderef.infrastructure;

import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.at;
import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.bool;
import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.s;

import io.github.goraebap.bit.module.coderef.domain.GitHost;
import io.github.goraebap.bit.module.coderef.domain.GitHostException;
import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.coderef.domain.Remote;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** GitHub's REST API (github.com or Enterprise Server at its own address) with a personal or fine-grained token. */
@Component
class GitHubHost implements GitHost {
    private final HostHttp http;

    GitHubHost(JsonMapper jsonMapper) {
        this.http = new HostHttp(jsonMapper);
    }

    @Override
    public Provider provider() {
        return Provider.github;
    }

    @Override
    public Remote.Repository verify(Remote.Connection c) {
        var repo = http.get(api(c) + "/repos/" + c.repository(), headers(c));
        String login;
        try {
            login = s(http.get(api(c) + "/user", headers(c)), "login");
        } catch (GitHostException fineGrained) {
            login = null;
        }
        return new Remote.Repository(s(repo, "full_name"), s(repo, "id"), s(repo, "html_url"), login);
    }

    @Override
    public List<Remote.Issue> openIssues(Remote.Connection c, int limit) {
        var found = new ArrayList<Remote.Issue>();
        String url = api(c) + "/repos/" + c.repository() + "/issues?state=open&sort=created&direction=asc&per_page=100";
        while (url != null && found.size() < limit) {
            var reply = http.getWithLinks(url, headers(c));
            for (JsonNode each : reply.body()) {
                if (each.has("pull_request")) continue;
                found.add(issue(each));
                if (found.size() >= limit) break;
            }
            url = reply.next();
        }
        return found;
    }

    @Override
    public List<Remote.Comment> comments(Remote.Connection c, String number) {
        var found = new ArrayList<Remote.Comment>();
        String url = api(c) + "/repos/" + c.repository() + "/issues/" + number + "/comments?per_page=100";
        while (url != null && found.size() < 500) {
            var reply = http.getWithLinks(url, headers(c));
            for (JsonNode each : reply.body())
                found.add(new Remote.Comment(
                        s(each, "id"), s(each, "body"), at(each, "/user/login"), s(each, "html_url")));
            url = reply.next();
        }
        return found;
    }

    @Override
    public List<Remote.Pull> openPulls(Remote.Connection c, int limit) {
        var found = new ArrayList<Remote.Pull>();
        String url = api(c) + "/repos/" + c.repository() + "/pulls?state=open&per_page=100";
        while (url != null && found.size() < limit) {
            var reply = http.getWithLinks(url, headers(c));
            for (JsonNode each : reply.body()) {
                found.add(new Remote.Pull(
                        s(each, "number"),
                        s(each, "title"),
                        s(each, "body"),
                        s(each, "html_url"),
                        at(each, "/head/ref"),
                        bool(each, "/draft"),
                        at(each, "/user/login")));
                if (found.size() >= limit) break;
            }
            url = reply.next();
        }
        return found;
    }

    @Override
    public Remote.Issue createIssue(Remote.Connection c, String title, String body, List<String> labels) {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("title", title);
        payload.put("body", body);
        payload.put("labels", labels);
        return issue(http.send("POST", api(c) + "/repos/" + c.repository() + "/issues", headers(c), payload, true));
    }

    @Override
    public void updateIssue(Remote.Connection c, String number, Remote.IssuePatch patch) {
        var payload = new LinkedHashMap<String, Object>();
        if (patch.title() != null) payload.put("title", patch.title());
        if (patch.body() != null) payload.put("body", patch.body());
        if (patch.open() != null) payload.put("state", patch.open() ? "open" : "closed");
        if (patch.labels() != null) payload.put("labels", patch.labels());
        if (payload.isEmpty()) return;
        http.send("PATCH", api(c) + "/repos/" + c.repository() + "/issues/" + number, headers(c), payload, true);
    }

    @Override
    public void comment(Remote.Connection c, String number, String body) {
        http.send(
                "POST",
                api(c) + "/repos/" + c.repository() + "/issues/" + number + "/comments",
                headers(c),
                Map.of("body", body),
                true);
    }

    @Override
    public Optional<String> createWebhook(Remote.Connection c, String url, String secret) {
        var config = Map.of("url", url, "content_type", "json", "secret", secret, "insecure_ssl", "0");
        var payload = Map.of(
                "name",
                "web",
                "active",
                true,
                "events",
                List.of("push", "pull_request", "issues", "issue_comment"),
                "config",
                config);
        try {
            return Optional.ofNullable(s(
                    http.send("POST", api(c) + "/repos/" + c.repository() + "/hooks", headers(c), payload, true),
                    "id"));
        } catch (GitHostException refused) {
            if (refused.status() == 403 || refused.status() == 404 || refused.status() == 422) return Optional.empty();
            throw refused;
        }
    }

    @Override
    public void deleteWebhook(Remote.Connection c, String webhookId) {
        try {
            http.send("DELETE", api(c) + "/repos/" + c.repository() + "/hooks/" + webhookId, headers(c), null, false);
        } catch (GitHostException gone) {
            if (gone.status() != 404) throw gone;
        }
    }

    @Override
    public boolean signed(Map<String, String> headers, byte[] body, String secret) {
        String signature = headers.get("x-hub-signature-256");
        return signature != null
                && signature.startsWith("sha256=")
                && HostHttp.hmac(body, secret, signature.substring(7));
    }

    @Override
    public List<Remote.Event> read(Map<String, String> headers, byte[] body) {
        String event = headers.getOrDefault("x-github-event", "");
        var p = http.json().readTree(body);
        String sender = at(p, "/sender/login");
        return switch (event) {
            case "push" -> push(p, sender);
            case "pull_request" -> pull(p, sender);
            case "issues" -> issueEvent(p, sender);
            case "issue_comment" -> {
                if (!"created".equals(s(p, "action"))
                        || p.at("/issue/pull_request").isObject()) yield List.of();
                yield List.of(new Remote.CommentEvent(
                        at(p, "/issue/number"),
                        at(p, "/comment/body"),
                        at(p, "/comment/html_url"),
                        at(p, "/comment/user/login"),
                        "Bot".equals(at(p, "/comment/user/type"))));
            }
            default -> List.of();
        };
    }

    private List<Remote.Event> push(JsonNode p, String sender) {
        String ref = s(p, "ref");
        if (ref == null || !ref.startsWith("refs/heads/") || bool(p, "/deleted")) return List.of();
        String branch = ref.substring("refs/heads/".length());
        var commits = new ArrayList<Remote.Commit>();
        for (JsonNode each : p.path("commits"))
            commits.add(new Remote.Commit(s(each, "id"), s(each, "message"), s(each, "url"), at(each, "/author/name")));
        String base = at(p, "/repository/html_url");
        return List.of(new Remote.Push(branch, base == null ? null : base + "/tree/" + branch, commits, sender));
    }

    private List<Remote.Event> pull(JsonNode p, String sender) {
        String action = s(p, "action");
        if (action == null) return List.of();
        action = switch (action) {
            case "closed" -> bool(p, "/pull_request/merged") ? "merged" : "closed";
            case "ready_for_review" -> "ready";
            case "opened", "reopened", "edited" -> action;
            default -> null;
        };
        if (action == null) return List.of();
        var pr = p.path("pull_request");
        return List.of(new Remote.PullEvent(
                action,
                s(pr, "number"),
                s(pr, "title"),
                s(pr, "body"),
                s(pr, "html_url"),
                at(pr, "/head/ref"),
                bool(pr, "/draft"),
                sender));
    }

    private List<Remote.Event> issueEvent(JsonNode p, String sender) {
        String action = s(p, "action");
        if (action == null) return List.of();
        action = switch (action) {
            case "opened", "reopened", "closed", "edited" -> action;
            case "labeled", "unlabeled" -> "edited";
            default -> null;
        };
        if (action == null) return List.of();
        var issue = issue(p.path("issue"));
        return List.of(new Remote.IssueEvent(
                action,
                issue.number(),
                issue.title(),
                issue.body(),
                issue.url(),
                issue.labels(),
                p.at("/issue/pull_request").isObject(),
                sender));
    }

    private static Remote.Issue issue(JsonNode each) {
        var labels = new ArrayList<String>();
        for (JsonNode label : each.path("labels")) labels.add(s(label, "name"));
        return new Remote.Issue(
                s(each, "number"),
                s(each, "title"),
                s(each, "body"),
                s(each, "html_url"),
                "open".equals(s(each, "state")),
                labels,
                at(each, "/user/login"));
    }

    /** github.com's API lives at api.github.com; Enterprise Server's under /api/v3 of its own address. */
    private static String api(Remote.Connection c) {
        String base = c.baseUrl().replaceAll("/+$", "");
        return base.equals("https://github.com") ? "https://api.github.com" : base + "/api/v3";
    }

    private static Map<String, String> headers(Remote.Connection c) {
        return Map.of(
                "Authorization", "Bearer " + c.token(),
                "Accept", "application/vnd.github+json",
                "X-GitHub-Api-Version", "2022-11-28");
    }
}
