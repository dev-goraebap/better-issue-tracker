package io.github.goraebap.bit.module.workitem.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Makes repeating work items' occurrences every hour (D-092), so a task's next one comes on its day in any time zone.
 * One rule that fails, say its member has left, does not stop the others. app.jobs.enabled=false turns it off.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.jobs.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
class RecurrenceScheduler {
    private final RecurrenceService recurrenceService;

    @Scheduled(cron = "0 7 * * * *")
    void materialize() {
        for (String id : recurrenceService.runningIds()) {
            try {
                recurrenceService.materialize(id);
            } catch (RuntimeException failure) {
                log.warn("Recurrence {} made no occurrence: {}", id, failure.getMessage());
            }
        }
    }
}
