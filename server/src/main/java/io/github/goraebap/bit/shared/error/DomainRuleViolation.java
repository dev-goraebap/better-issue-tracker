package io.github.goraebap.bit.shared.error;

public class DomainRuleViolation extends RuntimeException {

    public DomainRuleViolation(String message) {
        super(message);
    }
}
