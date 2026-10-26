package io.github.goraebap.bit.module.coderef.infrastructure;

import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.at;
import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.bool;
import static io.github.goraebap.bit.module.coderef.infrastructure.HostHttp.s;

import io.github.goraebap.bit.module.coderef.domain.GitHost;
import io.github.goraebap.bit.module.coderef.domain.GitHostException;
import io.github.goraebap.bit.module.coderef.domain.Provider;
import io.github.goraebap.bit.module.coderef.domain.Remote;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * GitLab's REST API v4 (gitlab.com or self-managed at its own address) with a personal, project or group token. Merge
 * requests are its pull requests; an issue's number is its iid in the project.
 */
@Component
class GitLabHost implements GitHost {
    private static final int PAGE = 100;
    private final HostHttp http;

    GitLabHost(JsonMapper jsonMapper) {
        this.http = new HostHttp(jsonMapper);
    }

    @Override
    public Provider provider() {
        return Provider.gitlab;
    }

    @Override
    public Remote.Repository verify(Remote.Connection c) {
        var project =
                http.get(api(c) + "/projects/" + URLEncoder.encode(c.repository(), StandardCharsets.UTF_8), headers(c));
        String login;
        try {
            login = s(http.get(api(c) + "/user", headers(c)), "username");
        } catch (GitHostException projectToken) {
            login = null;
        }
        return new Remote.Repository(s(project, "path_with_namespace"), s(project, "id"), s(project, "web_url"), login);
    }

    @Override
    public List<Remote.Issue> openIssues(Remote.Connection c, int limit) {
        var found = new ArrayList<Remote.Issue>();
        for (int page = 1; found.size() < limit; page++) {
            var items = http.get(
                    project(c) + "/issues?state=opened&order_by=created_at&sort=asc&per_page=" + PAGE + "&page=" + page,
                    headers(c));
            for (JsonNode each : items) {
                if (bool(each, "/confidential")) continue;
                found.add(issue(each));
                if (found.size() >= limit) break;
            }
            if (items.size() < PAGE) break;
        }
        return found;
    }

    @Override
    public List<Remote.Comment> comments(Remote.Connection c, String number) {
        var found = new ArrayList<Remote.Comment>();
        for (int page = 1; page <= 5; page++) {
            var items = http.get(
                    project(c) + "/issues/" + number + "/notes?sort=asc&per_page=" + PAGE + "&page=" + page,
                    headers(c));
            for (JsonNode each : items) {
                if (bool(each, "/system")) continue;
                found.add(new Remote.Comment(s(each, "id"), s(each, "body"), at(each, "/author/username"), null));
            }
            if (items.size() < PAGE) break;
        }
        return found;
    }

    @Override
    public List<Remote.Pull> openPulls(Remote.Connection c, int limit) {
        var found = new ArrayList<Remote.Pull>();
        for (int page = 1; found.size() < limit; page++) {
            var items = http.get(
                    project(c) + "/merge_requests?state=opened&per_page=" + PAGE + "&page=" + page, headers(c));
            for (JsonNode each : items) {
                found.add(new Remote.Pull(
                        s(each, "iid"),
                        s(each, "title"),
                        s(each, "description"),
                        s(each, "web_url"),
                        s(each, "source_branch"),
                        bool(each, "/draft") || bool(each, "/work_in_progress"),
                        at(each, "/author/username")));
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
        payload.put("description", body);
        payload.put("labels", String.join(",", labels));
        return issue(http.send("POST", project(c) + "/issues", headers(c), payload, true));
    }

    @Override
    public void updateIssue(Remote.Connection c, String number, Remote.IssuePatch patch) {
        var payload = new LinkedHashMap<String, Object>();
        if (patch.title() != null) payload.put("title", patch.title());
        if (patch.body() != null) payload.put("description", patch.body());
        if (patch.open() != null) payload.put("state_event", patch.open() ? "reopen" : "close");
        if (patch.labels() != null) payload.put("labels", String.join(",", patch.labels()));
        if (payload.isEmpty()) return;
        http.send("PUT", project(c) + "/issues/" + number, headers(c), payload, true);
    }

    @Override
    public void comment(Remote.Connection c, String number, String body) {
        http.send("POST", project(c) + "/issues/" + number + "/notes", headers(c), Map.of("body", body), true);
    }

    @Override
    public Optional<String> createWebhook(Remote.Connection c, String url, String secret) {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("url", url);
        payload.put("token", secret);
        payload.put("push_events", true);
        payload.put("merge_requests_events", true);
        payload.put("issues_events", true);
        payload.put("note_events", true);
        payload.put("enable_ssl_verification", url.startsWith("https://"));
        try {
            return Optional.ofNullable(s(http.send("POST", project(c) + "/hooks", headers(c), payload, true), "id"));
        } catch (GitHostException refused) {
            if (refused.status() == 403 || refused.status() == 404 || refused.status() == 422) return Optional.empty();
            throw refused;
        }
    }

    @Override
    public void deleteWebhook(Remote.Connection c, String webhookId) {
        try {
            http.send("DELETE", project(c) + "/hooks/" + webhookId, headers(c), null, false);
        } catch (GitHostException gone) {
            if (gone.status() != 404) throw gone;
        }
    }

    @Override
    public boolean signed(Map<String, String> headers, byte[] body, String secret) {
        return HostHttp.same(headers.get("x-gitlab-token"), secret);
    }

    @Override
    public List<Remote.Event> read(Map<String, String> headers, byte[] body) {
        String event = headers.getOrDefault("x-gitlab-event", "");
        var p = http.json().readTree(body);
        String sender = at(p, "/user/username");
        if (sender == null) sender = s(p, "user_username");
        return switch (event) {
            case "Push Hook" -> push(p, sender);
            case "Merge Request Hook" -> mergeRequest(p, sender);
            case "Issue Hook" -> issueEvent(p, sender);
            case "Note Hook" -> {
                if (!"Issue".equals(at(p, "/object_attributes/noteable_type")) || bool(p, "/object_attributes/system"))
                    yield List.of();
                yield List.of(new Remote.CommentEvent(
                        at(p, "/issue/iid"),
                        at(p, "/object_attributes/note"),
                        at(p, "/object_attributes/url"),
                        sender,
                        bool(p, "/user/bot")));
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
        String base = at(p, "/project/web_url");
        return List.of(new Remote.Push(branch, base == null ? null : base + "/-/tree/" + branch, commits, sender));
    }

    private List<Remote.Event> mergeRequest(JsonNode p, String sender) {
        var mr = p.path("object_attributes");
        String action = s(mr, "action");
        if (action == null) return List.of();
        boolean draft = bool(mr, "/draft") || bool(mr, "/work_in_progress");
        action = switch (action) {
            case "open" -> "opened";
            case "reopen" -> "reopened";
            case "close" -> "closed";
            case "merge" -> "merged";
            // Leaving draft shows as an update whose changes turn draft off.
            case "update" -> p.at("/changes/draft/current").isBoolean() && !draft ? "ready" : "edited";
            default -> null;
        };
        if (action == null) return List.of();
        return List.of(new Remote.PullEvent(
                action,
                s(mr, "iid"),
                s(mr, "title"),
                s(mr, "description"),
                s(mr, "url"),
                s(mr, "source_branch"),
                draft,
                sender));
    }

    private List<Remote.Event> issueEvent(JsonNode p, String sender) {
        var attributes = p.path("object_attributes");
        if (bool(attributes, "/confidential")) return List.of();
        String action =
                switch (String.valueOf(s(attributes, "action"))) {
                    case "open" -> "opened";
                    case "reopen" -> "reopened";
                    case "close" -> "closed";
                    case "update" -> "edited";
                    default -> null;
                };
        if (action == null) return List.of();
        var labels = new ArrayList<String>();
        for (JsonNode label : p.path("labels")) labels.add(s(label, "title"));
        return List.of(new Remote.IssueEvent(
                action,
                s(attributes, "iid"),
                s(attributes, "title"),
                s(attributes, "description"),
                s(attributes, "url"),
                labels,
                false,
                sender));
    }

    private static Remote.Issue issue(JsonNode each) {
        var labels = new ArrayList<String>();
        for (JsonNode label : each.path("labels")) labels.add(label.isString() ? label.asString() : s(label, "name"));
        return new Remote.Issue(
                s(each, "iid"),
                s(each, "title"),
                s(each, "description"),
                s(each, "web_url"),
                "opened".equals(s(each, "state")),
                labels,
                at(each, "/author/username"));
    }

    private static String api(Remote.Connection c) {
        return c.baseUrl().replaceAll("/+$", "") + "/api/v4";
    }

    /** The project by the id read when it was connected, or by its path before that. */
    private static String project(Remote.Connection c) {
        String id = c.externalRepositoryId() != null
                ? c.externalRepositoryId()
                : URLEncoder.encode(c.repository(), StandardCharsets.UTF_8);
        return api(c) + "/projects/" + id;
    }

    private static Map<String, String> headers(Remote.Connection c) {
        return Map.of("PRIVATE-TOKEN", c.token());
    }
}
