package io.github.goraebap.bit.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;

class MonotonicClockTest {
    @Test
    void aStoppedOrBackwardSystemClockStillGivesLaterMicroseconds() {
        var system = new SettableClock(Instant.parse("2026-10-26T00:00:00.000123456Z"));
        var clock = new MonotonicClock(system);
        var first = clock.instant();
        assertThat(first).isEqualTo(Instant.parse("2026-10-26T00:00:00.000123Z"));
        assertThat(clock.instant()).isEqualTo(first.plus(1, ChronoUnit.MICROS));
        system.at = system.at.minusSeconds(5);
        assertThat(clock.instant()).isEqualTo(first.plus(2, ChronoUnit.MICROS));
        system.at = Instant.parse("2026-10-26T00:00:01Z");
        assertThat(clock.instant()).isEqualTo(Instant.parse("2026-10-26T00:00:01Z"));
    }

    @Test
    void itKeepsTimeInUtc() {
        var clock = new MonotonicClock(Clock.systemUTC());
        var at = clock.instant();
        assertThat(clock.instant()).isAfter(at);
        assertThat(clock.getZone()).isEqualTo(ZoneOffset.UTC);
        assertThat(clock.withZone(ZoneOffset.UTC)).isSameAs(clock);
    }

    private static final class SettableClock extends Clock {
        private Instant at;

        private SettableClock(Instant at) {
            this.at = at;
        }

        @Override
        public Instant instant() {
            return at;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }
}
