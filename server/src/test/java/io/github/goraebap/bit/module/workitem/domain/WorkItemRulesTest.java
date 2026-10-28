package io.github.goraebap.bit.module.workitem.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.goraebap.bit.shared.domain.Ids;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;

class WorkItemRulesTest {
    private final String actor = Ids.newId();
    private final String project = Ids.newId();
    private final Instant now = Instant.parse("2026-10-22T00:00:00Z");

    private WorkItem item() {
        return WorkItem.create(
                project,
                1,
                WorkItem.Kind.task,
                "typeTaskId",
                new WorkItem.Details("Task", null, null, null, (String) null, null, null),
                Set.of(),
                null,
                false,
                0,
                actor,
                "codex",
                now);
    }

    @Test
    void completionIsStableAcrossRetriesAndReopeningClearsIt() {
        var task = item();
        String done = Ids.newId();
        task.move(done, true, 0, actor, "codex", now);
        long version = task.version();
        task.move(done, true, 0, actor, "codex", now.plusSeconds(30));
        assertThat(task.closedAt()).isEqualTo(now);
        assertThat(task.version()).isEqualTo(version);
        task.move(null, false, 0, actor, "codex", now.plusSeconds(60));
        assertThat(task.closedAt()).isNull();
        assertThat(task.columnId()).isNull();
    }

    @Test
    void failedRevisionAndInvalidMoveLeaveTheAggregateUntouched() {
        var task = item();
        var reversed = new WorkItem.Details(
                "New", null, null, null, actor, LocalDate.of(2026, 10, 23), LocalDate.of(2026, 10, 22));
        assertThatThrownBy(() -> task.revise(reversed, actor, null, now)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> task.move(null, true, 1, actor, null, now))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(task.details().title()).isEqualTo("Task");
        assertThat(task.version()).isZero();
        assertThat(task.closedAt()).isNull();
    }

    @Test
    void restoringWithMissingColumnReturnsToBacklogWithoutClearingIndividualArchive() {
        var task = item();
        task.move(Ids.newId(), true, 1, actor, null, now);
        task.archive(true, actor, "codex", now);
        task.delete(actor, "codex", now.plusSeconds(1));
        task.restore(false, actor, "codex", now.plusSeconds(2));
        assertThat(task.columnId()).isNull();
        assertThat(task.closedAt()).isNull();
        assertThat(task.archivedAt()).isEqualTo(now);
        assertThat(task.audit().deletedAt()).isNull();
        assertThat(task.number()).isEqualTo(1);
        assertThat(task.audit().createdByAgent()).isEqualTo("codex");
    }
}
