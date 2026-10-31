package io.github.goraebap.bit.module.document.application;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.goraebap.bit.module.document.domain.PagePath;
import io.github.goraebap.bit.shared.web.SecretTokens;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class PageTokensTest {
    private static final SecretTokens SECRET = new SecretTokens("page-token-test-secret-at-least-32-characters");
    private static final Instant NOW = Instant.parse("2026-10-31T03:04:05Z");

    @Test
    void aLinkWorksForItsVersionUntilItExpires() {
        var tokens = at(NOW);
        var link = tokens.link("Pv00000001", PagePath.parse("시안/index.html"));
        assertThat(link.url()).startsWith("/pages/Pv00000001/").endsWith("/%EC%8B%9C%EC%95%88/index.html");
        assertThat(link.expiresAt()).isAfterOrEqualTo(NOW.plus(PageTokens.TTL));
        assertThat(link.expiresAt()).isBefore(NOW.plus(PageTokens.TTL).plus(PageTokens.STEP));
        String token = link.url().split("/")[3];

        assertThat(tokens.check("Pv00000001", token)).isEqualTo(PageTokens.Check.VALID);
        assertThat(at(link.expiresAt()).check("Pv00000001", token)).isEqualTo(PageTokens.Check.VALID);
        assertThat(at(link.expiresAt().plusSeconds(1)).check("Pv00000001", token))
                .isEqualTo(PageTokens.Check.EXPIRED);
        assertThat(tokens.check("Pv00000002", token)).isEqualTo(PageTokens.Check.FORGED);
        String exp = token.substring(0, token.indexOf('.'));
        assertThat(tokens.check("Pv00000001", (Long.parseLong(exp) + 600) + token.substring(token.indexOf('.'))))
                .isEqualTo(PageTokens.Check.FORGED);
        assertThat(tokens.check("Pv00000001", token + "x")).isEqualTo(PageTokens.Check.FORGED);
        assertThat(tokens.check("Pv00000001", "nonsense")).isEqualTo(PageTokens.Check.FORGED);
        assertThat(tokens.check("Pv00000001", "abc.def")).isEqualTo(PageTokens.Check.FORGED);
        var other = new PageTokens(
                new SecretTokens("another-secret-for-page-tokens-at-least-32"), Clock.fixed(NOW, ZoneOffset.UTC));
        assertThat(other.check("Pv00000001", token)).isEqualTo(PageTokens.Check.FORGED);
    }

    @Test
    void viewsWithinOneStepShareTheirUrl() {
        var first = at(NOW).link("Pv00000001", PagePath.parse("index.html"));
        var later = at(NOW.plusSeconds(60)).link("Pv00000001", PagePath.parse("index.html"));
        assertThat(later.url()).isEqualTo(first.url());
    }

    private static PageTokens at(Instant now) {
        return new PageTokens(SECRET, Clock.fixed(now, ZoneOffset.UTC));
    }
}
