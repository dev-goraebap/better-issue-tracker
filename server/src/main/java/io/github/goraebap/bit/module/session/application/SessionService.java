package io.github.goraebap.bit.module.session.application;

import io.github.goraebap.bit.module.decision.DecisionFacade;
import io.github.goraebap.bit.module.link.LinkFacade;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.session.SessionFacade;
import io.github.goraebap.bit.module.session.domain.Participant;
import io.github.goraebap.bit.module.session.domain.SessionRecord;
import io.github.goraebap.bit.module.session.domain.SessionRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SessionService implements SessionFacade {
    private static final Pattern REFERENCE = Pattern.compile("(?:([A-Z0-9]{2,10})\\s+)?S-([0-9]{1,19})");
    private final SessionRepository sessionRepository;
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;
    private final DecisionFacade decisionFacade;
    private final LinkFacade linkFacade;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Clock clock;

    @Override
    @Transactional
    public UUID record(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            Draft draft,
            List<Person> people,
            List<DecisionFacade.Draft> decisions,
            List<UUID> workItemIds) {
        projectFacade.requireAccess(actor, workspaceId, projectId, true);
        var details = details(draft);
        var participants = participants(actor, workspaceId, people);
        if (decisions == null
                || decisions.size() > 20
                || workItemIds == null
                || workItemIds.size() > 100
                || workItemIds.stream().anyMatch(Objects::isNull))
            throw SessionErrorCode.SESSION_RECORD_INVALID_INPUT.raise();
        var now = clock.instant();
        long number = projectFacade.allocateSessionNumber(actor, workspaceId, projectId);
        var record = SessionRecord.create(projectId, number, details, participants, actor.userId(), agent(actor), now);
        sessionRepository.save(record);
        var ids = decisions.isEmpty()
                ? List.<UUID>of()
                : decisionFacade.createAll(actor, workspaceId, projectId, decisions);
        linkFacade.connectSessionRecord(
                actor, workspaceId, projectId, record.id(), ids, List.copyOf(new LinkedHashSet<>(workItemIds)));
        changed(actor, workspaceId, record, "created", List.of());
        return record.id();
    }

    @Override
    @Transactional(readOnly = true)
    public Ref findByRef(CurrentUser actor, UUID workspaceId, UUID projectId, String reference) {
        var project = projectFacade.requireAccess(actor, workspaceId, projectId, false);
        var match = REFERENCE.matcher(reference == null ? "" : reference.strip().toUpperCase(Locale.ROOT));
        if (!match.matches()) throw SessionErrorCode.SESSION_RECORD_NOT_FOUND.raise();
        if (match.group(1) != null
                && !projectFacade
                        .findByKey(actor, workspaceId, match.group(1))
                        .id()
                        .equals(projectId)) throw SessionErrorCode.SESSION_RECORD_NOT_FOUND.raise();
        long number;
        try {
            number = Long.parseLong(match.group(2));
        } catch (NumberFormatException invalid) {
            throw SessionErrorCode.SESSION_RECORD_NOT_FOUND.raise();
        }
        var record = sessionRepository
                .findByNumber(projectId, number)
                .orElseThrow(SessionErrorCode.SESSION_RECORD_NOT_FOUND::raise);
        return new Ref(record.id(), projectId, project.key() + " S-" + String.format(Locale.ROOT, "%03d", number));
    }

    @Transactional
    public void revise(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            UUID id,
            Draft draft,
            List<Person> people,
            long expectedVersion) {
        var record = access(actor, workspaceId, projectId, id, false);
        version(record, expectedVersion);
        var after = details(draft);
        var participants = people == null ? record.participants() : participants(actor, workspaceId, people);
        var before = record.details();
        var changes = new ArrayList<FieldChange>();
        field(changes, "type", before.type(), after.type());
        field(changes, "title", before.title(), after.title());
        field(
                changes,
                "occurredAt",
                before.occurredAt().toString(),
                after.occurredAt().toString());
        if (!before.summary().equals(after.summary())) changes.add(new FieldChange("summary", null, "changed"));
        if (!new HashSet<>(record.participants()).equals(new HashSet<>(participants)))
            changes.add(new FieldChange("participants", null, "changed"));
        if (changes.isEmpty()) return;
        record.revise(after, participants, actor.userId(), agent(actor), clock.instant());
        sessionRepository.save(record);
        changed(actor, workspaceId, record, "changed", changes);
    }

    @Transactional
    public void delete(CurrentUser actor, UUID workspaceId, UUID projectId, UUID id, long expectedVersion) {
        var record = access(actor, workspaceId, projectId, id, true);
        version(record, expectedVersion);
        if (record.audit().deletedAt() != null) return;
        record.delete(actor.userId(), agent(actor), clock.instant());
        sessionRepository.save(record);
        changed(actor, workspaceId, record, "deleted", List.of(new FieldChange("deleted", "false", "true")));
    }

    @Transactional
    public void restore(CurrentUser actor, UUID workspaceId, UUID projectId, UUID id, long expectedVersion) {
        var record = access(actor, workspaceId, projectId, id, true);
        version(record, expectedVersion);
        if (record.audit().deletedAt() == null) return;
        record.restore(actor.userId(), agent(actor), clock.instant());
        sessionRepository.save(record);
        changed(actor, workspaceId, record, "restored", List.of(new FieldChange("deleted", "true", "false")));
    }

    private SessionRecord access(CurrentUser actor, UUID workspaceId, UUID projectId, UUID id, boolean deleted) {
        projectFacade.requireAccess(actor, workspaceId, projectId, true);
        return sessionRepository
                .findById(projectId, id, deleted)
                .orElseThrow(SessionErrorCode.SESSION_RECORD_NOT_FOUND::raise);
    }

    private List<Participant> participants(CurrentUser actor, UUID workspaceId, List<Person> people) {
        if (people == null || people.size() > 100 || people.stream().anyMatch(Objects::isNull))
            throw SessionErrorCode.SESSION_RECORD_INVALID_INPUT.raise();
        var userIds = people.stream()
                .filter(p -> "user".equals(p.kind()))
                .map(Person::userId)
                .collect(Collectors.toSet());
        if (userIds.stream().anyMatch(Objects::isNull)) throw SessionErrorCode.SESSION_RECORD_INVALID_INPUT.raise();
        var names = workspaceFacade.memberNames(actor, workspaceId, userIds);
        if (names.size() != userIds.size()) throw SessionErrorCode.SESSION_PARTICIPANT_NOT_MEMBER.raise();
        var participants = new LinkedHashSet<Participant>();
        for (var person : people) {
            try {
                participants.add(Participant.of(
                        person.kind(),
                        person.userId(),
                        "user".equals(person.kind()) ? names.get(person.userId()) : person.displayName()));
            } catch (IllegalArgumentException invalid) {
                throw SessionErrorCode.SESSION_RECORD_INVALID_INPUT.raise();
            }
        }
        return List.copyOf(participants);
    }

    private void changed(
            CurrentUser actor, UUID workspaceId, SessionRecord record, String action, List<FieldChange> changes) {
        applicationEventPublisher.publishEvent(new TargetChangedEvent(
                workspaceId,
                record.projectId(),
                TargetType.session_record,
                record.id(),
                action,
                record.version(),
                actor.userId(),
                agent(actor),
                record.audit().updatedAt(),
                changes));
    }

    private static SessionRecord.Details details(Draft draft) {
        if (draft == null) throw SessionErrorCode.SESSION_RECORD_INVALID_INPUT.raise();
        try {
            return SessionRecord.Details.of(draft.type(), draft.title(), draft.summary(), draft.occurredAt());
        } catch (IllegalArgumentException invalid) {
            throw SessionErrorCode.SESSION_RECORD_INVALID_INPUT.raise();
        }
    }

    private static void version(SessionRecord record, long expected) {
        if (record.version() != expected) throw SessionErrorCode.SESSION_RECORD_VERSION_CONFLICT.raise();
    }

    private static void field(List<FieldChange> changes, String field, String before, String after) {
        if (!Objects.equals(before, after)) changes.add(new FieldChange(field, before, after));
    }

    private static String agent(CurrentUser actor) {
        return actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null;
    }
}
