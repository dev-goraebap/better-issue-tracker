package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

/** A project's repository connections and their rules (D-087); changing them is for those who manage the project. */
@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/projects/{projectId}", produces = "application/json")
@RequiredArgsConstructor
class IntegrationController {
    private final IntegrationService integrationService;
    private final InboundService inboundService;

    @GetMapping("/integrations")
    List<CodeRefViews.Integration> list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId) {
        return integrationService.list(actor, workspaceId, projectId);
    }

    @PostMapping("/integrations")
    @Operation(summary = "Connect a repository: the token is checked against the host before it is kept")
    @ApiResponse(responseCode = "201", description = "연결됨")
    ResponseEntity<CodeRefViews.Integration> connect(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody CodeRefRequests.Connect request) {
        return ResponseEntity.status(201).body(integrationService.connect(actor, workspaceId, projectId, request));
    }

    @PatchMapping("/integrations/{integrationId}")
    CodeRefViews.Integration revise(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String integrationId,
            @Valid @RequestBody CodeRefRequests.Revise request) {
        return integrationService.revise(actor, workspaceId, projectId, integrationId, request);
    }

    @DeleteMapping("/integrations/{integrationId}")
    ResponseEntity<Void> disconnect(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String integrationId) {
        integrationService.disconnect(actor, workspaceId, projectId, integrationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/integrations/{integrationId}/import")
    @Operation(summary = "Bring in the repository's open issues with their comments, and link its open pull requests")
    CodeRefViews.Imported importOpen(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String integrationId) {
        return inboundService.importOpen(actor, workspaceId, projectId, integrationId);
    }

    @GetMapping("/integration-rules")
    CodeRefViews.Rules rules(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId) {
        return integrationService.rules(actor, workspaceId, projectId);
    }

    @PatchMapping("/integration-rules")
    CodeRefViews.Rules setRules(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody CodeRefRequests.Rules request) {
        return integrationService.setRules(actor, workspaceId, projectId, request);
    }

    @GetMapping("/issues/{issueId}/code-links")
    List<CodeRefViews.Link> links(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @PathVariable String issueId) {
        return integrationService.links(actor, workspaceId, projectId, issueId);
    }
}
