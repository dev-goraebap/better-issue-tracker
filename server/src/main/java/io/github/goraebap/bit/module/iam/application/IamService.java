package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.iam.domain.AgentKey;
import io.github.goraebap.bit.module.iam.domain.IamRepository;
import io.github.goraebap.bit.module.iam.domain.Identity;
import io.github.goraebap.bit.module.iam.domain.LoginSession;
import io.github.goraebap.bit.module.iam.domain.PasswordCredential;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.SecretTokens;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IamService {
    private final IamRepository iamRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public boolean canBootstrap() {
        return !iamRepository.hasUsers();
    }

    @Transactional(readOnly = true)
    public Optional<PasswordCredential> password(String email) {
        return iamRepository.findByEmail(email).flatMap(user -> iamRepository.findPassword(user.id()));
    }

    @Transactional(readOnly = true)
    public PasswordCredential password(CurrentUser actor) {
        return iamRepository
                .findPassword(requireActor(actor, true).id())
                .orElseThrow(AuthErrorCode.AUTH_UNAUTHENTICATED::raise);
    }

    @Transactional
    public void bootstrap(String email, String name, String hash) {
        if (iamRepository.hasUsers()) throw AuthErrorCode.AUTH_BOOTSTRAP_CLOSED.raise();
        iamRepository.createUser(new Identity(UUID.randomUUID(), email, name, true), hash, clock.instant());
    }

    /** Return failure, rather than throw, so failed-attempt updates commit. */
    @Transactional
    public Optional<LoginSession> login(String email, String expectedHash, boolean matches, String tokenHash) {
        var user = iamRepository.findByEmail(email);
        if (user.isEmpty()) return Optional.empty();
        var password = iamRepository.findPassword(user.get().id()).orElseThrow();
        if (!verify(password, expectedHash, matches)) return Optional.empty();
        LoginSession session = newSession(user.get().id(), tokenHash);
        iamRepository.saveSession(session);
        return Optional.of(session);
    }

    @Transactional
    public boolean reauthenticate(CurrentUser actor, String expectedHash, boolean matches) {
        Identity user = requireActor(actor, true);
        return verify(iamRepository.findPassword(user.id()).orElseThrow(), expectedHash, matches);
    }

    @Transactional
    public Optional<CurrentUser> authenticate(String hash, CurrentUser.Method method) {
        Instant now = clock.instant();
        if (method == CurrentUser.Method.SESSION) {
            var session = iamRepository.findSessionByHash(hash);
            if (session.isEmpty()
                    || session.get().expired(now)
                    || !SecretTokens.equal(hash, session.get().hash())) return Optional.empty();
            var user = iamRepository.findUser(session.get().userId());
            if (user.isEmpty()) return Optional.empty();
            var password = iamRepository.findPassword(user.get().id()).orElseThrow();
            if (!session.get().lastSeenAt().plusSeconds(300).isAfter(now))
                iamRepository.saveSession(session.get().seen(now));
            return Optional.of(new CurrentUser(
                    user.get().id(),
                    user.get().instanceAdmin(),
                    method,
                    session.get().id(),
                    null,
                    password.mustChange()));
        }
        var key = iamRepository.findKeyByHash(hash);
        if (key.isEmpty()
                || !key.get().usable(now)
                || !SecretTokens.equal(hash, key.get().hash())) return Optional.empty();
        var user = iamRepository.findUser(key.get().userId());
        if (user.isEmpty()
                || iamRepository.findPassword(user.get().id()).orElseThrow().mustChange()) return Optional.empty();
        if (key.get().lastUsedAt() == null
                || !key.get().lastUsedAt().plusSeconds(60).isAfter(now))
            iamRepository.touchKey(key.get().id(), now);
        return Optional.of(new CurrentUser(
                user.get().id(),
                user.get().instanceAdmin(),
                method,
                key.get().id(),
                key.get().agentName(),
                false));
    }

    @Transactional(readOnly = true)
    public IamViews.Me me(CurrentUser actor) {
        Identity user = requireActor(actor, false);
        boolean mustChange = iamRepository.findPassword(user.id()).orElseThrow().mustChange();
        return new IamViews.Me(
                user.id(),
                user.email(),
                user.name(),
                user.instanceAdmin(),
                mustChange,
                actor.method(),
                actor.agentName());
    }

    @Transactional(readOnly = true)
    public IamViews.Session currentSession(CurrentUser actor) {
        requireActor(actor, true);
        var session =
                iamRepository.findSession(actor.credentialId()).orElseThrow(AuthErrorCode.AUTH_UNAUTHENTICATED::raise);
        var user = me(actor);
        return new IamViews.Session(
                user,
                session.expiresAt(),
                session.absoluteExpiresAt(),
                user.mustChangePassword(),
                iamRepository.activeWorkspace(actor.credentialId()));
    }

    @Transactional
    public void logout(CurrentUser actor, boolean all) {
        requireActor(actor, true);
        if (all) iamRepository.deleteSessions(actor.userId());
        else iamRepository.deleteSession(actor.credentialId());
    }

    @Transactional
    public LoginSession changePassword(CurrentUser actor, String expectedHash, String newHash, String tokenHash) {
        requirePasswordSnapshot(actor, expectedHash);
        replacePassword(actor.userId(), newHash, false);
        LoginSession session = newSession(actor.userId(), tokenHash);
        iamRepository.saveSession(session);
        return session;
    }

    @Transactional
    public void temporaryPassword(CurrentUser actor, UUID target, String expectedHash, String newHash) {
        Identity user = requirePasswordSnapshot(actor, expectedHash);
        if (!user.instanceAdmin() || actor.userId().equals(target)) throw AuthErrorCode.AUTH_FORBIDDEN.raise();
        iamRepository.findUser(target).orElseThrow(AuthErrorCode.AUTH_NOT_FOUND::raise);
        replacePassword(target, newHash, true);
    }

    @Transactional
    public void createKey(CurrentUser actor, String expectedHash, AgentKey key) {
        requirePasswordSnapshot(actor, expectedHash);
        if (iamRepository.findPassword(actor.userId()).orElseThrow().mustChange())
            throw AuthErrorCode.AUTH_FORBIDDEN.raise();
        iamRepository.createKey(key);
    }

    @Transactional(readOnly = true)
    public List<AgentKey> keys(CurrentUser actor, Instant beforeTime, UUID beforeId, int limit) {
        requireActor(actor, true);
        if (iamRepository.findPassword(actor.userId()).orElseThrow().mustChange())
            throw AuthErrorCode.AUTH_FORBIDDEN.raise();
        return iamRepository.findKeys(actor.userId(), beforeTime, beforeId, limit);
    }

    @Transactional
    public void revokeKey(CurrentUser actor, UUID id) {
        requireActor(actor, true);
        if (iamRepository.findPassword(actor.userId()).orElseThrow().mustChange())
            throw AuthErrorCode.AUTH_FORBIDDEN.raise();
        var key = iamRepository
                .findKey(id)
                .filter(k -> k.userId().equals(actor.userId()))
                .orElseThrow(AuthErrorCode.AUTH_NOT_FOUND::raise);
        if (key.revokedAt() == null) iamRepository.revokeKey(id, clock.instant());
    }

    @Transactional(readOnly = true)
    public IamFacade.User actor(CurrentUser actor, boolean sessionOnly) {
        Identity identity = requireActor(actor, sessionOnly);
        if (iamRepository.findPassword(identity.id()).orElseThrow().mustChange())
            throw AuthErrorCode.AUTH_FORBIDDEN.raise();
        return summary(identity);
    }

    @Transactional(readOnly = true)
    public Optional<IamFacade.User> user(UUID id) {
        return iamRepository.findUser(id).map(this::summary);
    }

    @Transactional(readOnly = true)
    public Optional<IamFacade.User> userByEmail(String email) {
        return iamRepository.findByEmail(email).map(this::summary);
    }

    @Transactional(readOnly = true)
    public List<IamFacade.User> users(List<UUID> ids) {
        return iamRepository.findAllById(ids).stream().map(this::summary).toList();
    }

    @Transactional
    public IamFacade.User registerIdentity(IamFacade.PreparedIdentity prepared) {
        if (iamRepository.findByEmail(prepared.email()).isPresent())
            throw io.github.goraebap.bit.shared.error.CommonErrorCode.COMMON_CONFLICT.raise();
        var identity = new Identity(prepared.id(), prepared.email(), prepared.name(), false);
        iamRepository.createUser(identity, prepared.passwordHash(), clock.instant());
        return summary(identity);
    }

    @Transactional
    public void assertReauthentication(CurrentUser actor, IamFacade.Reauthentication proof) {
        if (!actor.userId().equals(proof.userId()) || !actor.credentialId().equals(proof.credentialId()))
            throw AuthErrorCode.AUTH_INVALID_CREDENTIALS.raise();
        requirePasswordSnapshot(actor, proof.passwordHash());
    }

    @Transactional
    public void selectWorkspace(CurrentUser actor, UUID workspaceId) {
        actor(actor, true);
        iamRepository.selectWorkspace(actor.credentialId(), workspaceId);
    }

    @Transactional
    public void clearWorkspace(UUID workspaceId, UUID userId) {
        iamRepository.clearWorkspace(workspaceId, userId);
    }

    private IamFacade.User summary(Identity identity) {
        return new IamFacade.User(identity.id(), identity.email(), identity.name());
    }

    private boolean verify(PasswordCredential password, String expectedHash, boolean matches) {
        Instant now = clock.instant();
        if (!SecretTokens.equal(password.hash(), expectedHash) || password.locked(now)) return false;
        iamRepository.savePassword(matches ? password.verified() : password.failed(now), now);
        return matches;
    }

    private Identity requirePasswordSnapshot(CurrentUser actor, String expectedHash) {
        Identity user = requireActor(actor, true);
        var password = iamRepository.findPassword(user.id()).orElseThrow();
        if (!SecretTokens.equal(password.hash(), expectedHash) || password.locked(clock.instant()))
            throw AuthErrorCode.AUTH_INVALID_CREDENTIALS.raise();
        return user;
    }

    private Identity requireActor(CurrentUser actor, boolean sessionOnly) {
        if (actor == null) throw AuthErrorCode.AUTH_UNAUTHENTICATED.raise();
        if (sessionOnly && actor.method() != CurrentUser.Method.SESSION) throw AuthErrorCode.AUTH_FORBIDDEN.raise();
        Instant now = clock.instant();
        if (actor.method() == CurrentUser.Method.SESSION) {
            if (iamRepository
                    .findSession(actor.credentialId())
                    .filter(s -> s.userId().equals(actor.userId()) && !s.expired(now))
                    .isEmpty()) throw AuthErrorCode.AUTH_UNAUTHENTICATED.raise();
        } else if (iamRepository
                .findKey(actor.credentialId())
                .filter(k -> k.userId().equals(actor.userId()) && k.usable(now))
                .isEmpty()) throw AuthErrorCode.AUTH_UNAUTHENTICATED.raise();
        return iamRepository.findUser(actor.userId()).orElseThrow(AuthErrorCode.AUTH_UNAUTHENTICATED::raise);
    }

    private void replacePassword(UUID userId, String hash, boolean mustChange) {
        iamRepository.savePassword(
                new PasswordCredential(userId, hash, 0, null, mustChange, clock.instant()), clock.instant());
        iamRepository.deleteSessions(userId);
        iamRepository.revokeKeys(userId, clock.instant());
    }

    private LoginSession newSession(UUID userId, String hash) {
        Instant now = clock.instant();
        return new LoginSession(
                UUID.randomUUID(), userId, hash, now.plusSeconds(7 * 86400), now.plusSeconds(30 * 86400), now, now);
    }
}
