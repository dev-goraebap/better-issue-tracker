package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Who belongs to which project (D-075): read by every member, changed by those who manage members. */
@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}", produces = "application/json")
@RequiredArgsConstructor
class ProjectMemberController {
    private final ProjectService projectService;

    @GetMapping("/project-members")
    ProjectViews.Memberships list(@AuthenticationPrincipal CurrentUser actor, @PathVariable UUID workspaceId) {
        return projectService.memberships(actor, workspaceId);
    }

    @PostMapping("/projects/{projectId}/members")
    @ApiResponse(responseCode = "204", description = "Member added (or already there)")
    ResponseEntity<Void> add(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectRequests.AddMember body) {
        projectService.addMember(actor, workspaceId, projectId, body.userId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/projects/{projectId}/members/{userId}")
    @ApiResponse(responseCode = "204", description = "Member taken off")
    ResponseEntity<Void> remove(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID userId) {
        projectService.removeMember(actor, workspaceId, projectId, userId);
        return ResponseEntity.noContent().build();
    }
}
