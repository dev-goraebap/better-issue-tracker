package io.github.goraebap.bit.module.notification.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** A member's own notices in a workspace (BIT-39): the inbox, its unread count for the bell, and marking them read. */
@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/notifications", produces = "application/json")
@RequiredArgsConstructor
class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    NotificationViews.Notices list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam(defaultValue = "false") boolean unread,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "30") @Min(1) @Max(100) int size) {
        return notificationService.list(actor, workspaceId, unread, cursor, size);
    }

    @GetMapping("/{id}")
    NotificationViews.Notice get(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId, @PathVariable String id) {
        return notificationService.get(actor, workspaceId, id);
    }

    @GetMapping("/unread-count")
    NotificationViews.Count unreadCount(@AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId) {
        return new NotificationViews.Count(notificationService.unread(actor, workspaceId));
    }

    @PostMapping("/{id}/read")
    ResponseEntity<Void> read(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId, @PathVariable String id) {
        notificationService.read(actor, workspaceId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    ResponseEntity<Void> readAll(@AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId) {
        notificationService.readAll(actor, workspaceId);
        return ResponseEntity.noContent().build();
    }
}
