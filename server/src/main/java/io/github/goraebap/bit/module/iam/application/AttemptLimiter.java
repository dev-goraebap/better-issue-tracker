package io.github.goraebap.bit.module.iam.application;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
final class AttemptLimiter {
    private record Bucket(Instant start, int count) {}

    private final Map<String, Bucket> buckets = new HashMap<>();
    private final Clock clock;
    private final int limit;

    AttemptLimiter(Clock clock, @Value("${app.auth.attempts-per-minute:10}") int limit) {
        if (limit < 1) throw new IllegalStateException("Attempt limit must be positive");
        this.clock = clock;
        this.limit = limit;
    }

    synchronized void check(String address) {
        Instant now = clock.instant();
        buckets.entrySet()
                .removeIf(entry -> !entry.getValue().start().plusSeconds(60).isAfter(now));
        Bucket old = buckets.get(address);
        if ((old == null && buckets.size() >= 10000) || (old != null && old.count() >= limit))
            throw AuthErrorCode.AUTH_RATE_LIMITED.raise();
        buckets.put(address, new Bucket(old == null ? now : old.start(), old == null ? 1 : old.count() + 1));
    }
}
