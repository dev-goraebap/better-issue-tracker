package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceCreatedEvent;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.module.workspace.domain.Invitation;
import io.github.goraebap.bit.module.workspace.domain.Membership;
import io.github.goraebap.bit.module.workspace.domain.Workspace;
import io.github.goraebap.bit.module.workspace.domain.WorkspaceRepository;
import io.github.goraebap.bit.module.workspace.domain.WorkspaceRole;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.SecretTokens;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceService implements WorkspaceFacade {
    private final WorkspaceRepository workspaceRepository;
    private final IamFacade iamFacade;
    private final SecretTokens secretTokens;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, String> memberNames(CurrentUser actor, UUID workspaceId, Set<UUID> userIds) {
        access(actor, workspaceId, Action.READ);
        var members = workspaceRepository.findMemberUserIds(workspaceId, userIds);
        if (members.isEmpty()) return Map.of();
        return iamFacade.users(List.copyOf(members)).stream()
                .collect(Collectors.toUnmodifiableMap(IamFacade.User::id, IamFacade.User::name));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasMember(CurrentUser actor, UUID workspaceId, UUID userId) {
        access(actor, workspaceId, Action.READ);
        return userId != null
                && workspaceRepository.findMember(workspaceId, userId).isPresent()
                && iamFacade.user(userId).isPresent();
    }

    @Override
    @Transactional(readOnly = true)
    public void requireAccess(CurrentUser actor, UUID workspaceId, Action action) {
        access(actor, workspaceId, action);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean allows(CurrentUser actor, UUID workspaceId, Action action) {
        return permits(access(actor, workspaceId, Action.READ).role(), action);
    }

    @Override
    @Transactional(readOnly = true)
    public void requireMemberManagement(CurrentUser actor, UUID workspaceId, UUID memberId) {
        var own = access(actor, workspaceId, Action.MANAGE_MEMBERS);
        if (!own.role().manages(target(workspaceId, memberId).role())) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
    }

    @Override
    @Transactional(readOnly = true)
    public void requireInvitationManagement(CurrentUser actor, UUID workspaceId, UUID invitationId) {
        managedInvitation(actor, workspaceId, invitationId);
    }

    private Membership access(CurrentUser actor, UUID id, Action action) {
        iamFacade.actor(actor, action == Action.MANAGE_MEMBERS || action == Action.OWNER);
        space(id);
        Membership own = workspaceRepository
                .findMember(id, actor.userId())
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
        if (!permits(own.role(), action)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        return own;
    }

    private static boolean permits(WorkspaceRole role, Action action) {
        return !(action == Action.WRITE_WORK && role == WorkspaceRole.viewer
                || action == Action.OWNER && role != WorkspaceRole.owner
                || (action == Action.EDIT_SETTINGS || action == Action.MANAGE_MEMBERS) && !role.editsSettings());
    }

    private Workspace space(UUID id) {
        return workspaceRepository.findById(id).orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
    }

    @Transactional
    public UUID create(CurrentUser actor, String name, String slug) {
        iamFacade.actor(actor, true);
        Workspace w = Workspace.create(name, slug, actor.userId(), clock.instant());
        if (workspaceRepository.existsBySlug(w.slug())) throw WorkspaceErrorCode.WORKSPACE_SLUG_CONFLICT.raise();
        workspaceRepository.save(w);
        workspaceRepository.saveAll(
                List.of(Membership.create(w.id(), actor.userId(), WorkspaceRole.owner, clock.instant())));
        assertOwner(w.id());
        applicationEventPublisher.publishEvent(new WorkspaceCreatedEvent(
                w.id(),
                actor.userId(),
                actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null,
                w.createdAt()));
        return w.id();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SpaceRef> mine(CurrentUser actor) {
        iamFacade.actor(actor, false);
        return workspaceRepository.findAllByUserId(actor.userId(), null, null, 200).stream()
                .map(w -> new SpaceRef(w.id(), w.name(), w.slug(), w.myRole().name()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UUID resolve(CurrentUser actor, String hint) {
        var spaces = mine(actor);
        String names = spaces.stream().map(SpaceRef::name).collect(Collectors.joining(", "));
        if (hint == null || hint.isBlank()) {
            if (spaces.size() == 1) return spaces.getFirst().id();
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise(
                    spaces.isEmpty()
                            ? "속한 워크스페이스가 없습니다."
                            : "워크스페이스가 여럿입니다(" + names + "). workspace 인자로 이름이나 슬러그를 주세요.");
        }
        String wanted = hint.strip();
        return spaces.stream()
                .filter(space -> space.id().toString().equals(wanted)
                        || space.slug().equalsIgnoreCase(wanted)
                        || space.name().equalsIgnoreCase(wanted))
                .map(SpaceRef::id)
                .findFirst()
                .orElseThrow(() -> CommonErrorCode.COMMON_INVALID_REQUEST.raise(
                        "'" + wanted + "' 워크스페이스를 찾을 수 없습니다. 속한 워크스페이스: " + names));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberRef> members(CurrentUser actor, UUID workspaceId) {
        access(actor, workspaceId, Action.READ);
        var rows = workspaceRepository.findMembers(workspaceId, null, null, 1000);
        Map<UUID, IamFacade.User> users =
                iamFacade.users(rows.stream().map(Membership::userId).distinct().toList()).stream()
                        .collect(Collectors.toMap(IamFacade.User::id, Function.identity()));
        return rows.stream()
                .filter(m -> users.containsKey(m.userId()))
                .map(m -> {
                    var u = users.get(m.userId());
                    return new MemberRef(
                            m.userId(), u.name(), u.email(), m.role().name());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkspaceViews.Spaces list(CurrentUser actor, String cursor, int size, String sort, String direction) {
        iamFacade.actor(actor, false);
        sort(sort, direction, "createdAt", "DESC");
        String scope = actor.userId() + ":spaces:CREATED_DESC";
        var point = WorkspaceCursor.decode(cursor, scope, size);
        var rows = workspaceRepository.findAllByUserId(actor.userId(), point.time(), point.id(), size + 1);
        var page = rows.stream().limit(size).toList();
        String next = rows.size() > size
                ? WorkspaceCursor.encode(
                        scope, page.getLast().createdAt(), page.getLast().id())
                : null;
        return new WorkspaceViews.Spaces(
                page.stream()
                        .map(w -> new WorkspaceViews.Space(w.id(), w.name(), w.slug(), w.myRole(), w.createdAt()))
                        .toList(),
                next);
    }

    @Transactional(readOnly = true)
    public WorkspaceViews.Space get(CurrentUser actor, UUID id) {
        var own = access(actor, id, Action.READ);
        var w = space(id);
        return new WorkspaceViews.Space(w.id(), w.name(), w.slug(), own.role(), w.createdAt());
    }

    @Transactional
    public void rename(CurrentUser actor, UUID id, String name, boolean present) {
        access(actor, id, Action.EDIT_SETTINGS);
        if (!present) return;
        var w = space(id);
        w.rename(
                name,
                actor.userId(),
                actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null,
                clock.instant());
        workspaceRepository.save(w);
    }

    @Transactional
    public void delete(CurrentUser actor, UUID id) {
        access(actor, id, Action.OWNER);
        var w = space(id);
        w.delete(actor.userId(), clock.instant());
        workspaceRepository.save(w);
        workspaceRepository.revokePending(id, null, null, actor.userId(), clock.instant());
        iamFacade.clearWorkspace(id, null);
    }

    @Transactional
    public void select(CurrentUser actor, UUID id) {
        iamFacade.actor(actor, true);
        access(actor, id, Action.READ);
        iamFacade.selectWorkspace(actor, id);
    }

    @Transactional(readOnly = true)
    public WorkspaceViews.Members members(
            CurrentUser actor, UUID id, String cursor, int size, String sort, String direction) {
        access(actor, id, Action.READ);
        sort(sort, direction, "joinedAt", "ASC");
        String scope = actor.userId() + ":" + id + ":members:JOINED_ASC";
        var p = WorkspaceCursor.decode(cursor, scope, size);
        var rows = workspaceRepository.findMembers(id, p.time(), p.id(), size + 1);
        var page = rows.stream().limit(size).toList();
        Map<UUID, IamFacade.User> users =
                iamFacade.users(page.stream().map(Membership::userId).distinct().toList()).stream()
                        .collect(Collectors.toMap(IamFacade.User::id, Function.identity()));
        String next = rows.size() > size
                ? WorkspaceCursor.encode(
                        scope, page.getLast().joinedAt(), page.getLast().id())
                : null;
        return new WorkspaceViews.Members(
                page.stream()
                        .map(m -> {
                            var u = users.get(m.userId());
                            return new WorkspaceViews.Member(
                                    m.id(), m.userId(), u.name(), u.email(), m.role(), m.joinedAt());
                        })
                        .toList(),
                next);
    }

    private Membership target(UUID workspace, UUID member) {
        Membership m = workspaceRepository
                .findMemberById(workspace, member)
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
        if (iamFacade.user(m.userId()).isEmpty()) throw WorkspaceErrorCode.WORKSPACE_NOT_FOUND.raise();
        return m;
    }

    @Transactional
    public void role(CurrentUser actor, UUID id, UUID memberId, WorkspaceRole next) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        var m = target(id, memberId);
        if (!own.role().manages(m.role()) || !own.role().manages(next)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        m.changeRole(own.role(), next);
        workspaceRepository.saveAll(List.of(m));
        workspaceRepository.revokePending(id, m.userId(), next, actor.userId(), clock.instant());
        assertOwner(id);
    }

    @Transactional
    public void remove(CurrentUser actor, UUID id, UUID memberId) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        var m = target(id, memberId);
        if (m.role() == WorkspaceRole.owner && own.role() == WorkspaceRole.owner)
            throw WorkspaceErrorCode.WORKSPACE_OWNER_REQUIRED.raise();
        if (!own.role().manages(m.role())) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        if (actor.userId().equals(m.userId())) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        removeMember(actor, id, m);
    }

    @Transactional
    public void leave(CurrentUser actor, UUID id) {
        iamFacade.actor(actor, true);
        var m = access(actor, id, Action.READ);
        if (m.role() == WorkspaceRole.owner) throw WorkspaceErrorCode.WORKSPACE_OWNER_REQUIRED.raise();
        removeMember(actor, id, m);
    }

    private void removeMember(CurrentUser actor, UUID id, Membership member) {
        workspaceRepository.deleteMember(member.id());
        workspaceRepository.revokePending(id, member.userId(), null, actor.userId(), clock.instant());
        iamFacade.clearWorkspace(id, member.userId());
        assertOwner(id);
    }

    @Transactional
    public void transfer(CurrentUser actor, UUID id, UUID userId, IamFacade.Reauthentication proof) {
        var own = access(actor, id, Action.OWNER);
        iamFacade.assertReauthentication(actor, proof);
        if (actor.userId().equals(userId) || iamFacade.user(userId).isEmpty())
            throw WorkspaceErrorCode.WORKSPACE_INVALID_OWNER.raise();
        var next = workspaceRepository
                .findMember(id, userId)
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_INVALID_OWNER::raise);
        own.transferTo(next);
        workspaceRepository.saveAll(List.of(own, next));
        workspaceRepository.revokePending(id, actor.userId(), WorkspaceRole.admin, actor.userId(), clock.instant());
        assertOwner(id);
    }

    private void assertOwner(UUID id) {
        if (workspaceRepository.countOwners(id) != 1)
            throw new IllegalStateException("Workspace owner invariant violated");
    }

    @Transactional
    public WorkspaceViews.CreatedInvitation invite(CurrentUser actor, UUID id, String email, WorkspaceRole role) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        if (!own.role().manages(role)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        String normalized = email.strip().toLowerCase(Locale.ROOT);
        var user = iamFacade.userByEmail(normalized);
        if (user.isPresent()
                && workspaceRepository.findMember(id, user.get().id()).isPresent())
            throw WorkspaceErrorCode.WORKSPACE_MEMBER_EXISTS.raise();
        workspaceRepository.expirePending(id, normalized, clock.instant());
        if (workspaceRepository.existsPending(id, normalized))
            throw WorkspaceErrorCode.WORKSPACE_INVITATION_ALREADY_PENDING.raise();
        String raw = "biti_" + secretTokens.random();
        var i = Invitation.create(
                id, normalized, role, secretTokens.hash("workspace-invitation", raw), actor.userId(), clock.instant());
        workspaceRepository.save(i);
        return new WorkspaceViews.CreatedInvitation(i.id(), raw, i.expiresAt());
    }

    @Transactional(readOnly = true)
    public WorkspaceViews.Invites invitations(
            CurrentUser actor, UUID id, List<String> status, String cursor, int size, String sort, String direction) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        sort(sort, direction, "createdAt", "DESC");
        Set<String> statuses = status == null
                ? Set.of()
                : status.stream()
                        .flatMap(s -> java.util.Arrays.stream(s.split(",")))
                        .map(String::strip)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toSet());
        if (!Set.of("pending", "accepted", "revoked", "expired").containsAll(statuses))
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        String scope = actor.userId() + ":" + id + ":invitations:CREATED_DESC:"
                + statuses.stream().sorted().collect(Collectors.joining(","));
        var p = WorkspaceCursor.decode(cursor, scope, size);
        var rows = workspaceRepository.findInvitations(
                id, own.role() == WorkspaceRole.owner, statuses, clock.instant(), p.time(), p.id(), size + 1);
        var page = rows.stream().limit(size).toList();
        var users = iamFacade
                .users(page.stream().map(Invitation::invitedBy).distinct().toList())
                .stream()
                .collect(Collectors.toMap(IamFacade.User::id, Function.identity()));
        String next = rows.size() > size
                ? WorkspaceCursor.encode(
                        scope, page.getLast().createdAt(), page.getLast().id())
                : null;
        return new WorkspaceViews.Invites(
                page.stream().map(i -> view(i, users.get(i.invitedBy()))).toList(), next);
    }

    @Transactional(readOnly = true)
    public WorkspaceViews.Invite invitation(CurrentUser actor, UUID id, UUID invitationId) {
        var i = managedInvitation(actor, id, invitationId);
        return view(i, iamFacade.user(i.invitedBy()).orElse(null));
    }

    private Invitation managedInvitation(CurrentUser actor, UUID id, UUID invitationId) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        var i = workspaceRepository
                .findInvitation(id, invitationId)
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
        if (!own.role().manages(i.role())) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        return i;
    }

    @Transactional
    public void revoke(CurrentUser actor, UUID id, UUID invitationId) {
        var i = managedInvitation(actor, id, invitationId);
        if (i.status().equals("accepted")) throw WorkspaceErrorCode.WORKSPACE_INVITATION_ALREADY_ACCEPTED.raise();
        if (i.pending(clock.instant())) {
            i.revoke(actor.userId(), clock.instant());
            workspaceRepository.save(i);
        }
    }

    private WorkspaceViews.Invite view(Invitation i, IamFacade.User u) {
        return new WorkspaceViews.Invite(
                i.id(),
                i.email(),
                i.role(),
                i.effectiveStatus(clock.instant()),
                i.expiresAt(),
                i.invitedBy(),
                u == null ? "탈퇴한 사용자" : u.name(),
                i.createdAt(),
                i.acceptedBy(),
                i.acceptedAt(),
                i.revokedAt());
    }

    private Invitation lookup(String raw) {
        if (raw == null || !raw.matches("biti_[A-Za-z0-9_-]{43}"))
            throw WorkspaceErrorCode.WORKSPACE_INVITATION_UNAVAILABLE.raise();
        return workspaceRepository
                .findInvitationByHash(secretTokens.hash("workspace-invitation", raw))
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_INVITATION_UNAVAILABLE::raise);
    }

    private void liveInvitation(Invitation i) {
        if (!i.pending(clock.instant())
                || workspaceRepository.findById(i.workspaceId()).isEmpty()
                || iamFacade.user(i.invitedBy()).isEmpty())
            throw WorkspaceErrorCode.WORKSPACE_INVITATION_UNAVAILABLE.raise();
        var issuer = workspaceRepository.findMember(i.workspaceId(), i.invitedBy());
        if (issuer.isEmpty() || !issuer.get().role().manages(i.role()))
            throw WorkspaceErrorCode.WORKSPACE_INVITATION_UNAVAILABLE.raise();
    }

    @Transactional(readOnly = true)
    public WorkspaceViews.Preview preview(String raw) {
        var i = lookup(raw);
        liveInvitation(i);
        return new WorkspaceViews.Preview(
                i.workspaceId(), space(i.workspaceId()).name(), i.email(), i.role(), i.expiresAt());
    }

    @Transactional
    public WorkspaceViews.Accepted accept(CurrentUser actor, String raw) {
        var user = iamFacade.actor(actor, true);
        var i = lookup(raw);
        if (workspaceRepository.findById(i.workspaceId()).isEmpty())
            throw WorkspaceErrorCode.WORKSPACE_INVITATION_UNAVAILABLE.raise();
        if (i.status().equals("accepted")
                && user.id().equals(i.acceptedBy())
                && workspaceRepository.findMember(i.workspaceId(), user.id()).isPresent())
            return new WorkspaceViews.Accepted(i.workspaceId(), true);
        liveInvitation(i);
        if (!user.email().equals(i.email())) throw WorkspaceErrorCode.WORKSPACE_INVITATION_ACCOUNT_MISMATCH.raise();
        join(i, user.id());
        return new WorkspaceViews.Accepted(i.workspaceId(), false);
    }

    @Transactional
    public UUID register(String raw, IamFacade.PreparedIdentity prepared) {
        var i = lookup(raw);
        liveInvitation(i);
        if (!i.email().equals(prepared.email())) throw WorkspaceErrorCode.WORKSPACE_INVITATION_UNAVAILABLE.raise();
        if (iamFacade.userByEmail(i.email()).isPresent())
            throw WorkspaceErrorCode.WORKSPACE_INVITATION_LOGIN_REQUIRED.raise();
        var user = iamFacade.registerIdentity(prepared);
        join(i, user.id());
        return user.id();
    }

    private void join(Invitation i, UUID user) {
        if (workspaceRepository.findMember(i.workspaceId(), user).isPresent())
            throw WorkspaceErrorCode.WORKSPACE_MEMBER_EXISTS.raise();
        workspaceRepository.saveAll(List.of(Membership.create(i.workspaceId(), user, i.role(), clock.instant())));
        i.accept(user, clock.instant());
        workspaceRepository.save(i);
    }

    private static void sort(String sort, String direction, String expectedSort, String expectedDirection) {
        if (!expectedSort.equals(sort) || !expectedDirection.equals(direction))
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
    }
}
