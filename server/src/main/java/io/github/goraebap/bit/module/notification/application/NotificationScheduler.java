package io.github.goraebap.bit.module.notification.application;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Every minute, reminds attendees of events about to start and mails what is new; on the hour through the day, tells
 * people of their tasks due today (once each). app.jobs.enabled=false turns it off.
 */
@Component
@ConditionalOnProperty(name = "app.jobs.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
class NotificationScheduler {
    private final NotificationService notificationService;

    @Scheduled(cron = "30 * * * * *")
    void everyMinute() {
        notificationService.remind();
        notificationService.mailPending();
    }

    @Scheduled(cron = "0 0 9-21 * * *", zone = "Asia/Seoul")
    void dueDays() {
        notificationService.dueToday();
    }
}
