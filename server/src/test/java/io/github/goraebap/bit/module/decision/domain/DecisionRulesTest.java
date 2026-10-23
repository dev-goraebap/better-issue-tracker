package io.github.goraebap.bit.module.decision.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DecisionRulesTest {
    private final UUID actor = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-10-23T00:00:00Z");

    private Decision proposal() {
        return Decision.create(
                UUID.randomUUID(),
                1,
                Decision.Details.of("Title", "Why", "Alternative", "planned"),
                actor,
                "codex",
                now);
    }

    @Test
    void acceptanceIsIdempotentAndSupersessionKeepsItsFirstAcceptanceAndProvenance() {
        var d = proposal();
        d.accept(actor, "codex", now.plusSeconds(1));
        long version = d.version();
        d.accept(actor, null, now.plusSeconds(2));
        assertThat(d.version()).isEqualTo(version);
        assertThat(d.acceptedAt()).isEqualTo(now.plusSeconds(1));
        d.supersede(actor, "replacement-agent", now.plusSeconds(3));
        assertThat(d.state()).isEqualTo(Decision.State.SUPERSEDED);
        assertThat(d.acceptedAt()).isEqualTo(now.plusSeconds(1));
        assertThat(d.supersededAt()).isEqualTo(now.plusSeconds(3));
        assertThat(d.audit().createdByAgent()).isEqualTo("codex");
        assertThat(d.audit().updatedByAgent()).isEqualTo("replacement-agent");
        assertThatThrownBy(() -> d.revise(Decision.Details.of("Changed", "Other", null, null), actor, null, now))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> d.accept(actor, null, now)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void invalidRevisionLeavesTheEntireDecisionUntouched() {
        var d = proposal();
        assertThatThrownBy(() ->
                        d.revise(new Decision.Details("Changed", "x".repeat(20001), null, null), actor, null, now))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(d.details().title()).isEqualTo("Title");
        assertThat(d.version()).isZero();
        assertThatThrownBy(() -> d.supersede(actor, null, now)).isInstanceOf(IllegalStateException.class);
        assertThat(d.state()).isEqualTo(Decision.State.PROPOSED);
    }

    @Test
    void onlyProposalsCanBeDeletedAndRestorationPreservesTheNumberAndOriginalAuthor() {
        var d = proposal();
        d.delete(actor, "remover", now.plusSeconds(1));
        assertThatThrownBy(() -> d.accept(actor, null, now)).isInstanceOf(IllegalStateException.class);
        d.restore(actor, "restorer", now.plusSeconds(2));
        assertThat(d.number()).isEqualTo(1);
        assertThat(d.audit().createdByAgent()).isEqualTo("codex");
        assertThat(d.audit().deletedAt()).isNull();
        d.accept(actor, null, now.plusSeconds(3));
        assertThatThrownBy(() -> d.delete(actor, null, now)).isInstanceOf(IllegalStateException.class);
        assertThat(d.audit().deletedAt()).isNull();
    }
}
