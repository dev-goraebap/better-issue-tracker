package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}", produces = "application/json")
@RequiredArgsConstructor
class WorkItemController {
    private final WorkItemService workItemService;
    private final WorkItemQueryService workItemQueryService;
    private final RecurrenceService recurrenceService;

    @GetMapping("/projects/{projectId}/work-items")
    WorkItemViews.WorkItems list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @ModelAttribute @ParameterObject WorkItemRequests.ListRequest request) {
        return workItemQueryService.list(actor, workspaceId, projectId, false, request);
    }

    @GetMapping("/projects/{projectId}/work-items/counts")
    java.util.List<WorkItemViews.ColumnCount> counts(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @ModelAttribute @ParameterObject WorkItemRequests.ListRequest request) {
        return workItemQueryService.counts(actor, workspaceId, projectId, request);
    }

    @GetMapping("/work-items")
    WorkItemViews.WorkItems listWorkspace(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @ModelAttribute @ParameterObject WorkItemRequests.WorkspaceListRequest request) {
        return workItemQueryService.listWorkspace(actor, workspaceId, request);
    }

    @GetMapping("/my-tasks")
    WorkItemViews.WorkItems mine(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @ModelAttribute @ParameterObject WorkItemRequests.ListRequest request) {
        return workItemQueryService.list(actor, workspaceId, null, true, request);
    }

    @GetMapping("/work-items/by-ref/{reference}")
    WorkItemViews.Item byRef(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String reference) {
        return workItemQueryService.byRef(actor, workspaceId, reference);
    }

    @PostMapping("/projects/{projectId}/work-items")
    @ApiResponse(responseCode = "201", description = "업무 생성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody WorkItemRequests.Create request) {
        String id = workItemService.create(
                actor,
                workspaceId,
                projectId,
                request.kindOrTask(),
                request.details(),
                request.columnId(),
                request.labels(),
                request.reminderMinutes());
        return ResponseEntity.created(URI.create(base(workspaceId, projectId, id)))
                .build();
    }

    @GetMapping("/projects/{projectId}/work-items/{id}")
    WorkItemViews.Item get(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id) {
        return workItemQueryService.get(actor, workspaceId, projectId, id);
    }

    @PatchMapping("/projects/{projectId}/work-items/{id}")
    ResponseEntity<Void> revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestParam(defaultValue = "single") WorkItemRequests.Scope scope,
            @Valid @RequestBody WorkItemRequests.Update request) {
        if (scope == WorkItemRequests.Scope.following)
            recurrenceService.reviseFollowing(actor, workspaceId, projectId, id, request);
        else workItemService.revise(actor, workspaceId, projectId, id, request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/projects/{projectId}/work-items/{id}/recurrence")
    ResponseEntity<Void> repeat(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody WorkItemRequests.Repeat request) {
        recurrenceService.repeat(actor, workspaceId, projectId, id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/projects/{projectId}/work-items/{id}/recurrence")
    ResponseEntity<Void> stopRepeating(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestParam @Min(0) long expectedVersion) {
        recurrenceService.stop(actor, workspaceId, projectId, id, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/projects/{projectId}/work-items/{id}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestParam @Min(0) long expectedVersion) {
        workItemService.delete(actor, workspaceId, projectId, id, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/work-items/{id}/move")
    ResponseEntity<Void> move(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody WorkItemRequests.Move request) {
        if (!request.hasTarget()) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        workItemService.move(
                actor,
                workspaceId,
                projectId,
                id,
                request.getExpectedVersion(),
                request.getTargetColumnId(),
                request.getBeforeItemId(),
                request.getAfterItemId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/work-items/{id}/archive")
    ResponseEntity<Void> archive(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody WorkItemRequests.Version request) {
        workItemService.archive(actor, workspaceId, projectId, id, request.expectedVersion(), true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/work-items/{id}/unarchive")
    ResponseEntity<Void> unarchive(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody WorkItemRequests.Version request) {
        workItemService.archive(actor, workspaceId, projectId, id, request.expectedVersion(), false);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/work-items/{id}/restore")
    ResponseEntity<Void> restore(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody WorkItemRequests.Version request) {
        workItemService.restore(actor, workspaceId, projectId, id, request.expectedVersion());
        return ResponseEntity.noContent().build();
    }

    private static String base(String workspaceId, String projectId, String id) {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/work-items/" + id;
    }
}
