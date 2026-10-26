package io.github.goraebap.bit.module.coderef.domain;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;

/**
 * A project's connection to one repository on a host (D-087): where it is, the token it acts with and the secret its
 * webhooks are signed with (both encrypted by the application before they get here), and what it keeps in step.
 * A project has at most one per host.
 */
@Getter
@AllArgsConstructor(staticName = "fromPersistence")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public final class Integration {
    @EqualsAndHashCode.Include
    private final String id;

    private final String workspaceId;
    private final String projectId;
    private final Provider provider;
    private final String baseUrl;
    private final String repository;
    private final String externalRepositoryId;
    private final String webUrl;
    private String tokenCipher;
    private final String webhookSecretCipher;
    private String webhookId;
    private String accountLogin;
    private boolean syncsIssues;
    private boolean commentsLink;
    private boolean active;
    private Instant lastEventAt;
    private String lastError;
    private long version;
    private final Instant createdAt;
    private final String createdBy;
    private final String createdByAgent;
    private Instant updatedAt;
    private String updatedBy;
    private String updatedByAgent;

    public static Integration create(
            String workspaceId,
            String projectId,
            Provider provider,
            String baseUrl,
            String repository,
            String externalRepositoryId,
            String webUrl,
            String tokenCipher,
            String webhookSecretCipher,
            String accountLogin,
            String actor,
            String agent,
            Instant now) {
        Objects.requireNonNull(provider);
        if (repository == null || repository.isBlank() || repository.length() > 255)
            throw new IllegalArgumentException("A repository is its owner and name");
        return new Integration(
                Ids.newId(),
                Objects.requireNonNull(workspaceId),
                Objects.requireNonNull(projectId),
                provider,
                Objects.requireNonNull(baseUrl),
                repository.strip(),
                externalRepositoryId,
                Objects.requireNonNull(webUrl),
                Objects.requireNonNull(tokenCipher),
                Objects.requireNonNull(webhookSecretCipher),
                null,
                accountLogin,
                true,
                true,
                true,
                null,
                null,
                0,
                now,
                actor,
                agent,
                now,
                actor,
                agent);
    }

    public void configure(boolean syncsIssues, boolean commentsLink, String actor, String agent, Instant now) {
        if (this.syncsIssues == syncsIssues && this.commentsLink == commentsLink) return;
        this.syncsIssues = syncsIssues;
        this.commentsLink = commentsLink;
        touch(actor, agent, now);
    }

    /** A new token, checked against the host by the caller; whose account it is may change with it. */
    public void replaceToken(String tokenCipher, String accountLogin, String actor, String agent, Instant now) {
        this.tokenCipher = Objects.requireNonNull(tokenCipher);
        this.accountLogin = accountLogin;
        this.active = true;
        this.lastError = null;
        touch(actor, agent, now);
    }

    /** The webhook the application registered on the host, or null when the member registers it themselves. */
    public void registeredWebhook(String webhookId) {
        this.webhookId = webhookId;
    }

    /** A webhook arrived and was read. */
    public void heard(Instant at) {
        this.lastEventAt = at;
    }

    /** The host refused the token or failed; kept so the settings can say why (at most 500 characters). */
    public void failed(String error) {
        this.lastError = error == null ? null : error.length() > 500 ? error.substring(0, 500) : error;
    }

    public void recovered() {
        this.lastError = null;
    }

    private void touch(String actor, String agent, Instant now) {
        this.version++;
        this.updatedAt = now;
        this.updatedBy = actor;
        this.updatedByAgent = agent;
    }
}
