package io.github.goraebap.bit.shared.web;

/** The authenticated request's identity. Never contains the presented credential. */
public record CurrentUser(
        String userId,
        boolean instanceAdmin,
        Method method,
        String credentialId,
        String agentName,
        boolean mustChangePassword) {
    public enum Method {
        SESSION,
        API_KEY,
        /**
         * A repository host acting through a project's integration (D-087): made only by the server for a signed
         * webhook, never from a request; it acts as the member who connected the repository.
         */
        INTEGRATION
    }

    /** The agent a change is recorded under (D-021): an API key's agent or a repository host; none for a person. */
    public String agent() {
        return method == Method.SESSION ? null : agentName;
    }
}
