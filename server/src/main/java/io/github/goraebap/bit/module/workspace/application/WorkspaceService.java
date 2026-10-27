package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.module.file.FileFacade;
import io.github.goraebap.bit.module.file.FileOwner;
import io.github.goraebap.bit.module.file.Picture;
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
    private final FileFacade fileFacade;
    private final SecretTokens secretTokens;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public Map<String, String> memberNames(CurrentUser actor, String workspaceId, Set<String> userIds) {
        access(actor, workspaceId, Action.READ);
        var members = workspaceRepository.findMemberUserIds(workspaceId, userIds);
        if (members.isEmpty()) return Map.of();
        return iamFacade.users(List.copyOf(members)).stream()
                .collect(Collectors.toUnmodifiableMap(IamFacade.User::id, IamFacade.User::name));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasMember(CurrentUser actor, String workspaceId, String userId) {
        access(actor, workspaceId, Action.READ);
        return userId != null
                && workspaceRepository.findMember(workspaceId, userId).isPresent()
                && iamFacade.user(userId).isPresent();
    }

    @Override
    @Transactional(readOnly = true)
    public void requireAccess(CurrentUser actor, String workspaceId, Action action) {
        access(actor, workspaceId, action);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean allows(CurrentUser actor, String workspaceId, Action action) {
        return permits(access(actor, workspaceId, Action.READ), action);
    }

    @Override
    @Transactional(readOnly = true)
    public void requireMemberManagement(CurrentUser actor, String workspaceId, String memberId) {
        var own = access(actor, workspaceId, Action.MANAGE_MEMBERS);
        if (!manages(own, target(workspaceId, memberId))) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
    }

    @Override
    @Transactional(readOnly = true)
    public void requireInvitationManagement(CurrentUser actor, String workspaceId, String invitationId) {
        managedInvitation(actor, workspaceId, invitationId);
    }

    private Membership access(CurrentUser actor, String id, Action action) {
        iamFacade.actor(actor, action == Action.MANAGE_MEMBERS || action == Action.OWNER);
        space(id);
        Membership own = workspaceRepository
                .findMember(id, actor.userId())
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
        if (!permits(own, action)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        return own;
    }

    private boolean permits(Membership member, Action action) {
        if (member.role() == WorkspaceRole.owner) return true;
        var custom = workspaceRepository.memberCustomRole(member.id());
        return custom.isPresent()
                ? action != Action.OWNER && custom.get().permissions().contains(action.name())
                : builtin(member.role(), action);
    }

    private Set<String> permissions(Membership member) {
        return java.util.Arrays.stream(Action.values())
                .filter(a -> permits(member, a))
                .map(Enum::name)
                .collect(Collectors.toSet());
    }

    private String customId(Membership m) {
        return workspaceRepository
                .memberCustomRole(m.id())
                .map(WorkspaceRepository.CustomRole::id)
                .orElse(null);
    }

    private String customName(Membership m) {
        return workspaceRepository
                .memberCustomRole(m.id())
                .map(WorkspaceRepository.CustomRole::name)
                .orElse(null);
    }

    private boolean manages(Membership own, Membership other) {
        if (own.userId().equals(other.userId()) || other.role() == WorkspaceRole.owner) return false;
        return own.role() == WorkspaceRole.owner
                || other.role() != WorkspaceRole.admin
                        && permits(own, Action.MANAGE_MEMBERS)
                        && permissions(own).containsAll(permissions(other));
    }

    private boolean grants(Membership own, WorkspaceRole role) {
        return role != WorkspaceRole.owner
                && (role != WorkspaceRole.admin || own.role() == WorkspaceRole.owner)
                && java.util.Arrays.stream(Action.values())
                        .filter(a -> builtin(role, a))
                        .allMatch(a -> permits(own, a));
    }

    private static boolean builtin(WorkspaceRole role, Action action) {
        return !((action == Action.WRITE_WORK || action == Action.WRITE_DOCUMENTS || action == Action.MANAGE_LABELS)
                        && role == WorkspaceRole.viewer
                || action == Action.OWNER && role != WorkspaceRole.owner
                || (action == Action.EDIT_SETTINGS || action == Action.MANAGE_MEMBERS) && !role.editsSettings());
    }

    @Transactional(readOnly = true)
    public List<WorkspaceViews.CustomRole> customRoles(CurrentUser actor, String id) {
        access(actor, id, Action.READ);
        return workspaceRepository.customRoles(id).stream()
                .map(this::customRoleView)
                .toList();
    }

    private WorkspaceViews.CustomRole customRoleView(WorkspaceRepository.CustomRole r) {
        return new WorkspaceViews.CustomRole(
                r.id(), r.name(), r.permissions(), r.version(), workspaceRepository.customRoleHolders(r.id()));
    }

    @Transactional
    public WorkspaceViews.CustomRole saveCustomRole(
            CurrentUser actor, String id, String roleId, WorkspaceRequests.CustomRole request) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        if (!permits(own, Action.EDIT_SETTINGS)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        var wanted =
                request.permissions().stream().map(Enum::name).collect(Collectors.toCollection(java.util.HashSet::new));
        wanted.add(Action.READ.name());
        if (wanted.contains(Action.OWNER.name()) || !permissions(own).containsAll(wanted))
            throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        String name = request.name().strip();
        if (Set.of("owner", "admin", "member", "viewer", "소유자", "관리자", "멤버", "보기 전용")
                        .contains(name.toLowerCase(Locale.ROOT))
                || workspaceRepository.customRoles(id).stream()
                        .anyMatch(r -> !r.id().equals(roleId) && r.name().equalsIgnoreCase(name)))
            throw WorkspaceErrorCode.WORKSPACE_ROLE_NAME_CONFLICT.raise();
        long version = 0;
        if (roleId != null) {
            var old = workspaceRepository
                    .customRole(id, roleId)
                    .orElseThrow(WorkspaceErrorCode.WORKSPACE_ROLE_NOT_FOUND::raise);
            if (!permissions(own).containsAll(old.permissions())) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
            if (request.expectedVersion() == null || request.expectedVersion() != old.version())
                throw WorkspaceErrorCode.WORKSPACE_ROLE_CONFLICT.raise();
            version = old.version() + 1;
        }
        var role = new WorkspaceRepository.CustomRole(
                roleId == null ? io.github.goraebap.bit.shared.domain.Ids.newId() : roleId, id, name, wanted, version);
        workspaceRepository.saveCustomRole(role);
        return customRoleView(role);
    }

    @Transactional
    public void deleteCustomRole(CurrentUser actor, String id, String roleId, long version) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        if (!permits(own, Action.EDIT_SETTINGS)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        var role = workspaceRepository
                .customRole(id, roleId)
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_ROLE_NOT_FOUND::raise);
        if (!permissions(own).containsAll(role.permissions())) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        if (role.version() != version) throw WorkspaceErrorCode.WORKSPACE_ROLE_CONFLICT.raise();
        if (workspaceRepository.customRoleHolders(roleId) > 0) throw WorkspaceErrorCode.WORKSPACE_ROLE_IN_USE.raise();
        workspaceRepository.deleteCustomRole(roleId);
    }

    private Workspace space(String id) {
        return workspaceRepository.findById(id).orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
    }

    @Transactional
    public String create(CurrentUser actor, String name, String slug) {
        iamFacade.actor(actor, true);
        Workspace w = Workspace.create(name, slug, actor.userId(), clock.instant());
        if (workspaceRepository.existsBySlug(w.slug())) throw WorkspaceErrorCode.WORKSPACE_SLUG_CONFLICT.raise();
        workspaceRepository.save(w);
        workspaceRepository.saveAll(
                List.of(Membership.create(w.id(), actor.userId(), WorkspaceRole.owner, clock.instant())));
        assertOwner(w.id());
        applicationEventPublisher.publishEvent(
                new WorkspaceCreatedEvent(w.id(), actor.userId(), actor.agent(), w.createdAt()));
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
    public String resolve(CurrentUser actor, String hint) {
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
                .filter(space -> space.id().equals(wanted)
                        || space.slug().equalsIgnoreCase(wanted)
                        || space.name().equalsIgnoreCase(wanted))
                .map(SpaceRef::id)
                .findFirst()
                .orElseThrow(() -> CommonErrorCode.COMMON_INVALID_REQUEST.raise(
                        "'" + wanted + "' 워크스페이스를 찾을 수 없습니다. 속한 워크스페이스: " + names));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberRef> members(CurrentUser actor, String workspaceId) {
        access(actor, workspaceId, Action.READ);
        var rows = workspaceRepository.findMembers(workspaceId, null, null, 1000);
        Map<String, IamFacade.User> users =
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
        var logos = pictures(FileOwner.WORKSPACE, page.stream().map(w -> w.id()).toList());
        return new WorkspaceViews.Spaces(
                page.stream()
                        .map(w -> new WorkspaceViews.Space(
                                w.id(),
                                w.name(),
                                w.slug(),
                                w.myRole(),
                                w.createdAt(),
                                logos.get(w.id()),
                                permissions(workspaceRepository
                                        .findMember(w.id(), actor.userId())
                                        .orElseThrow()),
                                customId(workspaceRepository
                                        .findMember(w.id(), actor.userId())
                                        .orElseThrow()),
                                customName(workspaceRepository
                                        .findMember(w.id(), actor.userId())
                                        .orElseThrow())))
                        .toList(),
                next);
    }

    @Transactional(readOnly = true)
    public WorkspaceViews.Space get(CurrentUser actor, String id) {
        var own = access(actor, id, Action.READ);
        var w = space(id);
        return new WorkspaceViews.Space(
                w.id(),
                w.name(),
                w.slug(),
                own.role(),
                w.createdAt(),
                pictures(FileOwner.WORKSPACE, List.of(w.id())).get(w.id()),
                permissions(own),
                customId(own),
                customName(own));
    }

    /** Makes an uploaded square JPEG the workspace's logo; the one before goes (BIT-30). Its admins change it. */
    @Transactional
    public void changeLogo(CurrentUser actor, String id, WorkspaceRequests.Logo request) {
        access(actor, id, Action.EDIT_SETTINGS);
        space(id);
        fileFacade.replacePicture(actor, request.uploadId(), FileOwner.WORKSPACE, id, Picture.SIDE);
    }

    /** Takes the logo away, back to the name's first letter. */
    @Transactional
    public void removeLogo(CurrentUser actor, String id) {
        access(actor, id, Action.EDIT_SETTINGS);
        space(id);
        fileFacade.discardAll(FileOwner.WORKSPACE, id, actor);
    }

    /** The workspace's logo by its id, for its members. */
    @Transactional(readOnly = true)
    public FileFacade.OpenedFile logoBytes(CurrentUser actor, String id, String pictureId) {
        access(actor, id, Action.READ);
        return fileFacade
                .open(FileOwner.WORKSPACE, id, pictureId)
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
    }

    /** Each owner's picture, while files can be opened; none otherwise, and the screens draw their stand-ins. */
    private Map<String, Picture> pictures(FileOwner owner, List<String> ids) {
        if (ids.isEmpty() || !fileFacade.available()) return Map.of();
        return Picture.byOwner(fileFacade.attachmentsOf(owner, ids));
    }

    @Transactional
    public void rename(CurrentUser actor, String id, String name, boolean present) {
        access(actor, id, Action.EDIT_SETTINGS);
        if (!present) return;
        var w = space(id);
        w.rename(name, actor.userId(), actor.agent(), clock.instant());
        workspaceRepository.save(w);
    }

    @Transactional
    public void delete(CurrentUser actor, String id) {
        access(actor, id, Action.OWNER);
        var w = space(id);
        w.delete(actor.userId(), clock.instant());
        workspaceRepository.save(w);
        workspaceRepository.revokePending(id, null, null, actor.userId(), clock.instant());
        iamFacade.clearWorkspace(id, null);
    }

    @Transactional
    public void select(CurrentUser actor, String id) {
        iamFacade.actor(actor, true);
        access(actor, id, Action.READ);
        iamFacade.selectWorkspace(actor, id);
    }

    @Transactional(readOnly = true)
    public WorkspaceViews.Members members(
            CurrentUser actor, String id, String cursor, int size, String sort, String direction) {
        access(actor, id, Action.READ);
        sort(sort, direction, "joinedAt", "ASC");
        String scope = actor.userId() + ":" + id + ":members:JOINED_ASC";
        var p = WorkspaceCursor.decode(cursor, scope, size);
        var rows = workspaceRepository.findMembers(id, p.time(), p.id(), size + 1);
        var page = rows.stream().limit(size).toList();
        var userIds = page.stream().map(Membership::userId).distinct().toList();
        Map<String, IamFacade.User> users =
                iamFacade.users(userIds).stream().collect(Collectors.toMap(IamFacade.User::id, Function.identity()));
        var avatars = pictures(FileOwner.USER, userIds);
        String next = rows.size() > size
                ? WorkspaceCursor.encode(
                        scope, page.getLast().joinedAt(), page.getLast().id())
                : null;
        return new WorkspaceViews.Members(
                page.stream()
                        .map(m -> {
                            var u = users.get(m.userId());
                            return new WorkspaceViews.Member(
                                    m.id(),
                                    m.userId(),
                                    u.name(),
                                    u.email(),
                                    m.role(),
                                    m.joinedAt(),
                                    avatars.get(m.userId()),
                                    customId(m),
                                    customName(m));
                        })
                        .toList(),
                next);
    }

    private Membership target(String workspace, String member) {
        Membership m = workspaceRepository
                .findMemberById(workspace, member)
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
        if (iamFacade.user(m.userId()).isEmpty()) throw WorkspaceErrorCode.WORKSPACE_NOT_FOUND.raise();
        return m;
    }

    @Transactional
    public void role(CurrentUser actor, String id, String memberId, String requested) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        var member = target(id, memberId);
        if (!manages(own, member)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        WorkspaceRole next;
        String customId = null;
        try {
            next = WorkspaceRole.valueOf(requested);
        } catch (IllegalArgumentException invalid) {
            var custom = workspaceRepository
                    .customRole(id, requested)
                    .orElseThrow(WorkspaceErrorCode.WORKSPACE_ROLE_NOT_FOUND::raise);
            if (!permissions(own).containsAll(custom.permissions())) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
            next = WorkspaceRole.viewer;
            customId = custom.id();
        }
        if (customId == null && !grants(own, next)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        member.assignNonOwnerRole(next);
        workspaceRepository.saveAll(List.of(member));
        workspaceRepository.assignCustomRole(member.id(), customId);
        workspaceRepository.revokePending(id, member.userId(), next, actor.userId(), clock.instant());
        assertOwner(id);
    }

    @Transactional
    public void remove(CurrentUser actor, String id, String memberId) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        var m = target(id, memberId);
        if (m.role() == WorkspaceRole.owner && own.role() == WorkspaceRole.owner)
            throw WorkspaceErrorCode.WORKSPACE_OWNER_REQUIRED.raise();
        if (!manages(own, m)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        if (actor.userId().equals(m.userId())) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        removeMember(actor, id, m);
    }

    @Transactional
    public void leave(CurrentUser actor, String id) {
        iamFacade.actor(actor, true);
        var m = access(actor, id, Action.READ);
        if (m.role() == WorkspaceRole.owner) throw WorkspaceErrorCode.WORKSPACE_OWNER_REQUIRED.raise();
        removeMember(actor, id, m);
    }

    private void removeMember(CurrentUser actor, String id, Membership member) {
        workspaceRepository.deleteMember(member.id());
        workspaceRepository.revokePending(id, member.userId(), null, actor.userId(), clock.instant());
        iamFacade.clearWorkspace(id, member.userId());
        assertOwner(id);
    }

    @Transactional
    public void transfer(CurrentUser actor, String id, String userId, IamFacade.Reauthentication proof) {
        var own = access(actor, id, Action.OWNER);
        iamFacade.assertReauthentication(actor, proof);
        if (actor.userId().equals(userId) || iamFacade.user(userId).isEmpty())
            throw WorkspaceErrorCode.WORKSPACE_INVALID_OWNER.raise();
        var next = workspaceRepository
                .findMember(id, userId)
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_INVALID_OWNER::raise);
        own.transferTo(next);
        workspaceRepository.assignCustomRole(own.id(), null);
        workspaceRepository.assignCustomRole(next.id(), null);
        workspaceRepository.saveAll(List.of(own, next));
        workspaceRepository.revokePending(id, actor.userId(), WorkspaceRole.admin, actor.userId(), clock.instant());
        assertOwner(id);
    }

    private void assertOwner(String id) {
        if (workspaceRepository.countOwners(id) != 1)
            throw new IllegalStateException("Workspace owner invariant violated");
    }

    @Transactional
    public WorkspaceViews.CreatedInvitation invite(CurrentUser actor, String id, String email, WorkspaceRole role) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        if (!grants(own, role)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
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
            CurrentUser actor, String id, List<String> status, String cursor, int size, String sort, String direction) {
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
    public WorkspaceViews.Invite invitation(CurrentUser actor, String id, String invitationId) {
        var i = managedInvitation(actor, id, invitationId);
        return view(i, iamFacade.user(i.invitedBy()).orElse(null));
    }

    private Invitation managedInvitation(CurrentUser actor, String id, String invitationId) {
        var own = access(actor, id, Action.MANAGE_MEMBERS);
        var i = workspaceRepository
                .findInvitation(id, invitationId)
                .orElseThrow(WorkspaceErrorCode.WORKSPACE_NOT_FOUND::raise);
        if (!grants(own, i.role())) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        return i;
    }

    @Transactional
    public void revoke(CurrentUser actor, String id, String invitationId) {
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
        var workItemr = workspaceRepository.findMember(i.workspaceId(), i.invitedBy());
        if (workItemr.isEmpty() || !grants(workItemr.get(), i.role()))
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
    public String register(String raw, IamFacade.PreparedIdentity prepared) {
        var i = lookup(raw);
        liveInvitation(i);
        if (!i.email().equals(prepared.email())) throw WorkspaceErrorCode.WORKSPACE_INVITATION_UNAVAILABLE.raise();
        if (iamFacade.userByEmail(i.email()).isPresent())
            throw WorkspaceErrorCode.WORKSPACE_INVITATION_LOGIN_REQUIRED.raise();
        var user = iamFacade.registerIdentity(prepared);
        join(i, user.id());
        return user.id();
    }

    private void join(Invitation i, String user) {
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
