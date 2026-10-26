package io.github.goraebap.bit.module.issue.application;

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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}", produces = "application/json")
@RequiredArgsConstructor
class IssueController {
    private final IssueService issueService;
    private final IssueQueryService issueQueryService;

    @GetMapping("/projects/{projectId}/issues")
    IssueViews.Issues list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @ModelAttribute @ParameterObject IssueRequests.ListRequest request) {
        return issueQueryService.list(actor, workspaceId, projectId, false, request);
    }

    @GetMapping("/projects/{projectId}/issues/counts")
    java.util.List<IssueViews.ColumnCount> counts(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @ModelAttribute @ParameterObject IssueRequests.ListRequest request) {
        return issueQueryService.counts(actor, workspaceId, projectId, request);
    }

    @GetMapping("/issues")
    IssueViews.Issues listWorkspace(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @ModelAttribute @ParameterObject IssueRequests.WorkspaceListRequest request) {
        return issueQueryService.listWorkspace(actor, workspaceId, request);
    }

    @GetMapping("/my-tasks")
    IssueViews.Issues mine(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @ModelAttribute @ParameterObject IssueRequests.ListRequest request) {
        return issueQueryService.list(actor, workspaceId, null, true, request);
    }

    @GetMapping("/issues/by-ref/{reference}")
    IssueViews.Item byRef(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String reference) {
        return issueQueryService.byRef(actor, workspaceId, reference);
    }

    @PostMapping("/projects/{projectId}/issues")
    @ApiResponse(responseCode = "201", description = "이슈 생성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody IssueRequests.Create request) {
        String id = issueService.create(
                actor, workspaceId, projectId, request.details(), request.columnId(), request.labels());
        return ResponseEntity.created(URI.create(base(workspaceId, projectId, id)))
                .build();
    }

    @GetMapping("/projects/{projectId}/issues/{id}")
    IssueViews.Item get(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id) {
        return issueQueryService.get(actor, workspaceId, projectId, id);
    }

    @PatchMapping("/projects/{projectId}/issues/{id}")
    ResponseEntity<Void> revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody IssueRequests.Update request) {
        issueService.revise(actor, workspaceId, projectId, id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/projects/{projectId}/issues/{id}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestParam @Min(0) long expectedVersion) {
        issueService.delete(actor, workspaceId, projectId, id, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/issues/{id}/move")
    ResponseEntity<Void> move(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody IssueRequests.Move request) {
        if (!request.hasTarget()) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        issueService.move(
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

    @PostMapping("/projects/{projectId}/issues/{id}/archive")
    ResponseEntity<Void> archive(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody IssueRequests.Version request) {
        issueService.archive(actor, workspaceId, projectId, id, request.expectedVersion(), true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/issues/{id}/unarchive")
    ResponseEntity<Void> unarchive(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody IssueRequests.Version request) {
        issueService.archive(actor, workspaceId, projectId, id, request.expectedVersion(), false);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/issues/{id}/restore")
    ResponseEntity<Void> restore(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String id,
            @Valid @RequestBody IssueRequests.Version request) {
        issueService.restore(actor, workspaceId, projectId, id, request.expectedVersion());
        return ResponseEntity.noContent().build();
    }

    private static String base(String workspaceId, String projectId, String id) {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/issues/" + id;
    }
}
