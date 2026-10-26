package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.iam.domain.AgentKey;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.SecretTokens;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService implements IamFacade {
    private final IamService iamService;
    private final SecretTokens tokenCodec;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final String dummyHash;

    AuthService(IamService iamService, SecretTokens tokenCodec, PasswordEncoder passwordEncoder, Clock clock) {
        this.iamService = iamService;
        this.tokenCodec = tokenCodec;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        dummyHash = passwordEncoder.encode(tokenCodec.random());
    }

    public record IssuedSession(String token, CurrentUser principal, Instant expiresAt) {
        @Override
        public String toString() {
            return "IssuedSession[redacted]";
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void bootstrap(IamRequests.Bootstrap request) {
        validatePassword(request.password());
        iamService.bootstrap(
                normalize(request.email()), request.name().strip(), passwordEncoder.encode(request.password()));
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public IssuedSession login(IamRequests.Login request) {
        String email = normalize(request.email());
        String hash = iamService.password(email).map(p -> p.hash()).orElse(dummyHash);
        boolean matches = matches(request.password(), hash);
        String token = tokenCodec.random();
        var session = iamService
                .login(email, hash, matches, tokenCodec.hash("session", token))
                .orElseThrow(AuthErrorCode.AUTH_INVALID_CREDENTIALS::raise);
        CurrentUser principal = iamService
                .authenticate(session.hash(), CurrentUser.Method.SESSION)
                .orElseThrow();
        return new IssuedSession(token, principal, session.expiresAt());
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public Optional<CurrentUser> authenticate(String token, CurrentUser.Method method) {
        if (token == null
                || !(method == CurrentUser.Method.SESSION
                        ? token.matches("[A-Za-z0-9_-]{43}")
                        : token.matches("bit_[A-Za-z0-9_-]{43}"))) return Optional.empty();
        return iamService.authenticate(
                tokenCodec.hash(method == CurrentUser.Method.SESSION ? "session" : "api-key", token), method);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public IssuedSession changePassword(CurrentUser actor, IamRequests.Password request) {
        validatePassword(request.newPassword());
        String expectedHash = reauthenticateHash(actor, request.currentPassword());
        String token = tokenCodec.random();
        var session = iamService.changePassword(
                actor, expectedHash, passwordEncoder.encode(request.newPassword()), tokenCodec.hash("session", token));
        var principal = iamService
                .authenticate(session.hash(), CurrentUser.Method.SESSION)
                .orElseThrow();
        return new IssuedSession(token, principal, session.expiresAt());
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public IamViews.CreatedKey createKey(CurrentUser actor, IamRequests.CreateKey request) {
        int days = request.expiresInDays() == null ? 30 : request.expiresInDays();
        if (!Set.of(0, 1, 7, 30, 90).contains(days)) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        String expectedHash = reauthenticateHash(actor, request.currentPassword());
        String raw = "bit_" + tokenCodec.random();
        Instant now = clock.instant();
        Instant expires = days == 0 ? null : now.plusSeconds(days * 86400L);
        var key = new AgentKey(
                Ids.newId(),
                actor.userId(),
                request.name().strip(),
                request.agentName() == null || request.agentName().isBlank()
                        ? null
                        : request.agentName().strip(),
                raw.substring(0, 12),
                tokenCodec.hash("api-key", raw),
                null,
                expires,
                null,
                now);
        iamService.createKey(actor, expectedHash, key);
        return new IamViews.CreatedKey(key.id(), raw, key.prefix(), expires);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public IamViews.TemporaryPassword temporaryPassword(
            CurrentUser actor, String target, IamRequests.Reauthenticate request) {
        if (!actor.instanceAdmin() || actor.method() != CurrentUser.Method.SESSION)
            throw AuthErrorCode.AUTH_FORBIDDEN.raise();
        String expectedHash = reauthenticateHash(actor, request.currentPassword());
        String raw = tokenCodec.random();
        iamService.temporaryPassword(actor, target, expectedHash, passwordEncoder.encode(raw));
        return new IamViews.TemporaryPassword(raw);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public IamViews.Keys keys(CurrentUser actor, String cursor, int size) {
        if (size < 1 || size > 100) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        Instant beforeTime = null;
        String beforeId = null;
        if (cursor != null) {
            try {
                String[] values =
                        new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", -1);
                if (values.length != 4 || !values[0].equals("CREATED_DESC") || !values[1].equals(actor.userId()))
                    throw new IllegalArgumentException("cursor");
                beforeTime = Instant.parse(values[2]);
                beforeId = Ids.parse(values[3]);
            } catch (IllegalArgumentException | java.time.format.DateTimeParseException invalid) {
                throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
            }
        }
        var rows = iamService.keys(actor, beforeTime, beforeId, size + 1);
        List<AgentKey> page = rows.stream().limit(size).toList();
        String next = null;
        if (rows.size() > size) {
            AgentKey last = page.getLast();
            next = Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(("CREATED_DESC|" + actor.userId() + "|" + last.createdAt() + "|" + last.id())
                            .getBytes(StandardCharsets.UTF_8));
        }
        return new IamViews.Keys(
                page.stream()
                        .map(k -> new IamViews.Key(
                                k.id(),
                                k.name(),
                                k.agentName(),
                                k.prefix(),
                                k.createdAt(),
                                k.lastUsedAt(),
                                k.expiresAt(),
                                k.revokedAt()))
                        .toList(),
                next);
    }

    @Override
    @Transactional(readOnly = true)
    public IamFacade.User actor(CurrentUser actor, boolean sessionOnly) {
        return iamService.actor(actor, sessionOnly);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<IamFacade.User> user(String id) {
        return iamService.user(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<IamFacade.User> userByEmail(String email) {
        return iamService.userByEmail(email);
    }

    @Override
    @Transactional(readOnly = true)
    public List<IamFacade.User> users(List<String> ids) {
        return iamService.users(ids);
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public IamFacade.PreparedIdentity prepareIdentity(String email, String name, String password) {
        validatePassword(password);
        return new IamFacade.PreparedIdentity(
                Ids.newId(), normalize(email), name.strip(), passwordEncoder.encode(password));
    }

    @Override
    @Transactional
    public IamFacade.User registerIdentity(IamFacade.PreparedIdentity identity) {
        return iamService.registerIdentity(identity);
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public IamFacade.Reauthentication reauthenticate(CurrentUser actor, String password) {
        return new IamFacade.Reauthentication(
                actor.userId(), actor.credentialId(), reauthenticateHash(actor, password));
    }

    @Override
    @Transactional
    public void assertReauthentication(CurrentUser actor, IamFacade.Reauthentication proof) {
        iamService.assertReauthentication(actor, proof);
    }

    @Override
    @Transactional
    public void selectWorkspace(CurrentUser actor, String workspaceId) {
        iamService.selectWorkspace(actor, workspaceId);
    }

    @Override
    @Transactional
    public void clearWorkspace(String workspaceId, String userId) {
        iamService.clearWorkspace(workspaceId, userId);
    }

    private String reauthenticateHash(CurrentUser actor, String raw) {
        var password = iamService.password(actor);
        boolean matches = matches(raw, password.hash());
        if (!iamService.reauthenticate(actor, password.hash(), matches))
            throw AuthErrorCode.AUTH_INVALID_CREDENTIALS.raise();
        return password.hash();
    }

    private boolean matches(String raw, String hash) {
        if (raw.getBytes(StandardCharsets.UTF_8).length > 72) {
            passwordEncoder.matches("invalid oversized password", dummyHash);
            return false;
        }
        return passwordEncoder.matches(raw, hash);
    }

    private static void validatePassword(String raw) {
        int count = raw.codePointCount(0, raw.length());
        if (count < 15 || count > 64 || raw.getBytes(StandardCharsets.UTF_8).length > 72)
            throw AuthErrorCode.AUTH_PASSWORD_INVALID.raise();
    }

    private static String normalize(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }
}
