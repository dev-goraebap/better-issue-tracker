package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
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
@Validated
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/folders", produces = "application/json")
@RequiredArgsConstructor
class FolderController {
    private final FolderService folderService;

    @GetMapping
    @Operation(
            summary =
                    "Every folder of one part, by name: a project's, or the workspace's own when projectId is left out")
    List<DocumentViews.Folder> list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam(required = false) String projectId) {
        return folderService.list(actor, workspaceId, projectId);
    }

    @PostMapping
    @ApiResponse(responseCode = "201", description = "폴더 생성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody DocumentRequests.CreateFolder request) {
        String id = folderService.create(actor, workspaceId, request.projectId(), request.parentId(), request.name());
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/folders/" + id))
                .build();
    }

    @PatchMapping("/{folderId}")
    ResponseEntity<Void> rename(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String folderId,
            @Valid @RequestBody DocumentRequests.RenameFolder request) {
        folderService.rename(actor, workspaceId, folderId, request.expectedVersion(), request.name());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{folderId}/move")
    ResponseEntity<Void> move(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String folderId,
            @Valid @RequestBody DocumentRequests.MoveFolder request) {
        folderService.move(actor, workspaceId, folderId, request.expectedVersion(), request.parentId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{folderId}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String folderId,
            @RequestParam @Min(0) long expectedVersion) {
        folderService.delete(actor, workspaceId, folderId, expectedVersion);
        return ResponseEntity.noContent().build();
    }
}
