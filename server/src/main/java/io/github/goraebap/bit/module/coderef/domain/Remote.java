package io.github.goraebap.bit.module.coderef.domain;

import java.time.Instant;
import java.util.List;

/** What the hosts' APIs and webhooks carry, in common terms (D-087). Text fields are as the host sent them. */
public final class Remote {
    private Remote() {}

    /** Where to call and with what: an API base (GitHub's, or a GitLab or Gitea address) and the token in clear. */
    public record Connection(String baseUrl, String repository, String externalRepositoryId, String token) {
        @Override
        public String toString() {
            return "Connection[" + baseUrl + ", " + repository + "]";
        }
    }

    /** The repository as the host names it, its id (GitLab's number), its web address and whose the token is. */
    public record Repository(String fullName, String externalId, String webUrl, String accountLogin) {}

    public record Issue(
            String number, String title, String body, String url, boolean open, List<String> labels, String author) {
        public Issue {
            labels = labels == null ? List.of() : List.copyOf(labels);
        }
    }

    public record Comment(String id, String body, String author, String url) {}

    public record Pull(
            String number, String title, String body, String url, String branch, boolean draft, String author) {}

    /** title, body, open and labels: null leaves that part as it is. */
    public record IssuePatch(String title, String body, Boolean open, List<String> labels) {
        public IssuePatch {
            labels = labels == null ? null : List.copyOf(labels);
        }
    }

    public sealed interface Event permits Push, PullEvent, IssueEvent, CommentEvent {}

    /** Commits pushed to a branch; a deleted branch is not one. */
    public record Push(String branch, String branchUrl, List<Commit> commits, String sender) implements Event {
        public Push {
            commits = List.copyOf(commits);
        }
    }

    public record Commit(String sha, String message, String url, String author) {}

    /** action: opened, reopened, closed, merged, ready (out of draft) or edited. */
    public record PullEvent(
            String action,
            String number,
            String title,
            String body,
            String url,
            String branch,
            boolean draft,
            String sender)
            implements Event {}

    /**
     * action: opened, reopened, closed or edited (title, body or labels changed). updatedAt: when the issue last changed
     * as the host tells it (null when it does not), so a late delivery older than BIT's own last write is not applied.
     */
    public record IssueEvent(
            String action,
            String number,
            String title,
            String body,
            String url,
            List<String> labels,
            boolean fromPull,
            String sender,
            Instant updatedAt)
            implements Event {
        public IssueEvent {
            labels = labels == null ? null : List.copyOf(labels);
        }
    }

    /** A new comment on an issue (one on a pull request is not followed). */
    public record CommentEvent(String number, String body, String url, String author, boolean bot) implements Event {}
}
