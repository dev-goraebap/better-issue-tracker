package io.github.goraebap.bit.module.notification.application;

import io.github.goraebap.bit.module.iam.IamFacade;
import io.github.goraebap.bit.module.link.CommentChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.notification.domain.Notification;
import io.github.goraebap.bit.module.notification.domain.NotificationRepository;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.mail.Mail;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Notices (D-092, BIT-39): a member hears when they are put on a work item (a task's assignee, an event's attendee),
 * when someone comments on one they are on or made, when an event they attend moves, on a task's due day and before an
 * event they attend starts. Nobody hears of their own change. Notices are made in the change's own transaction, read in
 * the inbox, and mailed afterwards when mail is set up (D-030); without it they stay in the inbox only.
 */
@Slf4j
@Service
public class NotificationService {
    /** The days and times notices speak of (a due day, an event's start), as the nightly jobs keep them. */
    static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    /** How far ahead an event's reminder may be asked for, so how far ahead the reminder job looks. */
    private static final Duration REMINDER_REACH = Duration.ofDays(7);
    /** Notices older than this when mail comes on are not mailed late. */
    private static final Duration MAIL_REACH = Duration.ofHours(1);

    private static final Set<String> TIME_FIELDS = Set.of("startsAt", "endsAt", "allDay", "startDate", "dueDate");
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("M월 d일 HH:mm");

    private final NotificationRepository notificationRepository;
    private final WorkItemFacade workItemFacade;
    private final WorkspaceFacade workspaceFacade;
    private final IamFacade iamFacade;
    private final Mail mail;
    private final Clock clock;
    private final String publicUrl;

    NotificationService(
            NotificationRepository notificationRepository,
            WorkItemFacade workItemFacade,
            WorkspaceFacade workspaceFacade,
            IamFacade iamFacade,
            Mail mail,
            Clock clock,
            @Value("${app.auth.allowed-origins}") String origins) {
        this.notificationRepository = notificationRepository;
        this.workItemFacade = workItemFacade;
        this.workspaceFacade = workspaceFacade;
        this.iamFacade = iamFacade;
        this.mail = mail;
        this.clock = clock;
        this.publicUrl = Arrays.stream(origins.split(","))
                .map(String::strip)
                .filter(origin -> !origin.isEmpty())
                .findFirst()
                .orElse("")
                .replaceAll("/+$", "");
    }

    @Transactional(readOnly = true)
    public NotificationViews.Notices list(
            CurrentUser actor, String workspaceId, boolean unreadOnly, String cursor, int size) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        int limit = Math.clamp(size, 1, 100);
        var rows = notificationRepository.findPage(actor.userId(), workspaceId, unreadOnly, decode(cursor), limit + 1);
        var page = rows.stream().limit(limit).toList();
        String next = rows.size() > limit ? encode(page.getLast()) : null;
        return new NotificationViews.Notices(
                page.stream().map(NotificationViews.Notice::of).toList(), next);
    }

    @Transactional(readOnly = true)
    public long unread(CurrentUser actor, String workspaceId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        return notificationRepository.countUnread(actor.userId(), workspaceId);
    }

    @Transactional
    public void read(CurrentUser actor, String workspaceId, String id) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        notificationRepository
                .findById(actor.userId(), id)
                .filter(notice -> notice.workspaceId().equals(workspaceId))
                .orElseThrow(NotificationErrorCode.NOTIFICATION_NOT_FOUND::raise);
        notificationRepository.markRead(actor.userId(), workspaceId, id, clock.instant());
    }

    @Transactional
    public void readAll(CurrentUser actor, String workspaceId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        notificationRepository.markAllRead(actor.userId(), workspaceId, clock.instant());
    }

    /**
     * People put on a work item, or an event that moved. An occurrence a rule made (its people were the rule's) says
     * nothing; one change carried to a rule's occurrences is said once per person.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void workItemChanged(TargetChangedEvent event) {
        if (event.targetType() != TargetType.work_item) return;
        if (!Set.of("created", "changed").contains(event.action())) return;
        var item = workItemFacade.notice(event.targetId()).orElse(null);
        if (item == null) return;
        boolean isEvent = "event".equals(item.kind());
        var who = who(event.actorId(), event.actorAgent());
        var notices = new ArrayList<Notification>();
        Set<String> added = Set.of();
        if (event.action().equals("created")) {
            if (item.recurrenceId() == null) added = item.peopleIds();
        } else {
            var people = event.changes().stream()
                    .filter(change -> change.field().equals("people"))
                    .findFirst();
            if (people.isPresent()) {
                var before = ids(people.get().before());
                added = ids(people.get().after()).stream()
                        .filter(id -> !before.contains(id))
                        .collect(Collectors.toSet());
            }
        }
        String minute = event.occurredAt().truncatedTo(ChronoUnit.MINUTES).toString();
        for (String person : added) {
            if (person.equals(event.actorId())) continue;
            notices.add(notice(
                    item,
                    person,
                    isEvent ? Notification.Type.invited : Notification.Type.assigned,
                    event,
                    who + (isEvent ? "님이 일정에 초대했습니다" : "님이 담당자로 지정했습니다"),
                    item.recurrenceId() == null ? null : "people:" + item.recurrenceId() + ":" + minute));
        }
        boolean moved = isEvent
                && event.action().equals("changed")
                && event.changes().stream().anyMatch(change -> TIME_FIELDS.contains(change.field()));
        if (moved) {
            String when = item.startsAt() == null
                    ? ""
                    : ": " + WHEN.format(item.startsAt().atZone(ZONE));
            for (String person : item.peopleIds()) {
                if (person.equals(event.actorId()) || added.contains(person)) continue;
                notices.add(notice(
                        item,
                        person,
                        Notification.Type.rescheduled,
                        event,
                        who + "님이 일정 시각을 바꿨습니다" + when,
                        item.recurrenceId() == null ? null : "moved:" + item.recurrenceId() + ":" + minute));
            }
        }
        notificationRepository.saveAll(notices);
    }

    /** A comment on a work item, to the people on it and whoever made it. */
    @Transactional(propagation = Propagation.MANDATORY)
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void commented(CommentChangedEvent event) {
        if (event.targetType() != TargetType.work_item || !event.action().equals("comment_created")) return;
        var item = workItemFacade.notice(event.targetId()).orElse(null);
        if (item == null) return;
        var recipients = new LinkedHashSet<>(item.peopleIds());
        if (item.createdBy() != null) recipients.add(item.createdBy());
        recipients.remove(event.actorId());
        String body = who(event.actorId(), event.actorAgent()) + "님이 댓글을 남겼습니다";
        notificationRepository.saveAll(recipients.stream()
                .map(person -> Notification.create(
                        item.workspaceId(),
                        item.projectId(),
                        person,
                        Notification.Type.commented,
                        item.id(),
                        event.actorId(),
                        event.actorAgent(),
                        title(item),
                        body,
                        null,
                        event.occurredAt()))
                .toList());
    }

    /** Reminds an event's attendees once its reminder comes, once per start (a moved event reminds again). */
    @Transactional
    public void remind() {
        Instant now = clock.instant();
        var notices = new ArrayList<Notification>();
        for (var item : workItemFacade.remindable(now, now.plus(REMINDER_REACH))) {
            if (item.startsAt()
                    .minus(Duration.ofMinutes(item.reminderMinutes()))
                    .isAfter(now)) continue;
            long left = Math.max(0, Duration.between(now, item.startsAt()).toMinutes());
            String body =
                    WHEN.format(item.startsAt().atZone(ZONE)) + "에 시작합니다" + (left > 0 ? " (" + after(left) + ")" : "");
            for (String person : item.peopleIds())
                notices.add(Notification.create(
                        item.workspaceId(),
                        item.projectId(),
                        person,
                        Notification.Type.event_reminder,
                        item.id(),
                        null,
                        null,
                        title(item),
                        body,
                        "reminder:" + item.id() + ":" + item.startsAt().getEpochSecond(),
                        now));
        }
        notificationRepository.saveAll(notices);
    }

    /** Tells a task's people on its due day, once. */
    @Transactional
    public void dueToday() {
        Instant now = clock.instant();
        LocalDate today = now.atZone(ZONE).toLocalDate();
        var notices = new ArrayList<Notification>();
        for (var item : workItemFacade.dueOn(today))
            for (String person : item.peopleIds())
                notices.add(Notification.create(
                        item.workspaceId(),
                        item.projectId(),
                        person,
                        Notification.Type.due_today,
                        item.id(),
                        null,
                        null,
                        title(item),
                        "오늘이 기한입니다",
                        "due:" + item.id() + ":" + today,
                        now));
        notificationRepository.saveAll(notices);
    }

    /**
     * Mails the notices of the last hour not yet mailed, when mail is on (outside any transaction, D-028); a mail the
     * server refuses is logged and not tried again, so one bad address does not hold the rest.
     */
    public void mailPending() {
        if (!mail.available()) return;
        Instant now = clock.instant();
        for (var notice : notificationRepository.findUnmailed(now.minus(MAIL_REACH), 100)) {
            var recipient = iamFacade.user(notice.recipientId()).orElse(null);
            try {
                if (recipient != null)
                    mail.send(
                            recipient.email(),
                            "[BIT] " + notice.title(),
                            notice.body() + "\n\n" + notice.title() + "\n" + link(notice) + "\n");
            } catch (RuntimeException refused) {
                log.warn("Notice {} was not mailed: {}", notice.id(), refused.getMessage());
            }
            notificationRepository.markMailed(notice.id(), clock.instant());
        }
    }

    private Notification notice(
            WorkItemFacade.Notice item,
            String person,
            Notification.Type type,
            TargetChangedEvent event,
            String body,
            String dedupeKey) {
        return Notification.create(
                item.workspaceId(),
                item.projectId(),
                person,
                type,
                item.id(),
                event.actorId(),
                event.actorAgent(),
                title(item),
                body,
                dedupeKey == null ? null : dedupeKey + ":" + type,
                event.occurredAt());
    }

    private String link(Notification notice) {
        return publicUrl + "/workspaces/" + notice.workspaceId() + "/projects/" + notice.projectId() + "/work-items/"
                + notice.targetId();
    }

    /** Who made a change: their name, with the agent that acted for them (D-021). */
    private String who(String actorId, String agent) {
        String name = actorId == null
                ? "누군가"
                : iamFacade.user(actorId).map(IamFacade.User::name).orElse("누군가");
        return agent == null || agent.isBlank() ? name : name + "(" + agent + ")";
    }

    private static String title(WorkItemFacade.Notice item) {
        return item.reference() + " " + item.title();
    }

    /** 10분 뒤, 2시간 뒤, 1시간 30분 뒤, 1일 뒤. */
    static String after(long minutes) {
        if (minutes < 60) return minutes + "분 뒤";
        if (minutes % 1440 == 0) return minutes / 1440 + "일 뒤";
        return minutes / 60 + "시간" + (minutes % 60 == 0 ? "" : " " + minutes % 60 + "분") + " 뒤";
    }

    private static Set<String> ids(String joined) {
        if (joined == null || joined.isBlank()) return Set.of();
        return Arrays.stream(joined.split(","))
                .map(String::strip)
                .filter(id -> !id.isEmpty())
                .collect(Collectors.toSet());
    }

    private static String encode(Notification last) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((last.createdAt() + "|" + last.id()).getBytes(StandardCharsets.UTF_8));
    }

    private static NotificationRepository.Point decode(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", 2);
            return new NotificationRepository.Point(Instant.parse(parts[0]), Objects.requireNonNull(parts[1]));
        } catch (RuntimeException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }
}
