package io.github.goraebap.bit.shared.web;

import java.util.UUID;

/** The authenticated request's identity. Never contains the presented credential. */
public record CurrentUser(
        UUID userId,
        boolean instanceAdmin,
        Method method,
        UUID credentialId,
        String agentName,
        boolean mustChangePassword) {
    public enum Method {
        SESSION,
        API_KEY
    }
}
