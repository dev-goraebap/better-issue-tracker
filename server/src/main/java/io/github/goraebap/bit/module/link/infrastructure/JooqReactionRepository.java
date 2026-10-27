package io.github.goraebap.bit.module.link.infrastructure;

import static io.github.goraebap.bit.jooq.tables.Reaction.REACTION;

import io.github.goraebap.bit.module.link.domain.ReactionRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqReactionRepository implements ReactionRepository {
    private final DSLContext dslContext;

    @Override
    public List<Row> list(String workspace, String type, String id) {
        return dslContext
                .select(REACTION.EMOJI, REACTION.USER_ID)
                .from(REACTION)
                .where(REACTION.WORKSPACE_ID.eq(workspace))
                .and(REACTION.TARGET_TYPE.eq(type))
                .and(REACTION.TARGET_ID.eq(id))
                .orderBy(REACTION.CREATED_AT, REACTION.REACTION_ID)
                .fetch(row -> new Row(row.get(REACTION.EMOJI), row.get(REACTION.USER_ID)));
    }

    @Override
    public void set(
            String workspace,
            String type,
            String id,
            String emoji,
            String user,
            String agent,
            Instant now,
            boolean active) {
        var match = REACTION.WORKSPACE_ID
                .eq(workspace)
                .and(REACTION.TARGET_TYPE.eq(type))
                .and(REACTION.TARGET_ID.eq(id))
                .and(REACTION.EMOJI.eq(emoji))
                .and(REACTION.USER_ID.eq(user));
        if (!active) {
            dslContext.deleteFrom(REACTION).where(match).execute();
            return;
        }
        dslContext
                .insertInto(REACTION)
                .set(REACTION.REACTION_ID, Ids.newId())
                .set(REACTION.WORKSPACE_ID, workspace)
                .set(REACTION.TARGET_TYPE, type)
                .set(REACTION.TARGET_ID, id)
                .set(REACTION.EMOJI, emoji)
                .set(REACTION.USER_ID, user)
                .set(REACTION.CREATED_AT, now)
                .set(REACTION.CREATED_BY_AGENT, agent)
                .onConflictDoNothing()
                .execute();
    }
}
