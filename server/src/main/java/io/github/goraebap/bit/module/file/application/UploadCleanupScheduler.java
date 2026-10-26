package io.github.goraebap.bit.module.file.application;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Removes abandoned uploads and deletes discarded bytes again every night. app.jobs.enabled=false turns it off, as in
 * tests.
 */
@Component
@ConditionalOnProperty(name = "app.jobs.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
class UploadCleanupScheduler {
    private final FileService fileService;

    @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Seoul")
    void cleanUp() {
        fileService.cleanUp();
    }
}
