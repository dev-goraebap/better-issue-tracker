package io.github.goraebap.bit.module.coderef.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;

/**
 * What in a repository an issue is tied to (D-087): the repository's issue it is mirrored with (external id: its
 * number), a branch (its name), a pull or merge request (its number) or a commit (its sha), with where it lives, its
 * title and its state. One thing may tie to several issues (a commit naming two).
 */
public record CodeLink(
        String id,
        String integrationId,
        String issueId,
        Kind kind,
        String externalId,
        String url,
        String title,
        State state,
        String author,
        String detail,
        Instant createdAt,
        Instant updatedAt) {
    public enum Kind {
        issue,
        branch,
        pull_request,
        commit
    }

    public enum State {
        open,
        draft,
        merged,
        closed
    }

    public static CodeLink of(
            String integrationId,
            String issueId,
            Kind kind,
            String externalId,
            String url,
            String title,
            State state,
            String author,
            String detail,
            Instant now) {
        return new CodeLink(
                Ids.newId(),
                Objects.requireNonNull(integrationId),
                Objects.requireNonNull(issueId),
                Objects.requireNonNull(kind),
                cut(Objects.requireNonNull(externalId), 255),
                cut(Objects.requireNonNull(url), 1000),
                cut(title == null || title.isBlank() ? externalId : title.strip(), 500),
                Objects.requireNonNull(state),
                author == null ? null : cut(author, 128),
                detail == null ? null : cut(detail, 500),
                now,
                now);
    }

    /** The same thing seen again: its title, state and detail as they are now, the first sighting kept. */
    public CodeLink seen(String title, State state, String author, String detail, Instant now) {
        return new CodeLink(
                id,
                integrationId,
                issueId,
                kind,
                externalId,
                url,
                title == null || title.isBlank() ? this.title : cut(title.strip(), 500),
                state,
                author == null ? this.author : cut(author, 128),
                detail == null ? this.detail : cut(detail, 500),
                createdAt,
                now);
    }

    private static String cut(String value, int max) {
        return value.length() > max ? value.substring(0, max) : value;
    }
}
