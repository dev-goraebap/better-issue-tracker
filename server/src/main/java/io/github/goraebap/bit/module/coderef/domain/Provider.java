package io.github.goraebap.bit.module.coderef.domain;

/** The hosts a project can connect a repository on (D-087); GitLab and Gitea may be self-hosted at their own address. */
public enum Provider {
    github("GitHub", "https://github.com"),
    gitlab("GitLab", "https://gitlab.com"),
    gitea("Gitea", null);

    private final String label;
    private final String defaultUrl;

    Provider(String label, String defaultUrl) {
        this.label = label;
        this.defaultUrl = defaultUrl;
    }

    /** The host's name as people write it; also the agent name changes from its webhooks are recorded under. */
    public String label() {
        return label;
    }

    /** The host's web address when none is given; Gitea has none and always needs one. */
    public String defaultUrl() {
        return defaultUrl;
    }
}
