package io.github.goraebap.bit.module.coderef.domain;

/** A host refused a call (status 401/403/404) or could not be reached; the message is safe to show a manager. */
public final class GitHostException extends RuntimeException {
    private final int status;

    public GitHostException(int status, String message) {
        super(message);
        this.status = status;
    }

    /** The host's HTTP status, or 0 when it could not be reached. */
    public int status() {
        return status;
    }

    public boolean unauthorized() {
        return status == 401 || status == 403;
    }
}
