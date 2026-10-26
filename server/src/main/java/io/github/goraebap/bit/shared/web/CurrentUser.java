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
        API_KEY
    }
}
