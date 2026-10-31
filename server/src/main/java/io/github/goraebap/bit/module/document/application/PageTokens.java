package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.PagePath;
import io.github.goraebap.bit.shared.web.SecretTokens;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Version-wide view tokens, "{exp}.{sig}" (exp in epoch seconds): every relative address inside the bundle resolves
 * under the same token. The token is the permission for one version until it expires; it is not bound to a viewer,
 * since a sandboxed frame's requests carry no session.
 */
@Component
@RequiredArgsConstructor
class PageTokens {
    static final String PREFIX = "/pages/";
    static final Duration TTL = Duration.ofHours(1);
    /** exp is rounded up to the next STEP, so views of a version within STEP share one URL and the browser cache. */
    static final Duration STEP = Duration.ofMinutes(10);

    private static final String PURPOSE = "page-view";

    private final SecretTokens secretTokens;
    private final Clock clock;

    enum Check {
        VALID,
        EXPIRED,
        FORGED
    }

    /** The address a viewer opens: each path segment of the entry percent-encoded. */
    PageViews.ViewLink link(String versionId, PagePath entry) {
        long step = STEP.toSeconds();
        long exp = Math.ceilDiv(clock.instant().plus(TTL).getEpochSecond(), step) * step;
        String token = exp + "." + secretTokens.hash(PURPOSE, versionId + "\n" + exp);
        String path = Arrays.stream(entry.value().split("/"))
                .map(segment ->
                        URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20"))
                .collect(Collectors.joining("/"));
        return new PageViews.ViewLink(PREFIX + versionId + "/" + token + "/" + path, Instant.ofEpochSecond(exp));
    }

    /** FORGED for anything this server did not make for this version: bad shape, wrong signature, another version. */
    Check check(String versionId, String token) {
        int dot = token.indexOf('.');
        if (dot <= 0) return Check.FORGED;
        long exp;
        try {
            exp = Long.parseLong(token.substring(0, dot));
        } catch (NumberFormatException e) {
            return Check.FORGED;
        }
        if (!SecretTokens.equal(token.substring(dot + 1), secretTokens.hash(PURPOSE, versionId + "\n" + exp)))
            return Check.FORGED;
        return clock.instant().getEpochSecond() > exp ? Check.EXPIRED : Check.VALID;
    }
}
