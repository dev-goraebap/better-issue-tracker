package io.github.goraebap.bit.module.coderef.infrastructure;

import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.at;
import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.bool;
import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.s;

import io.github.goraebap.bit.module.coderef.domain.GitHost;
import io.github.goraebap.bit.module.coderef.domain.GitHostException;
import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.coderef.domain.Remote;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Gitea's REST API v1 (and Forgejo's, which speaks it) at its own address, with an access token. */
@Component
class GiteaHost implements GitHost {
    private static final int PAGE = 50;
    private final HostHttp http;

    GiteaHost(JsonMapper jsonMapper) {
        this.http = new HostHttp(jsonMapper);
    }

    @Override
    public Provider provider() {
        return Provider.gitea;
    }

    @Override
    public Remote.Repository verify(Remote.Connection c) {
        var repo = http.get(repo(c), headers(c));
        String login;
        try {
            login = s(http.get(api(c) + "/user", headers(c)), "login");
        } catch (GitHostException scoped) {
            login = null;
        }
        return new Remote.Repository(s(repo, "full_name"), s(repo, "id"), s(repo, "html_url"), login);
    }

    @Override
    public List<Remote.Issue> openIssues(Remote.Connection c, int limit) {
        var found = new ArrayList<Remote.Issue>();
        for (int page = 1; found.size() < limit; page++) {
            var items =
                    http.get(repo(c) + "/issues?state=open&type=issues&limit=" + PAGE + "&page=" + page, headers(c));
            for (JsonNode each : items) {
                found.add(issue(each));
                if (found.size() >= limit) break;
            }
            if (items.size() < PAGE) break;
        }
        found.sort((a, b) -> Long.compare(Long.parseLong(a.number()), Long.parseLong(b.number())));
        return found;
    }

    @Override
    public List<Remote.Comment> comments(Remote.Connection c, String number) {
        var found = new ArrayList<Remote.Comment>();
        for (JsonNode each : http.get(repo(c) + "/issues/" + number + "/comments", headers(c)))
            found.add(new Remote.Comment(s(each, "id"), s(each, "body"), at(each, "/user/login"), s(each, "html_url")));
        return found;
    }

    @Override
    public List<Remote.Pull> openPulls(Remote.Connection c, int limit) {
        var found = new ArrayList<Remote.Pull>();
        for (int page = 1; found.size() < limit; page++) {
            var items = http.get(repo(c) + "/pulls?state=open&limit=" + PAGE + "&page=" + page, headers(c));
            for (JsonNode each : items) {
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
            if (items.size() < PAGE) break;
        }
        return found;
    }

    @Override
    public Remote.Issue createIssue(Remote.Connection c, String title, String body, List<String> labels) {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("title", title);
        payload.put("body", body);
        payload.put("labels", labelIds(c, labels));
        return issue(http.send("POST", repo(c) + "/issues", headers(c), payload, true));
    }

    @Override
    public void updateIssue(Remote.Connection c, String number, Remote.IssuePatch patch) {
        var payload = new LinkedHashMap<String, Object>();
        if (patch.title() != null) payload.put("title", patch.title());
        if (patch.body() != null) payload.put("body", patch.body());
        if (patch.open() != null) payload.put("state", patch.open() ? "open" : "closed");
        if (!payload.isEmpty()) http.send("PATCH", repo(c) + "/issues/" + number, headers(c), payload, true);
        // Gitea takes an issue's labels by id, through their own endpoint.
        if (patch.labels() != null)
            http.send(
                    "PUT",
                    repo(c) + "/issues/" + number + "/labels",
                    headers(c),
                    Map.of("labels", labelIds(c, patch.labels())),
                    true);
    }

    @Override
    public void comment(Remote.Connection c, String number, String body) {
        http.send("POST", repo(c) + "/issues/" + number + "/comments", headers(c), Map.of("body", body), true);
    }

    @Override
    public Optional<String> createWebhook(Remote.Connection c, String url, String secret) {
        var payload = Map.of(
                "type",
                "gitea",
                "active",
                true,
                "events",
                List.of("push", "pull_request", "issues", "issue_comment"),
                "config",
                Map.of("url", url, "content_type", "json", "secret", secret));
        try {
            return Optional.ofNullable(s(http.send("POST", repo(c) + "/hooks", headers(c), payload, true), "id"));
        } catch (GitHostException refused) {
            if (refused.status() == 403 || refused.status() == 404 || refused.status() == 422) return Optional.empty();
            throw refused;
        }
    }

    @Override
    public void deleteWebhook(Remote.Connection c, String webhookId) {
        try {
            http.send("DELETE", repo(c) + "/hooks/" + webhookId, headers(c), null, false);
        } catch (GitHostException gone) {
            if (gone.status() != 404) throw gone;
        }
    }

    @Override
    public boolean signed(Map<String, String> headers, byte[] body, String secret) {
        return HostHttp.hmac(body, secret, headers.get("x-gitea-signature"));
    }

    @Override
    public List<Remote.Event> read(Map<String, String> headers, byte[] body) {
        String event = headers.getOrDefault("x-gitea-event", "");
        var p = http.json().readTree(body);
        String sender = at(p, "/sender/login");
        return switch (event) {
            case "push" -> push(p, sender);
            case "pull_request" -> pull(p, sender);
            case "issues" -> issueEvent(p, sender);
            case "issue_comment" -> {
                if (!"created".equals(s(p, "action")) || bool(p, "/is_pull")) yield List.of();
                yield List.of(new Remote.CommentEvent(
                        at(p, "/issue/number"),
                        at(p, "/comment/body"),
                        at(p, "/comment/html_url"),
                        at(p, "/comment/user/login"),
                        false));
            }
            default -> List.of();
        };
    }

    private List<Remote.Event> push(JsonNode p, String sender) {
        String ref = s(p, "ref");
        if (ref == null
                || !ref.startsWith("refs/heads/")
                || "0000000000000000000000000000000000000000".equals(s(p, "after"))) return List.of();
        String branch = ref.substring("refs/heads/".length());
        var commits = new ArrayList<Remote.Commit>();
        for (JsonNode each : p.path("commits"))
            commits.add(new Remote.Commit(s(each, "id"), s(each, "message"), s(each, "url"), at(each, "/author/name")));
        String base = at(p, "/repository/html_url");
        return List.of(new Remote.Push(branch, base == null ? null : base + "/src/branch/" + branch, commits, sender));
    }

    private List<Remote.Event> pull(JsonNode p, String sender) {
        String action = String.valueOf(s(p, "action"));
        action = switch (action) {
            case "closed" -> bool(p, "/pull_request/merged") ? "merged" : "closed";
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
        String action =
                switch (String.valueOf(s(p, "action"))) {
                    case "opened", "reopened", "closed", "edited" -> s(p, "action");
                    case "label_updated", "label_cleared" -> "edited";
                    default -> null;
                };
        if (action == null) return List.of();
        var issue = issue(p.path("issue"));
        return List.of(new Remote.IssueEvent(
                action, issue.number(), issue.title(), issue.body(), issue.url(), issue.labels(), false, sender));
    }

    /** The repository's label ids for these names, making the missing ones in BIT's grey. */
    private List<Long> labelIds(Remote.Connection c, List<String> names) {
        if (names.isEmpty()) return List.of();
        var known = new HashMap<String, Long>();
        for (JsonNode each : http.get(repo(c) + "/labels?limit=200", headers(c)))
            known.put(
                    String.valueOf(s(each, "name")).toLowerCase(Locale.ROOT),
                    each.path("id").asLong());
        var ids = new ArrayList<Long>();
        for (String name : names) {
            Long id = known.get(name.toLowerCase(Locale.ROOT));
            if (id == null)
                id = http.send("POST", repo(c) + "/labels", headers(c), Map.of("name", name, "color", "#95959f"), true)
                        .path("id")
                        .asLong();
            ids.add(id);
        }
        return ids;
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

    private static String api(Remote.Connection c) {
        return c.baseUrl().replaceAll("/+$", "") + "/api/v1";
    }

    private static String repo(Remote.Connection c) {
        return api(c) + "/repos/" + c.repository();
    }

    private static Map<String, String> headers(Remote.Connection c) {
        return Map.of("Authorization", "token " + c.token());
    }
}
