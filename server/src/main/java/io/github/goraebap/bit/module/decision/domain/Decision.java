package io.github.goraebap.bit.module.decision.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;

@Getter
public final class Decision {
    private static final Set<String> TRIGGERS = Set.of("request", "finding", "external", "improvement", "planned");

    public enum State {
        PROPOSED,
        ACCEPTED,
        SUPERSEDED
    }

    public record Details(String title, String body, String rejectedAlternatives, String triggerType) {
        public static Details of(String title, String body, String rejectedAlternatives, String triggerType) {
            if (title == null
                    || title.isBlank()
                    || title.strip().length() > 200
                    || body == null
                    || body.isBlank()
                    || body.strip().length() > 20000
                    || rejectedAlternatives != null && rejectedAlternatives.length() > 20000
                    || triggerType != null && !TRIGGERS.contains(triggerType)) {
                throw new IllegalArgumentException("Invalid decision details");
            }
            return new Details(title.strip(), body.strip(), rejectedAlternatives, triggerType);
        }
    }

    private final UUID id;
    private final UUID projectId;
    private final long number;
    private Details details;
    private State state;
    private Instant acceptedAt;
    private Instant supersededAt;
    private long version;
    private Audit audit;

    private Decision(
            UUID id,
            UUID projectId,
            long number,
            Details details,
            State state,
            Instant acceptedAt,
            Instant supersededAt,
            long version,
            Audit audit) {
        this.id = id;
        this.projectId = projectId;
        this.number = number;
        this.details = details;
        this.state = state;
        this.acceptedAt = acceptedAt;
        this.supersededAt = supersededAt;
        this.version = version;
        this.audit = audit;
    }

    public static Decision create(UUID projectId, long number, Details details, UUID actor, String agent, Instant now) {
        if (number < 1) throw new IllegalArgumentException("Invalid decision number");
        return new Decision(
                UUID.randomUUID(),
                Objects.requireNonNull(projectId),
                number,
                validate(details),
                State.PROPOSED,
                null,
                null,
                0,
                Audit.create(actor, agent, now));
    }

    public static Decision fromPersistence(
            UUID id,
            UUID projectId,
            long number,
            Details details,
            State state,
            Instant acceptedAt,
            Instant supersededAt,
            long version,
            Audit audit) {
        return new Decision(id, projectId, number, details, state, acceptedAt, supersededAt, version, audit);
    }

    public void revise(Details next, UUID actor, String agent, Instant now) {
        writable();
        this.details = validate(next);
        touch(actor, agent, now);
    }

    public void accept(UUID actor, String agent, Instant now) {
        writable();
        if (state == State.ACCEPTED) return;
        state = State.ACCEPTED;
        acceptedAt = now;
        touch(actor, agent, now);
    }
    /** Replacement identity, graph constraints and its version belong to the coordinating service. */
    public void supersede(UUID actor, String agent, Instant now) {
        writable();
        if (state != State.ACCEPTED) throw new IllegalStateException("Only accepted decisions can be superseded");
        state = State.SUPERSEDED;
        supersededAt = now;
        touch(actor, agent, now);
    }

    public void delete(UUID actor, String agent, Instant now) {
        if (state != State.PROPOSED) throw new IllegalStateException("Only proposed decisions can be deleted");
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    public void restore(UUID actor, String agent, Instant now) {
        if (state != State.PROPOSED) throw new IllegalStateException("Only proposed decisions can be restored");
        if (audit.deletedAt() == null) return;
        audit = audit.restore(actor, agent, now);
        version++;
    }

    private void writable() {
        if (audit.deletedAt() != null || state == State.SUPERSEDED)
            throw new IllegalStateException("Decision is read only");
    }

    private void touch(UUID actor, String agent, Instant now) {
        audit = audit.touch(actor, agent, now);
        version++;
    }

    private static Details validate(Details details) {
        Objects.requireNonNull(details, "details");
        return Details.of(details.title(), details.body(), details.rejectedAlternatives(), details.triggerType());
    }
}
