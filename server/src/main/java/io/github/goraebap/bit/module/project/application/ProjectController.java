package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.List;
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

@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/projects", produces = "application/json")
@RequiredArgsConstructor
class ProjectController {
    private final ProjectService projectService;
    private final ProjectQueryService projectQueryService;

    @GetMapping
    ProjectViews.Projects list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam(defaultValue = "active") String status,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {
        return projectQueryService.list(actor, workspaceId, status, q, cursor, size, sort, direction);
    }

    @PostMapping
    @ApiResponse(responseCode = "201", description = "프로젝트 생성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody ProjectRequests.Create request) {
        String id = projectService.create(
                actor,
                workspaceId,
                request.name(),
                request.key(),
                request.description(),
                request.icon(),
                request.color());
        return ResponseEntity.created(URI.create(base(workspaceId, id))).build();
    }

    @GetMapping("/{projectId}")
    ProjectViews.ProjectInfo get(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId) {
        return projectQueryService.get(actor, workspaceId, projectId);
    }

    @PatchMapping("/{projectId}")
    ResponseEntity<Void> revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody ProjectRequests.Update request) {
        projectService.revise(
                actor,
                workspaceId,
                projectId,
                request.getExpectedVersion(),
                request.getName(),
                request.hasName(),
                request.getKey(),
                request.hasKey(),
                request.getDescription(),
                request.hasDescription(),
                request.getIcon(),
                request.hasIcon(),
                request.getColor(),
                request.hasColor());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{projectId}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @RequestParam @Min(0) long expectedVersion) {
        projectService.delete(actor, workspaceId, projectId, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/archive")
    ResponseEntity<Void> archive(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody ProjectRequests.Version request) {
        projectService.archive(actor, workspaceId, projectId, request.expectedVersion(), true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/unarchive")
    ResponseEntity<Void> unarchive(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody ProjectRequests.Version request) {
        projectService.archive(actor, workspaceId, projectId, request.expectedVersion(), false);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/restore")
    ResponseEntity<Void> restore(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody ProjectRequests.Version request) {
        projectService.restore(actor, workspaceId, projectId, request.expectedVersion());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{projectId}/columns")
    List<ProjectViews.Column> columns(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId) {
        return projectQueryService.columns(actor, workspaceId, projectId);
    }

    @GetMapping("/{projectId}/columns/{columnId}")
    ProjectViews.Column column(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String columnId) {
        return projectQueryService.column(actor, workspaceId, projectId, columnId);
    }

    @PostMapping("/{projectId}/columns")
    @ApiResponse(responseCode = "201", description = "보드 컬럼 생성")
    ResponseEntity<Void> addColumn(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody ProjectRequests.CreateColumn request) {
        String id = projectService.addColumn(
                actor,
                workspaceId,
                projectId,
                request.expectedVersion(),
                request.name(),
                request.color(),
                request.isFinal(),
                request.category());
        return ResponseEntity.created(URI.create(base(workspaceId, projectId) + "/columns/" + id))
                .build();
    }

    @PatchMapping("/{projectId}/columns/{columnId}")
    ResponseEntity<Void> reviseColumn(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String columnId,
            @Valid @RequestBody ProjectRequests.ReviseColumn request) {
        projectService.reviseColumn(actor, workspaceId, projectId, columnId, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{projectId}/columns/{columnId}")
    ResponseEntity<Void> deleteColumn(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String columnId,
            @RequestParam @Min(0) long expectedVersion,
            @RequestParam String moveTo) {
        String target = "backlog".equals(moveTo) ? null : Ids.parse(moveTo);
        projectService.deleteColumn(actor, workspaceId, projectId, columnId, expectedVersion, target);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/columns/reorder")
    ResponseEntity<Void> reorder(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody ProjectRequests.Reorder request) {
        projectService.reorderColumns(actor, workspaceId, projectId, request.expectedVersion(), request.order());
        return ResponseEntity.noContent().build();
    }

    private static String base(String workspaceId, String projectId) {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId;
    }
}
