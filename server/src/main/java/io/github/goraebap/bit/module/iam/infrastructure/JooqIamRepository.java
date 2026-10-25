package io.github.goraebap.bit.module.iam.infrastructure;

import static io.github.goraebap.bit.jooq.tables.IamApiKey.IAM_API_KEY;
import static io.github.goraebap.bit.jooq.tables.IamPassword.IAM_PASSWORD;
import static io.github.goraebap.bit.jooq.tables.IamSession.IAM_SESSION;
import static io.github.goraebap.bit.jooq.tables.IamUser.IAM_USER;

import io.github.goraebap.bit.module.iam.domain.AgentKey;
import io.github.goraebap.bit.module.iam.domain.IamRepository;
import io.github.goraebap.bit.module.iam.domain.Identity;
import io.github.goraebap.bit.module.iam.domain.LoginSession;
import io.github.goraebap.bit.module.iam.domain.PasswordCredential;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqIamRepository implements IamRepository {
    private final DSLContext dslContext;

    @Override
    public boolean hasUsers() {
        return dslContext.fetchExists(IAM_USER);
    }

    @Override
    public Optional<Identity> findUser(UUID id) {
        return dslContext
                .selectFrom(IAM_USER)
                .where(IAM_USER.IAM_USER_ID.eq(id))
                .and(IAM_USER.DELETED_AT.isNull())
                .fetchOptional(this::identity);
    }

    @Override
    public Optional<Identity> findByEmail(String email) {
        return dslContext
                .selectFrom(IAM_USER)
                .where(IAM_USER.EMAIL.eq(email))
                .and(IAM_USER.DELETED_AT.isNull())
                .fetchOptional(this::identity);
    }

    @Override
    public Optional<PasswordCredential> findPassword(UUID userId) {
        return dslContext
                .selectFrom(IAM_PASSWORD)
                .where(IAM_PASSWORD.IAM_USER_ID.eq(userId))
                .fetchOptional(r -> new PasswordCredential(
                        userId,
                        r.getPasswordHash(),
                        r.getFailedCount(),
                        r.getLockedUntil(),
                        r.getMustChange(),
                        r.getChangedAt()));
    }

    @Override
    public void renameUser(UUID id, String name, Instant now) {
        dslContext
                .update(IAM_USER)
                .set(IAM_USER.NAME, name)
                .set(IAM_USER.UPDATED_AT, now)
                .set(IAM_USER.UPDATED_BY, id)
                .where(IAM_USER.IAM_USER_ID.eq(id))
                .execute();
    }

    @Override
    public void createUser(Identity user, String hash, Instant now) {
        dslContext
                .insertInto(IAM_USER)
                .set(IAM_USER.IAM_USER_ID, user.id())
                .set(IAM_USER.EMAIL, user.email())
                .set(IAM_USER.NAME, user.name())
                .set(IAM_USER.IS_INSTANCE_ADMIN, user.instanceAdmin())
                .set(IAM_USER.CREATED_AT, now)
                .set(IAM_USER.UPDATED_AT, now)
                .execute();
        dslContext
                .insertInto(IAM_PASSWORD)
                .set(IAM_PASSWORD.IAM_USER_ID, user.id())
                .set(IAM_PASSWORD.PASSWORD_HASH, hash)
                .set(IAM_PASSWORD.CHANGED_AT, now)
                .execute();
    }

    @Override
    public void savePassword(PasswordCredential p, Instant now) {
        dslContext
                .update(IAM_PASSWORD)
                .set(IAM_PASSWORD.PASSWORD_HASH, p.hash())
                .set(IAM_PASSWORD.FAILED_COUNT, p.failures())
                .set(IAM_PASSWORD.LOCKED_UNTIL, p.lockedUntil())
                .set(IAM_PASSWORD.MUST_CHANGE, p.mustChange())
                .set(IAM_PASSWORD.CHANGED_AT, p.changedAt())
                .where(IAM_PASSWORD.IAM_USER_ID.eq(p.userId()))
                .execute();
    }

    @Override
    public Optional<LoginSession> findSessionByHash(String hash) {
        return dslContext
                .selectFrom(IAM_SESSION)
                .where(IAM_SESSION.TOKEN_HASH.eq(hash))
                .fetchOptional(this::session);
    }

    @Override
    public Optional<LoginSession> findSession(UUID id) {
        return dslContext
                .selectFrom(IAM_SESSION)
                .where(IAM_SESSION.IAM_SESSION_ID.eq(id))
                .fetchOptional(this::session);
    }

    @Override
    public void saveSession(LoginSession s) {
        dslContext
                .insertInto(IAM_SESSION)
                .set(IAM_SESSION.IAM_SESSION_ID, s.id())
                .set(IAM_SESSION.IAM_USER_ID, s.userId())
                .set(IAM_SESSION.TOKEN_HASH, s.hash())
                .set(IAM_SESSION.EXPIRES_AT, s.expiresAt())
                .set(IAM_SESSION.ABSOLUTE_EXPIRES_AT, s.absoluteExpiresAt())
                .set(IAM_SESSION.LAST_SEEN_AT, s.lastSeenAt())
                .set(IAM_SESSION.CREATED_AT, s.createdAt())
                .onConflict(IAM_SESSION.IAM_SESSION_ID)
                .doUpdate()
                .set(IAM_SESSION.EXPIRES_AT, s.expiresAt())
                .set(IAM_SESSION.LAST_SEEN_AT, s.lastSeenAt())
                .execute();
    }

    @Override
    public void deleteSession(UUID id) {
        dslContext
                .deleteFrom(IAM_SESSION)
                .where(IAM_SESSION.IAM_SESSION_ID.eq(id))
                .execute();
    }

    @Override
    public void deleteSessions(UUID userId) {
        dslContext
                .deleteFrom(IAM_SESSION)
                .where(IAM_SESSION.IAM_USER_ID.eq(userId))
                .execute();
    }

    @Override
    public Optional<AgentKey> findKeyByHash(String hash) {
        return dslContext
                .selectFrom(IAM_API_KEY)
                .where(IAM_API_KEY.KEY_HASH.eq(hash))
                .fetchOptional(this::key);
    }

    @Override
    public Optional<AgentKey> findKey(UUID id) {
        return dslContext
                .selectFrom(IAM_API_KEY)
                .where(IAM_API_KEY.IAM_API_KEY_ID.eq(id))
                .fetchOptional(this::key);
    }

    @Override
    public List<AgentKey> findKeys(UUID userId, Instant beforeTime, UUID beforeId, int limit) {
        return dslContext
                .selectFrom(IAM_API_KEY)
                .where(IAM_API_KEY.IAM_USER_ID.eq(userId))
                .and(
                        beforeTime == null
                                ? DSL.noCondition()
                                : IAM_API_KEY
                                        .CREATED_AT
                                        .lt(beforeTime)
                                        .or(IAM_API_KEY
                                                .CREATED_AT
                                                .eq(beforeTime)
                                                .and(IAM_API_KEY.IAM_API_KEY_ID.lt(beforeId))))
                .orderBy(IAM_API_KEY.CREATED_AT.desc(), IAM_API_KEY.IAM_API_KEY_ID.desc())
                .limit(limit)
                .fetch(this::key);
    }

    @Override
    public void createKey(AgentKey k) {
        dslContext
                .insertInto(IAM_API_KEY)
                .set(IAM_API_KEY.IAM_API_KEY_ID, k.id())
                .set(IAM_API_KEY.IAM_USER_ID, k.userId())
                .set(IAM_API_KEY.NAME, k.name())
                .set(IAM_API_KEY.AGENT_NAME, k.agentName())
                .set(IAM_API_KEY.PREFIX, k.prefix())
                .set(IAM_API_KEY.KEY_HASH, k.hash())
                .set(IAM_API_KEY.EXPIRES_AT, k.expiresAt())
                .set(IAM_API_KEY.CREATED_AT, k.createdAt())
                .execute();
    }

    @Override
    public void touchKey(UUID id, Instant now) {
        dslContext
                .update(IAM_API_KEY)
                .set(IAM_API_KEY.LAST_USED_AT, now)
                .where(IAM_API_KEY.IAM_API_KEY_ID.eq(id))
                .execute();
    }

    @Override
    public void revokeKeys(UUID userId, Instant now) {
        dslContext
                .update(IAM_API_KEY)
                .set(IAM_API_KEY.REVOKED_AT, now)
                .where(IAM_API_KEY.IAM_USER_ID.eq(userId))
                .and(IAM_API_KEY.REVOKED_AT.isNull())
                .execute();
    }

    @Override
    public void revokeKey(UUID id, Instant now) {
        dslContext
                .update(IAM_API_KEY)
                .set(IAM_API_KEY.REVOKED_AT, now)
                .where(IAM_API_KEY.IAM_API_KEY_ID.eq(id))
                .and(IAM_API_KEY.REVOKED_AT.isNull())
                .execute();
    }

    @Override
    public List<Identity> findAllById(List<UUID> ids) {
        return dslContext
                .selectFrom(IAM_USER)
                .where(IAM_USER.IAM_USER_ID.in(ids))
                .and(IAM_USER.DELETED_AT.isNull())
                .fetch(this::identity);
    }

    @Override
    public UUID activeWorkspace(UUID sessionId) {
        return dslContext
                .select(IAM_SESSION.ACTIVE_WORKSPACE_ID)
                .from(IAM_SESSION)
                .where(IAM_SESSION.IAM_SESSION_ID.eq(sessionId))
                .fetchOne(IAM_SESSION.ACTIVE_WORKSPACE_ID);
    }

    @Override
    public void selectWorkspace(UUID sessionId, UUID workspaceId) {
        dslContext
                .update(IAM_SESSION)
                .set(IAM_SESSION.ACTIVE_WORKSPACE_ID, workspaceId)
                .where(IAM_SESSION.IAM_SESSION_ID.eq(sessionId))
                .execute();
    }

    @Override
    public void clearWorkspace(UUID workspaceId, UUID userId) {
        dslContext
                .update(IAM_SESSION)
                .setNull(IAM_SESSION.ACTIVE_WORKSPACE_ID)
                .where(IAM_SESSION.ACTIVE_WORKSPACE_ID.eq(workspaceId))
                .and(userId == null ? DSL.noCondition() : IAM_SESSION.IAM_USER_ID.eq(userId))
                .execute();
    }

    private Identity identity(Record r) {
        return new Identity(
                r.get(IAM_USER.IAM_USER_ID),
                r.get(IAM_USER.EMAIL),
                r.get(IAM_USER.NAME),
                r.get(IAM_USER.IS_INSTANCE_ADMIN));
    }

    private LoginSession session(Record r) {
        return new LoginSession(
                r.get(IAM_SESSION.IAM_SESSION_ID),
                r.get(IAM_SESSION.IAM_USER_ID),
                r.get(IAM_SESSION.TOKEN_HASH),
                r.get(IAM_SESSION.EXPIRES_AT),
                r.get(IAM_SESSION.ABSOLUTE_EXPIRES_AT),
                r.get(IAM_SESSION.LAST_SEEN_AT),
                r.get(IAM_SESSION.CREATED_AT));
    }

    private AgentKey key(Record r) {
        return new AgentKey(
                r.get(IAM_API_KEY.IAM_API_KEY_ID),
                r.get(IAM_API_KEY.IAM_USER_ID),
                r.get(IAM_API_KEY.NAME),
                r.get(IAM_API_KEY.AGENT_NAME),
                r.get(IAM_API_KEY.PREFIX),
                r.get(IAM_API_KEY.KEY_HASH),
                r.get(IAM_API_KEY.LAST_USED_AT),
                r.get(IAM_API_KEY.EXPIRES_AT),
                r.get(IAM_API_KEY.REVOKED_AT),
                r.get(IAM_API_KEY.CREATED_AT));
    }
}
