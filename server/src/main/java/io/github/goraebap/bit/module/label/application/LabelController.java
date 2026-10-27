package io.github.goraebap.bit.module.label.application;

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
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/labels", produces = "application/json")
@RequiredArgsConstructor
class LabelController {
    private final LabelService labelService;

    @GetMapping
    List<LabelViews.Item> list(@AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId) {
        return labelService.list(actor, workspaceId);
    }

    @PostMapping
    @ApiResponse(responseCode = "201", description = "라벨 생성")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody LabelRequests.Create request) {
        String id = labelService.create(actor, workspaceId, request.name(), request.color());
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/labels/" + id))
                .build();
    }

    @PutMapping("/order")
    ResponseEntity<Void> order(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody LabelRequests.Order request) {
        labelService.reorder(actor, workspaceId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{labelId}")
    LabelViews.Item get(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String labelId) {
        return labelService.get(actor, workspaceId, labelId);
    }

    @PatchMapping("/{labelId}")
    ResponseEntity<Void> revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String labelId,
            @Valid @RequestBody LabelRequests.Update request) {
        labelService.revise(actor, workspaceId, labelId, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{labelId}")
    ResponseEntity<Void> delete(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String labelId,
            @RequestParam @Min(0) long expectedVersion) {
        labelService.delete(actor, workspaceId, labelId, expectedVersion);
        return ResponseEntity.noContent().build();
    }
}
