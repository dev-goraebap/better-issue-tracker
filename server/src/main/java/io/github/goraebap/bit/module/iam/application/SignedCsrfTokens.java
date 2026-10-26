package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.SecretTokens;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.DefaultCsrfToken;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
final class SignedCsrfTokens implements CsrfTokenRepository {
    static final String PRINCIPAL = CurrentUser.class.getName();
    static final String HEADER = "X-CSRF-Token";
    private final SecretTokens tokenCodec;
    private final AuthCookies authCookies;

    @Override
    public CsrfToken generateToken(HttpServletRequest request) {
        String nonce = tokenCodec.random();
        return new DefaultCsrfToken(
                HEADER, "_csrf", nonce + "." + tokenCodec.hash("csrf", binding(request) + "|" + nonce));
    }

    @Override
    public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) {
        authCookies.set(
                response,
                "bit_csrf",
                token == null ? "" : token.getToken(),
                token == null ? Duration.ZERO : Duration.ofDays(30));
    }

    @Override
    public CsrfToken loadToken(HttpServletRequest request) {
        String raw = AuthCookies.read(request, "bit_csrf");
        if (raw == null || !raw.matches("[A-Za-z0-9_-]{43}\\.[A-Za-z0-9_-]{43}")) return null;
        String nonce = raw.substring(0, 43);
        if (!SecretTokens.equal(raw.substring(44), tokenCodec.hash("csrf", binding(request) + "|" + nonce)))
            return null;
        return new DefaultCsrfToken(HEADER, "_csrf", raw);
    }

    void rotate(HttpServletRequest request, HttpServletResponse response, CurrentUser principal) {
        request.setAttribute(PRINCIPAL, principal);
        saveToken(generateToken(request), request, response);
    }

    private static String binding(HttpServletRequest request) {
        Object value = request.getAttribute(PRINCIPAL);
        return value instanceof CurrentUser user ? user.credentialId() : "anonymous";
    }
}
