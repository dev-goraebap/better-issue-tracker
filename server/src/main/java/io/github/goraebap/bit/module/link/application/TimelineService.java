package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.link.TargetFacade;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.link.TimelineFacade;
import io.github.goraebap.bit.module.link.domain.Activity;
import io.github.goraebap.bit.module.link.domain.ActivityRepository;
import io.github.goraebap.bit.module.link.domain.Comment;
import io.github.goraebap.bit.module.link.domain.CommentRepository;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A target's timeline (D-078): its live comments and its activity in one list, oldest first, a page at a time. Both
 * are read after the same point and merged, so a page is the earliest size lines of the two together.
 */
@Service
@RequiredArgsConstructor
public class TimelineService implements TimelineFacade {
    private final TargetFacade targetFacade;
    private final CommentRepository commentRepository;
    private final ActivityRepository activityRepository;
    private final IamFacade iamFacade;
    private final JsonMapper jsonMapper;

    @Transactional(readOnly = true)
    public TimelineViews.Timeline list(
            CurrentUser actor, UUID workspaceId, TargetType type, UUID targetId, String cursor, int size) {
        if (type == null || type == TargetType.code_ref || size < 1 || size > 200)
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        targetFacade.requireAccess(actor, workspaceId, type, targetId, false);
        var point = decode(cursor);
        var comments =
                commentRepository.findAllByTarget(workspaceId, type, targetId, point.time(), point.id(), size + 1);
        var activity =
                activityRepository.findAllByTarget(workspaceId, type, targetId, point.time(), point.id(), size + 1);
        // The same order the queries read in: time, then the id as the database compares it (its text).
        var lines = Stream.concat(
                        comments.stream().map(Merged::of), activity.stream().map(Merged::of))
                .sorted(Comparator.comparing(Merged::at)
                        .thenComparing(line -> line.id().toString()))
                .toList();
        var page = lines.stream().limit(size).toList();
        String next =
                lines.size() > size ? encode(page.getLast().at(), page.getLast().id()) : null;
        var names =
                iamFacade
                        .users(page.stream()
                                .map(Merged::actorId)
                                .filter(Objects::nonNull)
                                .distinct()
                                .toList())
                        .stream()
                        .collect(Collectors.toMap(IamFacade.User::id, IamFacade.User::name));
        var entries = new ArrayList<TimelineViews.Entry>();
        for (var line : page) {
            var entry = line.comment() != null ? comment(line.comment(), names) : activity(line.activity(), names);
            if (entry != null) entries.add(entry);
        }
        return new TimelineViews.Timeline(entries, next);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<TimelineFacade.Line> lines(
            CurrentUser actor, UUID workspaceId, TargetType type, UUID targetId, int limit) {
        return list(actor, workspaceId, type, targetId, null, limit).items().stream()
                .map(e -> new TimelineFacade.Line(
                        e.kind(),
                        e.at(),
                        e.actorId(),
                        e.actorName(),
                        e.actorAgent(),
                        e.body(),
                        e.editedAt(),
                        e.action(),
                        e.field(),
                        e.before(),
                        e.after()))
                .toList();
    }

    private static TimelineViews.Entry comment(Comment c, Map<UUID, String> names) {
        var a = c.audit();
        Instant edited = a.updatedAt().equals(a.createdAt()) ? null : a.updatedAt();
        return new TimelineViews.Entry(
                "comment",
                c.id(),
                a.createdAt(),
                a.createdBy(),
                name(names, a.createdBy()),
                a.createdByAgent(),
                c.body(),
                c.version(),
                edited,
                null,
                null,
                null,
                null);
    }

    /** An activity line; a long value's later parts (a decision's body split in chunks) are left out. */
    private TimelineViews.Entry activity(Activity a, Map<UUID, String> names) {
        JsonNode payload = a.payload() == null ? null : jsonMapper.readTree(a.payload());
        if (payload != null && payload.path("part").asInt(0) > 0) return null;
        return new TimelineViews.Entry(
                "activity",
                a.id(),
                a.occurredAt(),
                a.actorId(),
                name(names, a.actorId()),
                a.actorAgent(),
                null,
                0,
                null,
                a.type(),
                text(payload, "field"),
                text(payload, "before"),
                text(payload, "after"));
    }

    private static String text(JsonNode payload, String key) {
        if (payload == null) return null;
        var value = payload.get(key);
        return value == null || value.isNull() ? null : value.asString();
    }

    private static String name(Map<UUID, String> names, UUID id) {
        return id == null ? null : names.getOrDefault(id, "탈퇴한 사용자");
    }

    private record Merged(Instant at, UUID id, UUID actorId, Comment comment, Activity activity) {
        static Merged of(Comment c) {
            return new Merged(c.audit().createdAt(), c.id(), c.audit().createdBy(), c, null);
        }

        static Merged of(Activity a) {
            return new Merged(a.occurredAt(), a.id(), a.actorId(), null, a);
        }
    }

    private record Point(Instant time, UUID id) {}

    private static Point decode(String cursor) {
        if (cursor == null) return new Point(null, null);
        if (cursor.length() > 256) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", -1);
            if (parts.length != 2) throw new IllegalArgumentException("cursor");
            return new Point(Instant.parse(parts[0]), UUID.fromString(parts[1]));
        } catch (IllegalArgumentException | DateTimeParseException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }

    private static String encode(Instant time, UUID id) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((time + "|" + id).getBytes(StandardCharsets.UTF_8));
    }
}
