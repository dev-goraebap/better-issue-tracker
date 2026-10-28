package io.github.goraebap.bit.module.workitem.application;

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

/** A workspace's work item types (D-104): every member reads them, those who edit the workspace's settings change them. */
@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/work-item-types", produces = "application/json")
@RequiredArgsConstructor
class WorkItemTypeController {
    private final WorkItemTypeService workItemTypeService;

    @GetMapping
    List<WorkItemTypeViews.Item> listWorkItemTypes(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId) {
        return workItemTypeService.list(actor, workspaceId);
    }

    @PostMapping
    @ApiResponse(responseCode = "201", description = "업무 유형 생성")
    ResponseEntity<Void> createWorkItemType(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody WorkItemTypeRequests.Create request) {
        String id = workItemTypeService.create(actor, workspaceId, request);
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/work-item-types/" + id))
                .build();
    }

    @PutMapping("/order")
    ResponseEntity<Void> orderWorkItemTypes(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody WorkItemTypeRequests.Order request) {
        workItemTypeService.reorder(actor, workspaceId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{typeId}")
    WorkItemTypeViews.Item getWorkItemType(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId, @PathVariable String typeId) {
        return workItemTypeService.get(actor, workspaceId, typeId);
    }

    @PatchMapping("/{typeId}")
    ResponseEntity<Void> reviseWorkItemType(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String typeId,
            @Valid @RequestBody WorkItemTypeRequests.Update request) {
        workItemTypeService.revise(actor, workspaceId, typeId, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{typeId}")
    ResponseEntity<Void> deleteWorkItemType(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String typeId,
            @RequestParam @Min(0) long expectedVersion) {
        workItemTypeService.delete(actor, workspaceId, typeId, expectedVersion);
        return ResponseEntity.noContent().build();
    }
}
