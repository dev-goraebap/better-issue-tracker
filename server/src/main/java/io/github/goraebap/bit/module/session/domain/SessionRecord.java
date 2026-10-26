package io.github.goraebap.bit.module.session.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import lombok.Getter;

@Getter
public final class SessionRecord {
    public record Details(String type, String title, String summary, Instant occurredAt) {
        public static Details of(String type, String title, String summary, Instant occurredAt) {
            if (!("meeting".equals(type) || "agent_session".equals(type))
                    || title == null
                    || title.isBlank()
                    || title.strip().length() > 200
                    || summary == null
                    || summary.isBlank()
                    || summary.strip().length() > 100000
                    || occurredAt == null) {
                throw new IllegalArgumentException("Invalid session details");
            }
            return new Details(type, title.strip(), summary.strip(), occurredAt);
        }
    }

    private final String id;
    private final String projectId;
    private final long number;
    private Details details;
    private List<Participant> participants;
    private long version;
    private Audit audit;

    private SessionRecord(
            String id,
            String projectId,
            long number,
            Details details,
            List<Participant> participants,
            long version,
            Audit audit) {
        this.id = id;
        this.projectId = projectId;
        this.number = number;
        this.details = details;
        this.participants = List.copyOf(participants);
        this.version = version;
        this.audit = audit;
    }

    public static SessionRecord create(
            String projectId,
            long number,
            Details details,
            List<Participant> participants,
            String actor,
            String agent,
            Instant now) {
        if (number < 1) throw new IllegalArgumentException("Invalid session number");
        return new SessionRecord(
                Ids.newId(),
                Objects.requireNonNull(projectId),
                number,
                validate(details),
                participants(participants),
                0,
                Audit.create(actor, agent, now));
    }

    public static SessionRecord fromPersistence(
            String id,
            String projectId,
            long number,
            Details details,
            List<Participant> participants,
            long version,
            Audit audit) {
        return new SessionRecord(id, projectId, number, details, participants, version, audit);
    }

    public void revise(Details next, List<Participant> participants, String actor, String agent, Instant now) {
        if (audit.deletedAt() != null) throw new IllegalStateException("Session is deleted");
        Details valid = validate(next);
        List<Participant> people = participants(participants);
        this.details = valid;
        this.participants = people;
        audit = audit.touch(actor, agent, now);
        version++;
    }

    public void delete(String actor, String agent, Instant now) {
        if (audit.deletedAt() != null) return;
        audit = audit.delete(actor, agent, now);
        version++;
    }

    public void restore(String actor, String agent, Instant now) {
        if (audit.deletedAt() == null) return;
        audit = audit.restore(actor, agent, now);
        version++;
    }

    private static Details validate(Details details) {
        Objects.requireNonNull(details, "details");
        return Details.of(details.type(), details.title(), details.summary(), details.occurredAt());
    }

    private static List<Participant> participants(List<Participant> values) {
        if (values == null || values.size() > 100) throw new IllegalArgumentException("Invalid participant count");
        var people = new LinkedHashMap<String, Participant>();
        for (Participant value : values) {
            if (value == null) throw new IllegalArgumentException("Missing participant");
            var p = Participant.of(value.kind(), value.userId(), value.displayName());
            String identity = p.kind() + ":" + (p.userId() == null ? p.displayName() : p.userId());
            people.putIfAbsent(identity, p);
        }
        return List.copyOf(people.values());
    }
}
