package io.github.goraebap.bit.module.session.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.module.project.domain.Project;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SessionRulesTest {
    private final UUID actor = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-10-23T00:00:00Z");

    @Test
    void participantIdentityIsValidatedAndSnapshotIsImmutableAndDeduplicated() {
        var person = Participant.of("user", actor, " Original name ");
        var people = new ArrayList<>(List.of(person, person, Participant.of("agent", null, "codex")));
        var record = SessionRecord.create(
                UUID.randomUUID(),
                1,
                SessionRecord.Details.of("meeting", "Title", "Summary", now),
                people,
                actor,
                "codex",
                now);
        people.clear();
        assertThat(record.participants()).hasSize(2);
        assertThat(record.participants().getFirst().displayName()).isEqualTo("Original name");
        assertThatThrownBy(() -> record.participants().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> Participant.of("user", null, "Unknown")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Participant.of("guest", actor, "Guest")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void invalidParticipantsCannotPartiallyApplyNewSessionDetails() {
        var record = SessionRecord.create(
                UUID.randomUUID(),
                1,
                SessionRecord.Details.of("agent_session", "Original", "Summary", now),
                List.of(),
                actor,
                null,
                now);
        assertThatThrownBy(() -> record.revise(
                        SessionRecord.Details.of("meeting", "Changed", "New summary", now),
                        List.of(new Participant("invalid", null, "Guest")),
                        actor,
                        null,
                        now))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(record.details().title()).isEqualTo("Original");
        assertThat(record.version()).isZero();
        record.delete(actor, null, now);
        record.restore(actor, null, now.plusSeconds(1));
        assertThat(record.number()).isEqualTo(1);
        assertThat(record.audit().createdAt()).isEqualTo(now);
    }

    @Test
    void projectCountersAreIndependentAndDoNotInvalidateSettingsVersion() {
        var project = Project.create(UUID.randomUUID(), "Test", null, 0, actor, null, now);
        assertThat(project.allocateDecisionNumber()).isEqualTo(1);
        assertThat(project.allocateDecisionNumber()).isEqualTo(2);
        assertThat(project.allocateSessionNumber()).isEqualTo(1);
        assertThat(project.allocateWorkItemNumber()).isEqualTo(1);
        assertThat(project.version()).isZero();
    }
}
