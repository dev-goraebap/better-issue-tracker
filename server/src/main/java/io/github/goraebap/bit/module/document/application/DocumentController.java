package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
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
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/documents", produces = "application/json")
@RequiredArgsConstructor
class DocumentController {
    private final DocumentService documentService;

    @GetMapping
    @Operation(summary = "Documents matching a search, the most recently changed first (D-093)")
    DocumentViews.Page search(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam(required = false) String projectId,
            @RequestParam(defaultValue = "false") boolean workspaceOnly,
            @RequestParam(required = false) String labelId,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String workItemId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return documentService.search(
                actor,
                workspaceId,
                new DocumentQuery.Search(projectId, workspaceOnly, labelId, query, workItemId),
                cursor,
                limit);
    }

    @GetMapping("/parts")
    @Operation(summary = "Projects' parts in numbers, for their folders at the top of 문서함 (BIT-41)")
    List<DocumentViews.Part> parts(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam(name = "projectId") @jakarta.validation.constraints.Size(max = 200) List<String> projectIds) {
        return documentService.parts(actor, workspaceId, projectIds);
    }

    @GetMapping("/contents")
    @Operation(summary = "One folder of a part opened: the way down to it, its folders and its documents (D-093)")
    DocumentViews.Contents contents(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam(required = false) String projectId,
            @RequestParam(required = false) String folderId) {
        return documentService.contents(actor, workspaceId, projectId, folderId);
    }

    @PostMapping
    @ApiResponse(responseCode = "201", description = "문서 생성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody DocumentRequests.Create request) {
        String id = documentService.create(
                actor,
                workspaceId,
                request.projectId(),
                request.folderId(),
                request.title(),
                request.body(),
                request.labels());
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/documents/" + id))
                .build();
    }

    @GetMapping("/{documentId}")
    DocumentViews.Detail get(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId) {
        return documentService.get(actor, workspaceId, documentId);
    }

    @PatchMapping("/{documentId}")
    ResponseEntity<Void> revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @Valid @RequestBody DocumentRequests.Update request) {
        documentService.revise(actor, workspaceId, documentId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{documentId}/move")
    ResponseEntity<Void> move(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @Valid @RequestBody DocumentRequests.Move request) {
        documentService.move(
                actor, workspaceId, documentId, request.expectedVersion(), request.projectId(), request.folderId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{documentId}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @RequestParam @Min(0) long expectedVersion) {
        documentService.delete(actor, workspaceId, documentId, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{documentId}/restore")
    ResponseEntity<Void> restore(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @Valid @RequestBody DocumentRequests.Version request) {
        documentService.restore(actor, workspaceId, documentId, request.expectedVersion());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{documentId}/links")
    @ApiResponse(responseCode = "201", description = "업무와 연결")
    ResponseEntity<Void> link(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @Valid @RequestBody DocumentRequests.Link request) {
        String linkId = documentService.link(actor, workspaceId, documentId, request.workItemId());
        return ResponseEntity.created(URI.create(
                        "/api/v1/workspaces/" + workspaceId + "/documents/" + documentId + "/links/" + linkId))
                .build();
    }

    @DeleteMapping("/{documentId}/links/{linkId}")
    ResponseEntity<Void> unlink(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @PathVariable String linkId) {
        documentService.unlink(actor, workspaceId, documentId, linkId);
        return ResponseEntity.noContent().build();
    }
}
