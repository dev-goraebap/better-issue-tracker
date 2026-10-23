package io.github.goraebap.bit.module.project.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProjectRulesTest {
    private final UUID actor = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-10-22T00:00:00Z");

    @Test
    void normalizesKeysAndRejectsAmbiguousOrOutOfRangeValues() {
        assertThat(ProjectKey.of(" bit42 ").value()).isEqualTo("BIT42");
        for (String invalid : new String[] {"A", "A-1", "한글", "ABCDEFGHIJK", ""}) {
            assertThatThrownBy(() -> ProjectKey.of(invalid)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void invalidRevisionCannotPartiallyChangeProjectAndRestorePreservesArchiveAndCounter() {
        var p = Project.create(UUID.randomUUID(), "Original", "body", 0, actor, "codex", now);
        assertThatThrownBy(() -> p.revise("New", "x".repeat(20001), actor, null, now))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(p.name()).isEqualTo("Original");
        assertThat(p.version()).isZero();
        assertThat(p.allocateWorkItemNumber()).isEqualTo(1);
        p.archive(true, actor, "codex", now);
        p.delete(actor, "codex", now.plusSeconds(1));
        p.restore(actor, "codex", now.plusSeconds(2));
        assertThat(p.audit().deletedAt()).isNull();
        assertThat(p.audit().createdByAgent()).isEqualTo("codex");
        assertThat(p.archivedAt()).isEqualTo(now);
        assertThat(p.allocateWorkItemNumber()).isEqualTo(2);
    }

    @Test
    void columnConfigurationValidatesEverythingBeforeChangingState() {
        var c = BoardColumn.create(UUID.randomUUID(), "Todo", null, 0, false, actor, null, now);
        assertThatThrownBy(() -> c.configure("New", "red", true, actor, null, now))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(c.name()).isEqualTo("Todo");
        assertThat(c.finalColumn()).isFalse();
        assertThat(c.version()).isZero();
    }
}
