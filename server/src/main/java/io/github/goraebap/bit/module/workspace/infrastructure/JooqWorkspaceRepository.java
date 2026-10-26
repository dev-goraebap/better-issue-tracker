package io.github.goraebap.bit.module.workspace.infrastructure;

import static io.github.goraebap.bit.jooq.tables.IamUser.IAM_USER;
import static io.github.goraebap.bit.jooq.tables.Workspace.WORKSPACE;
import static io.github.goraebap.bit.jooq.tables.WorkspaceInvitation.WORKSPACE_INVITATION;
import static io.github.goraebap.bit.jooq.tables.WorkspaceMember.WORKSPACE_MEMBER;

import io.github.goraebap.bit.module.workspace.domain.Invitation;
import io.github.goraebap.bit.module.workspace.domain.Membership;
import io.github.goraebap.bit.module.workspace.domain.Workspace;
import io.github.goraebap.bit.module.workspace.domain.WorkspaceRepository;
import io.github.goraebap.bit.module.workspace.domain.WorkspaceRole;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JooqWorkspaceRepository implements WorkspaceRepository {
    private final DSLContext dslContext;

    @Override
    public Set<String> findMemberUserIds(String workspaceId, Set<String> userIds) {
        if (userIds.isEmpty()) return Set.of();
        return Set.copyOf(dslContext
                .select(WORKSPACE_MEMBER.IAM_USER_ID)
                .from(WORKSPACE_MEMBER)
                .where(WORKSPACE_MEMBER.WORKSPACE_ID.eq(workspaceId))
                .and(WORKSPACE_MEMBER.IAM_USER_ID.in(userIds))
                .fetch(WORKSPACE_MEMBER.IAM_USER_ID));
    }

    @Override
    public Optional<Workspace> findById(String id) {
        return dslContext
                .selectFrom(WORKSPACE)
                .where(WORKSPACE.WORKSPACE_ID.eq(id))
                .and(WORKSPACE.DELETED_AT.isNull())
                .fetchOptional(this::workspace);
    }

    @Override
    public boolean existsBySlug(String slug) {
        return dslContext.fetchExists(WORKSPACE, WORKSPACE.SLUG.eq(slug));
    }

    @Override
    public void save(Workspace w) {
        dslContext
                .insertInto(WORKSPACE)
                .set(WORKSPACE.WORKSPACE_ID, w.id())
                .set(WORKSPACE.NAME, w.name())
                .set(WORKSPACE.SLUG, w.slug())
                .set(WORKSPACE.CREATED_AT, w.createdAt())
                .set(WORKSPACE.CREATED_BY, w.createdBy())
                .set(WORKSPACE.UPDATED_AT, w.updatedAt())
                .set(WORKSPACE.UPDATED_BY, w.updatedBy())
                .set(WORKSPACE.UPDATED_BY_AGENT, w.updatedByAgent())
                .set(WORKSPACE.DELETED_AT, w.deletedAt())
                .set(WORKSPACE.DELETED_BY, w.deletedBy())
                .onConflict(WORKSPACE.WORKSPACE_ID)
                .doUpdate()
                .set(WORKSPACE.NAME, w.name())
                .set(WORKSPACE.UPDATED_AT, w.updatedAt())
                .set(WORKSPACE.UPDATED_BY, w.updatedBy())
                .set(WORKSPACE.UPDATED_BY_AGENT, w.updatedByAgent())
                .set(WORKSPACE.DELETED_AT, w.deletedAt())
                .set(WORKSPACE.DELETED_BY, w.deletedBy())
                .execute();
    }

    @Override
    public List<WorkspaceRow> findAllByUserId(String userId, Instant time, String id, int limit) {
        return dslContext
                .select(
                        WORKSPACE.WORKSPACE_ID,
                        WORKSPACE.NAME,
                        WORKSPACE.SLUG,
                        WORKSPACE.CREATED_AT,
                        WORKSPACE_MEMBER.ROLE)
                .from(WORKSPACE)
                .join(WORKSPACE_MEMBER)
                .on(WORKSPACE_MEMBER.WORKSPACE_ID.eq(WORKSPACE.WORKSPACE_ID))
                .where(WORKSPACE_MEMBER.IAM_USER_ID.eq(userId))
                .and(WORKSPACE.DELETED_AT.isNull())
                .and(before(WORKSPACE.CREATED_AT, WORKSPACE.WORKSPACE_ID, time, id))
                .orderBy(WORKSPACE.CREATED_AT.desc(), WORKSPACE.WORKSPACE_ID.desc())
                .limit(limit)
                .fetch(r -> new WorkspaceRow(
                        r.get(WORKSPACE.WORKSPACE_ID),
                        r.get(WORKSPACE.NAME),
                        r.get(WORKSPACE.SLUG),
                        WorkspaceRole.valueOf(r.get(WORKSPACE_MEMBER.ROLE)),
                        r.get(WORKSPACE.CREATED_AT)));
    }

    @Override
    public Optional<Membership> findMember(String workspace, String user) {
        return dslContext
                .selectFrom(WORKSPACE_MEMBER)
                .where(WORKSPACE_MEMBER.WORKSPACE_ID.eq(workspace))
                .and(WORKSPACE_MEMBER.IAM_USER_ID.eq(user))
                .fetchOptional(this::member);
    }

    @Override
    public Optional<Membership> findMemberById(String workspace, String id) {
        return dslContext
                .selectFrom(WORKSPACE_MEMBER)
                .where(WORKSPACE_MEMBER.WORKSPACE_ID.eq(workspace))
                .and(WORKSPACE_MEMBER.WORKSPACE_MEMBER_ID.eq(id))
                .fetchOptional(this::member);
    }

    @Override
    public List<Membership> findMembers(String workspace, Instant time, String id, int limit) {
        return dslContext
                .select(WORKSPACE_MEMBER.fields())
                .from(WORKSPACE_MEMBER)
                .join(IAM_USER)
                .on(IAM_USER.IAM_USER_ID.eq(WORKSPACE_MEMBER.IAM_USER_ID))
                .where(WORKSPACE_MEMBER.WORKSPACE_ID.eq(workspace))
                .and(IAM_USER.DELETED_AT.isNull())
                .and(
                        time == null
                                ? DSL.noCondition()
                                : WORKSPACE_MEMBER
                                        .JOINED_AT
                                        .gt(time)
                                        .or(WORKSPACE_MEMBER
                                                .JOINED_AT
                                                .eq(time)
                                                .and(WORKSPACE_MEMBER.WORKSPACE_MEMBER_ID.gt(id))))
                .orderBy(WORKSPACE_MEMBER.JOINED_AT.asc(), WORKSPACE_MEMBER.WORKSPACE_MEMBER_ID.asc())
                .limit(limit)
                .fetch(this::member);
    }

    @Override
    public void saveAll(List<Membership> members) {
        var queries = members.stream()
                .map(m -> dslContext
                        .insertInto(WORKSPACE_MEMBER)
                        .set(WORKSPACE_MEMBER.WORKSPACE_MEMBER_ID, m.id())
                        .set(WORKSPACE_MEMBER.WORKSPACE_ID, m.workspaceId())
                        .set(WORKSPACE_MEMBER.IAM_USER_ID, m.userId())
                        .set(WORKSPACE_MEMBER.ROLE, m.role().name())
                        .set(WORKSPACE_MEMBER.JOINED_AT, m.joinedAt())
                        .onConflict(WORKSPACE_MEMBER.WORKSPACE_MEMBER_ID)
                        .doUpdate()
                        .set(WORKSPACE_MEMBER.ROLE, m.role().name()))
                .toList();
        dslContext.batch(queries).execute();
    }

    @Override
    public void deleteMember(String id) {
        dslContext
                .deleteFrom(WORKSPACE_MEMBER)
                .where(WORKSPACE_MEMBER.WORKSPACE_MEMBER_ID.eq(id))
                .execute();
    }

    @Override
    public int countOwners(String workspace) {
        return dslContext.fetchCount(
                WORKSPACE_MEMBER, WORKSPACE_MEMBER.WORKSPACE_ID.eq(workspace).and(WORKSPACE_MEMBER.ROLE.eq("owner")));
    }

    @Override
    public Optional<Invitation> findInvitation(String workspace, String id) {
        return dslContext
                .selectFrom(WORKSPACE_INVITATION)
                .where(WORKSPACE_INVITATION.WORKSPACE_ID.eq(workspace))
                .and(WORKSPACE_INVITATION.WORKSPACE_INVITATION_ID.eq(id))
                .fetchOptional(this::invitation);
    }

    @Override
    public Optional<Invitation> findInvitationByHash(String hash) {
        return dslContext
                .selectFrom(WORKSPACE_INVITATION)
                .where(WORKSPACE_INVITATION.TOKEN_HASH.eq(hash))
                .fetchOptional(this::invitation);
    }

    @Override
    public boolean existsPending(String workspace, String email) {
        return dslContext.fetchExists(
                WORKSPACE_INVITATION,
                WORKSPACE_INVITATION
                        .WORKSPACE_ID
                        .eq(workspace)
                        .and(WORKSPACE_INVITATION.EMAIL.eq(email))
                        .and(WORKSPACE_INVITATION.STATUS.eq("pending")));
    }

    @Override
    public void expirePending(String workspace, String email, Instant now) {
        dslContext
                .update(WORKSPACE_INVITATION)
                .set(WORKSPACE_INVITATION.STATUS, "expired")
                .where(WORKSPACE_INVITATION.WORKSPACE_ID.eq(workspace))
                .and(WORKSPACE_INVITATION.EMAIL.eq(email))
                .and(WORKSPACE_INVITATION.STATUS.eq("pending"))
                .and(WORKSPACE_INVITATION.EXPIRES_AT.le(now))
                .execute();
    }

    @Override
    public void save(Invitation i) {
        dslContext
                .insertInto(WORKSPACE_INVITATION)
                .set(WORKSPACE_INVITATION.WORKSPACE_INVITATION_ID, i.id())
                .set(WORKSPACE_INVITATION.WORKSPACE_ID, i.workspaceId())
                .set(WORKSPACE_INVITATION.EMAIL, i.email())
                .set(WORKSPACE_INVITATION.ROLE, i.role().name())
                .set(WORKSPACE_INVITATION.TOKEN_HASH, i.tokenHash())
                .set(WORKSPACE_INVITATION.STATUS, i.status())
                .set(WORKSPACE_INVITATION.EXPIRES_AT, i.expiresAt())
                .set(WORKSPACE_INVITATION.INVITED_BY, i.invitedBy())
                .set(WORKSPACE_INVITATION.CREATED_AT, i.createdAt())
                .set(WORKSPACE_INVITATION.ACCEPTED_BY, i.acceptedBy())
                .set(WORKSPACE_INVITATION.ACCEPTED_AT, i.acceptedAt())
                .set(WORKSPACE_INVITATION.REVOKED_BY, i.revokedBy())
                .set(WORKSPACE_INVITATION.REVOKED_AT, i.revokedAt())
                .onConflict(WORKSPACE_INVITATION.WORKSPACE_INVITATION_ID)
                .doUpdate()
                .set(WORKSPACE_INVITATION.STATUS, i.status())
                .set(WORKSPACE_INVITATION.ACCEPTED_BY, i.acceptedBy())
                .set(WORKSPACE_INVITATION.ACCEPTED_AT, i.acceptedAt())
                .set(WORKSPACE_INVITATION.REVOKED_BY, i.revokedBy())
                .set(WORKSPACE_INVITATION.REVOKED_AT, i.revokedAt())
                .execute();
    }

    @Override
    public List<Invitation> findInvitations(
            String workspace, boolean owner, Set<String> statuses, Instant now, Instant time, String id, int limit) {
        Field<String> effective = DSL.when(
                        WORKSPACE_INVITATION.STATUS.eq("pending").and(WORKSPACE_INVITATION.EXPIRES_AT.le(now)),
                        "expired")
                .otherwise(WORKSPACE_INVITATION.STATUS);
        return dslContext
                .selectFrom(WORKSPACE_INVITATION)
                .where(WORKSPACE_INVITATION.WORKSPACE_ID.eq(workspace))
                .and(owner ? DSL.noCondition() : WORKSPACE_INVITATION.ROLE.ne("admin"))
                .and(statuses.isEmpty() ? DSL.noCondition() : effective.in(statuses))
                .and(before(WORKSPACE_INVITATION.CREATED_AT, WORKSPACE_INVITATION.WORKSPACE_INVITATION_ID, time, id))
                .orderBy(WORKSPACE_INVITATION.CREATED_AT.desc(), WORKSPACE_INVITATION.WORKSPACE_INVITATION_ID.desc())
                .limit(limit)
                .fetch(this::invitation);
    }

    @Override
    public void revokePending(String workspace, String issuer, WorkspaceRole retainedRole, String actor, Instant now) {
        Condition invalid = retainedRole == null || !retainedRole.editsSettings()
                ? DSL.trueCondition()
                : retainedRole == WorkspaceRole.admin ? WORKSPACE_INVITATION.ROLE.eq("admin") : DSL.falseCondition();
        dslContext
                .update(WORKSPACE_INVITATION)
                .set(WORKSPACE_INVITATION.STATUS, "revoked")
                .set(WORKSPACE_INVITATION.REVOKED_AT, now)
                .set(WORKSPACE_INVITATION.REVOKED_BY, actor)
                .where(WORKSPACE_INVITATION.WORKSPACE_ID.eq(workspace))
                .and(WORKSPACE_INVITATION.STATUS.eq("pending"))
                .and(issuer == null ? DSL.noCondition() : WORKSPACE_INVITATION.INVITED_BY.eq(issuer))
                .and(invalid)
                .execute();
    }

    private Condition before(Field<Instant> timeField, Field<String> idField, Instant time, String id) {
        return time == null
                ? DSL.noCondition()
                : timeField.lt(time).or(timeField.eq(time).and(idField.lt(id)));
    }

    private Workspace workspace(Record r) {
        return Workspace.fromPersistence(
                r.get(WORKSPACE.WORKSPACE_ID),
                r.get(WORKSPACE.NAME),
                r.get(WORKSPACE.SLUG),
                r.get(WORKSPACE.CREATED_AT),
                r.get(WORKSPACE.CREATED_BY),
                r.get(WORKSPACE.UPDATED_AT),
                r.get(WORKSPACE.UPDATED_BY),
                r.get(WORKSPACE.UPDATED_BY_AGENT),
                r.get(WORKSPACE.DELETED_AT),
                r.get(WORKSPACE.DELETED_BY));
    }

    private Membership member(Record r) {
        return Membership.fromPersistence(
                r.get(WORKSPACE_MEMBER.WORKSPACE_MEMBER_ID),
                r.get(WORKSPACE_MEMBER.WORKSPACE_ID),
                r.get(WORKSPACE_MEMBER.IAM_USER_ID),
                WorkspaceRole.valueOf(r.get(WORKSPACE_MEMBER.ROLE)),
                r.get(WORKSPACE_MEMBER.JOINED_AT));
    }

    private Invitation invitation(Record r) {
        return Invitation.fromPersistence(
                r.get(WORKSPACE_INVITATION.WORKSPACE_INVITATION_ID),
                r.get(WORKSPACE_INVITATION.WORKSPACE_ID),
                r.get(WORKSPACE_INVITATION.EMAIL),
                WorkspaceRole.valueOf(r.get(WORKSPACE_INVITATION.ROLE)),
                r.get(WORKSPACE_INVITATION.TOKEN_HASH),
                r.get(WORKSPACE_INVITATION.STATUS),
                r.get(WORKSPACE_INVITATION.EXPIRES_AT),
                r.get(WORKSPACE_INVITATION.INVITED_BY),
                r.get(WORKSPACE_INVITATION.CREATED_AT),
                r.get(WORKSPACE_INVITATION.ACCEPTED_BY),
                r.get(WORKSPACE_INVITATION.ACCEPTED_AT),
                r.get(WORKSPACE_INVITATION.REVOKED_BY),
                r.get(WORKSPACE_INVITATION.REVOKED_AT));
    }
}
