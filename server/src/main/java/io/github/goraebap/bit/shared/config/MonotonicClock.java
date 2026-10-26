package io.github.goraebap.bit.shared.config;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * The system's UTC time in microseconds, as rows store it, never giving the same moment twice and never going back
 * (BIT-44). Windows reads the system time a millisecond or more at a time, so a comment and the move right after it
 * shared a moment and the timeline, which orders by time and then by random id, could show them the other way round.
 * One server process writes the database, so a moment unique within the process is unique for every record.
 */
final class MonotonicClock extends Clock {
    private final Clock system;
    private final AtomicLong last = new AtomicLong(Long.MIN_VALUE);

    MonotonicClock(Clock system) {
        this.system = system;
    }

    @Override
    public Instant instant() {
        long now = ChronoUnit.MICROS.between(Instant.EPOCH, system.instant());
        long micros = last.accumulateAndGet(now, (previous, current) -> Math.max(previous + 1, current));
        return Instant.EPOCH.plus(micros, ChronoUnit.MICROS);
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        if (ZoneOffset.UTC.equals(zone)) return this;
        throw new UnsupportedOperationException("The server keeps time in UTC");
    }
}
