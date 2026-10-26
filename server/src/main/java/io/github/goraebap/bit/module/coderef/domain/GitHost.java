package io.github.goraebap.bit.module.coderef.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * One host's API and webhooks (D-028, D-087), behind which each adapter speaks its own REST and payloads. Calls go out
 * over the network and are never made inside a transaction. A refused or failed call throws {@link GitHostException}.
 */
public interface GitHost {
    Provider provider();

    /** Checks the token can reach the repository; what the repository is called and whose token it is. */
    Remote.Repository verify(Remote.Connection connection);

    /** Open issues, oldest first, at most limit (pull requests left out). */
    List<Remote.Issue> openIssues(Remote.Connection connection, int limit);

    /** An issue's comments, oldest first. */
    List<Remote.Comment> comments(Remote.Connection connection, String number);

    /** Open pull or merge requests, at most limit. */
    List<Remote.Pull> openPulls(Remote.Connection connection, int limit);

    /** A new issue with these labels (made on the host when missing); its number and address. */
    Remote.Issue createIssue(Remote.Connection connection, String title, String body, List<String> labels);

    /** Changes only what is given; labels replace the issue's. */
    void updateIssue(Remote.Connection connection, String number, Remote.IssuePatch patch);

    void comment(Remote.Connection connection, String number, String body);

    /** Registers the webhook; its id, or empty when the token may not (the member registers it then). */
    Optional<String> createWebhook(Remote.Connection connection, String url, String secret);

    void deleteWebhook(Remote.Connection connection, String webhookId);

    /** Whether a delivery is signed with the secret. headers are lower-cased names. */
    boolean signed(Map<String, String> headers, byte[] body, String secret);

    /** What a delivery says happened, in the host's terms made common; empty for what BIT does not follow. */
    List<Remote.Event> read(Map<String, String> headers, byte[] body);
}
