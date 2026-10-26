package io.github.goraebap.bit.module.view.application;

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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}", produces = "application/json")
@RequiredArgsConstructor
class ViewController {
    private final ViewService viewService;

    @GetMapping("/views")
    List<ViewViews.View> list(@AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId) {
        return viewService.list(actor, workspaceId);
    }

    @PostMapping("/views")
    @ApiResponse(responseCode = "201", description = "뷰 생성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody ViewRequests.Create request) {
        String id = viewService.create(actor, workspaceId, request);
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/views/" + id))
                .build();
    }

    @GetMapping("/views/{viewId}")
    ViewViews.View get(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId, @PathVariable String viewId) {
        return viewService.get(actor, workspaceId, viewId);
    }

    @PatchMapping("/views/{viewId}")
    ResponseEntity<Void> revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String viewId,
            @Valid @RequestBody ViewRequests.Update request) {
        viewService.revise(actor, workspaceId, viewId, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/views/{viewId}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String viewId,
            @RequestParam @Min(0) long expectedVersion) {
        viewService.delete(actor, workspaceId, viewId, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/view-tweaks")
    List<ViewViews.Tweak> tweaks(@AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId) {
        return viewService.tweaks(actor, workspaceId);
    }

    @PutMapping("/view-tweaks/{viewKey}")
    ResponseEntity<Void> putTweak(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String viewKey,
            @Valid @RequestBody ViewRequests.PutTweak request) {
        viewService.putTweak(actor, workspaceId, viewKey, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/view-tweaks/{viewKey}")
    ResponseEntity<Void> deleteTweak(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String viewKey) {
        viewService.deleteTweak(actor, workspaceId, viewKey);
        return ResponseEntity.noContent().build();
    }
}
