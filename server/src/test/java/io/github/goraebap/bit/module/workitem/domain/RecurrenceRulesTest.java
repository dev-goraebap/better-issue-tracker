package io.github.goraebap.bit.module.workitem.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RecurrenceRulesTest {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Test
    void weeklyRulesFallOnTheirWeekdaysEveryIntervalFromTheirFirstDay() {
        // 2026-10-28 is a Wednesday; every other week on Monday and Wednesday.
        var pattern = new Recurrence.Pattern(
                Recurrence.Frequency.weekly,
                2,
                Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY),
                LocalDate.of(2026, 10, 28),
                null);
        assertThat(pattern.between(LocalDate.of(2026, 10, 28), LocalDate.of(2026, 11, 25)))
                .containsExactly(
                        LocalDate.of(2026, 11, 9),
                        LocalDate.of(2026, 11, 11),
                        LocalDate.of(2026, 11, 23),
                        LocalDate.of(2026, 11, 25));
        // Without weekdays a weekly rule keeps its first day's.
        var plain = new Recurrence.Pattern(
                Recurrence.Frequency.weekly, 1, Set.of(), LocalDate.of(2026, 10, 28), LocalDate.of(2026, 11, 11));
        assertThat(plain.weekdays()).containsExactly(DayOfWeek.WEDNESDAY);
        assertThat(plain.between(LocalDate.of(2026, 10, 27), LocalDate.of(2027, 1, 1)))
                .containsExactly(LocalDate.of(2026, 10, 28), LocalDate.of(2026, 11, 4), LocalDate.of(2026, 11, 11));
        assertThat(plain.nextAfter(LocalDate.of(2026, 11, 11))).isNull();
    }

    @Test
    void monthlyRulesKeepTheirDateAndFallOnTheLastDayOfShorterMonths() {
        var pattern =
                new Recurrence.Pattern(Recurrence.Frequency.monthly, 1, Set.of(), LocalDate.of(2026, 1, 31), null);
        assertThat(pattern.between(LocalDate.of(2026, 1, 31), LocalDate.of(2026, 4, 30)))
                .containsExactly(LocalDate.of(2026, 2, 28), LocalDate.of(2026, 3, 31), LocalDate.of(2026, 4, 30));
        var daily = new Recurrence.Pattern(Recurrence.Frequency.daily, 3, Set.of(), LocalDate.of(2026, 1, 1), null);
        assertThat(daily.nextAfter(LocalDate.of(2026, 1, 2))).isEqualTo(LocalDate.of(2026, 1, 4));
        assertThatThrownBy(() ->
                        new Recurrence.Pattern(Recurrence.Frequency.daily, 0, Set.of(), LocalDate.of(2026, 1, 1), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Recurrence.Pattern(
                        Recurrence.Frequency.daily, 1, Set.of(), LocalDate.of(2026, 1, 2), LocalDate.of(2026, 1, 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aTemplateKeepsTheLocalTimeAcrossADaylightSavingChange() {
        var newYork = ZoneId.of("America/New_York");
        // 2026-10-26 10:00 in New York is before the clocks go back on 2026-11-01.
        Instant start = ZonedDateTime.of(LocalDate.of(2026, 10, 26), LocalTime.of(10, 0), newYork)
                .toInstant();
        var event = WorkItem.create(
                "project",
                1,
                WorkItem.Kind.event,
                new WorkItem.Details(
                        "Standup", null, null, null, Set.of(), null, null, start, start.plusSeconds(900), false),
                Set.of(),
                null,
                false,
                0,
                "user",
                null,
                start);
        var template = Recurrence.Template.of(event, LocalDate.of(2026, 10, 26), newYork);
        var later = template.on(LocalDate.of(2026, 11, 2), newYork);
        assertThat(later.startsAt().atZone(newYork).toLocalTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(later.endsAt()).isEqualTo(later.startsAt().plusSeconds(900));
        assertThat(later.startDate()).isNull();
    }

    @Test
    void aTaskTemplateMovesItsDatesToEachDayKeepingTheirSpan() {
        var task = WorkItem.create(
                "project",
                1,
                WorkItem.Kind.task,
                new WorkItem.Details(
                        "Report",
                        null,
                        null,
                        null,
                        (String) null,
                        LocalDate.of(2026, 10, 26),
                        LocalDate.of(2026, 10, 28)),
                Set.of("label"),
                "column",
                false,
                0,
                "user",
                null,
                Instant.EPOCH);
        var template = Recurrence.Template.of(task, LocalDate.of(2026, 10, 26), SEOUL);
        assertThat(template.dateParts()).isEqualTo(Recurrence.DateParts.both);
        assertThat(template.columnId()).isEqualTo("column");
        var next = template.on(LocalDate.of(2026, 11, 2), SEOUL);
        assertThat(next.startDate()).isEqualTo(LocalDate.of(2026, 11, 2));
        assertThat(next.dueDate()).isEqualTo(LocalDate.of(2026, 11, 4));
        assertThat(next.startsAt()).isNull();
    }
}
