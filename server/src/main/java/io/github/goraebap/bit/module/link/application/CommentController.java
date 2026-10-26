package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Comments on a work item, a decision, a session or an artifact, and the target's timeline (D-078). */
@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}", produces = "application/json")
@RequiredArgsConstructor
class CommentController {
    private final CommentService commentService;
    private final TimelineService timelineService;

    @GetMapping("/timeline")
    TimelineViews.Timeline timeline(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam TargetType targetType,
            @RequestParam String targetId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "100") @Min(1) @Max(200) int size) {
        return timelineService.list(actor, workspaceId, targetType, targetId, cursor, size);
    }

    @PostMapping("/comments")
    @ApiResponse(responseCode = "201", description = "댓글 작성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody CommentRequests.Create request) {
        String id = commentService.create(actor, workspaceId, request.targetType(), request.targetId(), request.body());
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/comments/" + id))
                .build();
    }

    @PatchMapping("/comments/{commentId}")
    ResponseEntity<Void> revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String commentId,
            @Valid @RequestBody CommentRequests.Update request) {
        commentService.revise(actor, workspaceId, commentId, request.body(), request.expectedVersion());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/comments/{commentId}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String commentId,
            @RequestParam @Min(0) long expectedVersion) {
        commentService.delete(actor, workspaceId, commentId, expectedVersion);
        return ResponseEntity.noContent().build();
    }
}
