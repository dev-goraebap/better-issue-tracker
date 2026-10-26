package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Instant;
import java.util.List;

/** A target's comments and activity in one list (D-078), for those that read it outside the HTTP API (MCP, D-081). */
public interface TimelineFacade {
    /** The first lines of a target's timeline, oldest first, at most limit (1–200). */
    List<Line> lines(CurrentUser actor, String workspaceId, TargetType type, String targetId, int limit);

    /**
     * One line: a comment (its Markdown) or an activity (its action and, for a change, the field and its values before
     * and after, ids for people, columns and labels).
     */
    record Line(
            String kind,
            Instant at,
            String actorId,
            String actorName,
            String actorAgent,
            String body,
            Instant editedAt,
            String action,
            String field,
            String before,
            String after) {}
}
