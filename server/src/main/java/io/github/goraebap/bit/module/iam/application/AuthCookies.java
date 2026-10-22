package io.github.goraebap.bit.module.iam.application;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
final class AuthCookies {
    private final boolean secure;
    private final Clock clock;

    AuthCookies(@Value("${app.auth.cookie-secure:true}") boolean secure, Clock clock) {
        this.secure = secure;
        this.clock = clock;
    }

    static String read(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        String found = null;
        for (Cookie cookie : request.getCookies()) {
            if (!name.equals(cookie.getName())) continue;
            if (found != null) return null; // Ambiguous cookie paths must not pick an attacker's value.
            found = cookie.getValue();
        }
        return found;
    }

    void session(HttpServletResponse response, AuthService.IssuedSession session) {
        set(response, "bit_session", session.token(), Duration.between(clock.instant(), session.expiresAt()));
    }

    void clearSession(HttpServletResponse response) {
        set(response, "bit_session", "", Duration.ZERO);
    }

    void set(HttpServletResponse response, String name, String value, Duration age) {
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                ResponseCookie.from(name, value)
                        .httpOnly(true)
                        .secure(secure)
                        .sameSite("Lax")
                        .path("/")
                        .maxAge(age.isNegative() ? Duration.ZERO : age)
                        .build()
                        .toString());
    }
}
