package io.github.goraebap.bit.module.document.domain;

import io.github.goraebap.bit.shared.error.DomainRuleViolation;

/** A bundle that cannot become a version, with a reason an agent can act on. */
public final class PageBundleRejected extends DomainRuleViolation {
    private static final long serialVersionUID = 1L;

    public PageBundleRejected(String reason) {
        super(reason);
    }
}
