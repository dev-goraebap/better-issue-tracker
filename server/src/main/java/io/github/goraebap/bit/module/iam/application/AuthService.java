package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.iam.domain.AgentKey;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService implements IamFacade {
    private final IamService iamService;
    private final TokenCodec tokenCodec;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final String dummyHash;

    AuthService(IamService iamService, TokenCodec tokenCodec, PasswordEncoder passwordEncoder, Clock clock) {
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
        String expectedHash = reauthenticate(actor, request.currentPassword());
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
        String expectedHash = reauthenticate(actor, request.currentPassword());
        String raw = "bit_" + tokenCodec.random();
        Instant now = clock.instant();
        Instant expires = days == 0 ? null : now.plusSeconds(days * 86400L);
        var key = new AgentKey(
                UUID.randomUUID(),
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
            CurrentUser actor, UUID target, IamRequests.Reauthenticate request) {
        if (!actor.instanceAdmin() || actor.method() != CurrentUser.Method.SESSION)
            throw AuthErrorCode.AUTH_FORBIDDEN.raise();
        String expectedHash = reauthenticate(actor, request.currentPassword());
        String raw = tokenCodec.random();
        iamService.temporaryPassword(actor, target, expectedHash, passwordEncoder.encode(raw));
        return new IamViews.TemporaryPassword(raw);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public IamViews.Keys keys(CurrentUser actor, String cursor, int size) {
        if (size < 1 || size > 100) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        Instant beforeTime = null;
        UUID beforeId = null;
        if (cursor != null) {
            try {
                String[] values =
                        new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", -1);
                if (values.length != 4
                        || !values[0].equals("CREATED_DESC")
                        || !values[1].equals(actor.userId().toString())) throw new IllegalArgumentException("cursor");
                beforeTime = Instant.parse(values[2]);
                beforeId = UUID.fromString(values[3]);
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

    private String reauthenticate(CurrentUser actor, String raw) {
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
