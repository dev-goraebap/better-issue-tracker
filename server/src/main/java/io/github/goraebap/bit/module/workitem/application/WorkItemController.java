package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.UUID;
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

    @GetMapping("/projects/{projectId}/work-items")
    WorkItemViews.WorkItems list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @Valid @ModelAttribute @ParameterObject WorkItemRequests.ListRequest request) {
        return workItemQueryService.list(actor, workspaceId, projectId, false, request);
    }

    @GetMapping("/projects/{projectId}/work-items/counts")
    java.util.List<WorkItemViews.ColumnCount> counts(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @Valid @ModelAttribute @ParameterObject WorkItemRequests.ListRequest request) {
        return workItemQueryService.counts(actor, workspaceId, projectId, request);
    }

    @GetMapping("/my-tasks")
    WorkItemViews.WorkItems mine(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @Valid @ModelAttribute @ParameterObject WorkItemRequests.ListRequest request) {
        return workItemQueryService.list(actor, workspaceId, null, true, request);
    }

    @GetMapping("/work-items/by-ref/{reference}")
    WorkItemViews.Item byRef(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable String reference) {
        return workItemQueryService.byRef(actor, workspaceId, reference);
    }

    @PostMapping("/projects/{projectId}/work-items")
    @ApiResponse(responseCode = "201", description = "작업항목 생성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @Valid @RequestBody WorkItemRequests.Create request) {
        UUID id = workItemService.create(actor, workspaceId, projectId, request.details(), request.columnId());
        return ResponseEntity.created(URI.create(base(workspaceId, projectId, id)))
                .build();
    }

    @GetMapping("/projects/{projectId}/work-items/{id}")
    WorkItemViews.Item get(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID id) {
        return workItemQueryService.get(actor, workspaceId, projectId, id);
    }

    @PatchMapping("/projects/{projectId}/work-items/{id}")
    ResponseEntity<Void> revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID id,
            @Valid @RequestBody WorkItemRequests.Update request) {
        workItemService.revise(actor, workspaceId, projectId, id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/projects/{projectId}/work-items/{id}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID id,
            @RequestParam @Min(0) long expectedVersion) {
        workItemService.delete(actor, workspaceId, projectId, id, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/work-items/{id}/move")
    ResponseEntity<Void> move(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID id,
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
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID id,
            @Valid @RequestBody WorkItemRequests.Version request) {
        workItemService.archive(actor, workspaceId, projectId, id, request.expectedVersion(), true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/work-items/{id}/unarchive")
    ResponseEntity<Void> unarchive(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID id,
            @Valid @RequestBody WorkItemRequests.Version request) {
        workItemService.archive(actor, workspaceId, projectId, id, request.expectedVersion(), false);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/work-items/{id}/restore")
    ResponseEntity<Void> restore(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID id,
            @Valid @RequestBody WorkItemRequests.Version request) {
        workItemService.restore(actor, workspaceId, projectId, id, request.expectedVersion());
        return ResponseEntity.noContent().build();
    }

    private static String base(UUID workspaceId, UUID projectId, UUID id) {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/work-items/" + id;
    }
}
