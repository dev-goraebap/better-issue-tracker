package io.github.goraebap.bit.module.iam.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.SecretTokens;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CredentialSecurityTest {
    @Test
    void attemptLimitExpiresAtTheMinuteBoundary() {
        var clock = org.mockito.Mockito.mock(Clock.class);
        var now = java.time.Instant.parse("2026-10-22T00:00:00Z");
        org.mockito.Mockito.when(clock.instant()).thenReturn(now);
        var limiter = new AttemptLimiter(clock, 2);
        limiter.check("local");
        limiter.check("local");
        assertThatThrownBy(() -> limiter.check("local"))
                .isInstanceOf(io.github.goraebap.bit.shared.error.BusinessException.class);
        org.mockito.Mockito.when(clock.instant()).thenReturn(now.plusSeconds(60));
        limiter.check("local");
    }

    @Test
    void productionCookiesAreSecureAndDeletionUsesTheSameScope() {
        var cookies = new AuthCookies(true, Clock.systemUTC());
        var response = new MockHttpServletResponse();
        cookies.set(response, "bit_session", "test-token", Duration.ofDays(7));
        assertThat(response.getHeader("Set-Cookie"))
                .contains("Secure", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=604800");
        var deleted = new MockHttpServletResponse();
        cookies.clearSession(deleted);
        assertThat(deleted.getHeader("Set-Cookie"))
                .contains("Secure", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0");
    }

    @Test
    void csrfCannotBeReusedAcrossSessionsOrForged() {
        var codec = new SecretTokens("test-only-secret-at-least-32-characters");
        var tokens = new SignedCsrfTokens(codec, new AuthCookies(false, Clock.systemUTC()));
        var first = new MockHttpServletRequest();
        first.setAttribute(
                SignedCsrfTokens.PRINCIPAL,
                new CurrentUser(Ids.newId(), false, CurrentUser.Method.SESSION, Ids.newId(), null, false));
        String raw = tokens.generateToken(first).getToken();
        first.setCookies(new Cookie("bit_csrf", raw));
        assertThat(tokens.loadToken(first)).isNotNull();
        var other = new MockHttpServletRequest();
        other.setCookies(new Cookie("bit_csrf", raw));
        assertThat(tokens.loadToken(other)).isNull();
        first.setCookies(new Cookie("bit_csrf", raw.substring(0, 44) + codec.random()));
        assertThat(tokens.loadToken(first)).isNull();
        first.setCookies(new Cookie("bit_csrf", raw), new Cookie("bit_csrf", raw));
        assertThat(tokens.loadToken(first)).isNull();
    }

    @Test
    void tokenPurposesAreSeparatedAndShortSecretsFailAtStartup() {
        var codec = new SecretTokens("test-only-secret-at-least-32-characters");
        String raw = codec.random();
        assertThat(codec.hash("session", raw)).isNotEqualTo(codec.hash("api-key", raw));
        assertThatThrownBy(() -> new SecretTokens("short")).isInstanceOf(IllegalStateException.class);
        assertThat(new IamRequests.Login("test@example.test", "test-sensitive-value").toString())
                .doesNotContain("test-sensitive-value");
    }
}
