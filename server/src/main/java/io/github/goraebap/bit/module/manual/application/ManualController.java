package io.github.goraebap.bit.module.manual.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/workspaces/{workspaceId}/manuals")
class ManualController {
    private final ManualService manualService;

    @GetMapping
    ManualViews.Listing list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam(required = false) String projectId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) String color,
            @RequestParam(defaultValue = "updated") String sort,
            @RequestParam(defaultValue = "desc") String dir,
            @RequestParam(defaultValue = "100") @Min(1) @Max(100) int limit) {
        return manualService.search(
                actor,
                workspaceId,
                projectId,
                new ManualQuery.Search(q, scope, color, sort, "asc".equals(dir)),
                cursor,
                limit);
    }

    @GetMapping("/{id}")
    ManualViews.Detail get(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId, @PathVariable String id) {
        return manualService.get(actor, workspaceId, id);
    }

    @PostMapping
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody ManualRequests.Save request) {
        String id = manualService.save(actor, workspaceId, request, true);
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/manuals/" + id))
                .build();
    }

    @PutMapping("/{id}")
    ResponseEntity<Void> update(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String id,
            @Valid @RequestBody ManualRequests.Save request) {
        if (!id.equals(request.id())) throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
        manualService.save(actor, workspaceId, request, false);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String id,
            @RequestParam long expectedVersion) {
        manualService.delete(actor, workspaceId, id, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/assets/{assetId}")
    ResponseEntity<Void> asset(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String id,
            @PathVariable String assetId) {
        return ResponseEntity.status(302)
                .location(manualService.asset(actor, workspaceId, id, assetId))
                .header("Cache-Control", "private, no-store")
                .build();
    }
}
