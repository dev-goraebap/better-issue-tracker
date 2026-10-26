package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.CommentChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.domain.Activity;
import io.github.goraebap.bit.module.link.domain.ActivityRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class ActivityService {
    private static final Set<String> ACTIONS =
            Set.of("created", "changed", "accepted", "superseded", "deleted", "restored");
    private static final Map<TargetType, Set<String>> FIELDS = Map.of(
            TargetType.decision,
                    Set.of(
                            "title",
                            "body",
                            "rejectedAlternatives",
                            "triggerType",
                            "status",
                            "deleted",
                            "replacementId"),
            TargetType.session_record, Set.of("title", "type", "summary", "occurredAt", "participants", "deleted"),
            TargetType.work_item,
                    Set.of(
                            "title",
                            "description",
                            "priority",
                            "assignee",
                            "people",
                            "kind",
                            "startDate",
                            "dueDate",
                            "startsAt",
                            "endsAt",
                            "allDay",
                            "labels",
                            "column",
                            "archived"),
            TargetType.document, Set.of("title", "body", "labels", "place"));
    private final ActivityRepository activityRepository;
    private final JsonMapper jsonMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void recordComment(CommentChangedEvent event) {
        if (!Set.of("comment_created", "comment_changed", "comment_deleted", "comment_restored")
                .contains(event.action())) throw new IllegalArgumentException("Unsupported comment activity");
        var payload = Map.of("commentId", event.commentId(), "version", event.version());
        activityRepository.saveAll(List.of(Activity.create(
                event.workspaceId(),
                event.projectId(),
                event.targetType(),
                event.targetId(),
                event.action(),
                event.actorId(),
                event.actorAgent(),
                jsonMapper.writeValueAsString(payload),
                event.occurredAt())));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void record(TargetChangedEvent event) {
        if (!ACTIONS.contains(event.action())) throw new IllegalArgumentException("Unsupported activity action");
        var rows = new ArrayList<Activity>();
        String changeId = Ids.newId();
        if (event.changes().isEmpty()) {
            rows.add(activity(event, Map.of("version", event.version(), "changeId", changeId)));
        }
        for (var change : event.changes()) {
            if (!FIELDS.getOrDefault(event.targetType(), Set.of()).contains(change.field()))
                throw new IllegalArgumentException("Unsupported activity field");
            var before = chunks(change.before());
            var after = chunks(change.after());
            int parts = Math.max(1, Math.max(before.size(), after.size()));
            for (int part = 0; part < parts; part++) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("version", event.version());
                payload.put("changeId", changeId);
                payload.put("field", change.field());
                payload.put("part", part);
                payload.put("parts", parts);
                payload.put(
                        "beforeLength",
                        change.before() == null ? -1 : change.before().length());
                payload.put(
                        "afterLength",
                        change.after() == null ? -1 : change.after().length());
                payload.put("before", part < before.size() ? before.get(part) : null);
                payload.put("after", part < after.size() ? after.get(part) : null);
                rows.add(activity(event, payload));
            }
        }
        activityRepository.saveAll(rows);
    }

    private Activity activity(TargetChangedEvent event, Map<String, Object> payload) {
        return Activity.create(
                event.workspaceId(),
                event.projectId(),
                event.targetType(),
                event.targetId(),
                event.action(),
                event.actorId(),
                event.actorAgent(),
                jsonMapper.writeValueAsString(payload),
                event.occurredAt());
    }

    private static List<String> chunks(String value) {
        if (value == null) return List.of();
        if (value.isEmpty()) return List.of("");
        var chunks = new ArrayList<String>();
        for (int start = 0; start < value.length(); ) {
            int end = Math.min(start + 4000, value.length());
            if (end < value.length() && Character.isHighSurrogate(value.charAt(end - 1))) end--;
            chunks.add(value.substring(start, end));
            start = end;
        }
        return chunks;
    }
}
