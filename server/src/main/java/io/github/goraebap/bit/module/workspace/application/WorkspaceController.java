package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.PictureBytes;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
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
@RequestMapping(value = "/api/v1", produces = "application/json")
@RequiredArgsConstructor
class WorkspaceController {
    private final WorkspaceService workspaceService;
    private final WorkspaceEnrollmentService workspaceEnrollmentService;

    @GetMapping("/workspaces/{id}/roles")
    List<WorkspaceViews.CustomRole> roles(@AuthenticationPrincipal CurrentUser actor, @PathVariable String id) {
        return workspaceService.customRoles(actor, id);
    }

    @PostMapping("/workspaces/{id}/roles")
    ResponseEntity<WorkspaceViews.CustomRole> createRole(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @Valid @RequestBody WorkspaceRequests.CustomRole request) {
        var role = workspaceService.saveCustomRole(actor, id, null, request);
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + id + "/roles/" + role.id()))
                .body(role);
    }

    @PutMapping("/workspaces/{id}/roles/{roleId}")
    WorkspaceViews.CustomRole updateRole(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @PathVariable String roleId,
            @Valid @RequestBody WorkspaceRequests.CustomRole request) {
        return workspaceService.saveCustomRole(actor, id, roleId, request);
    }

    @DeleteMapping("/workspaces/{id}/roles/{roleId}")
    ResponseEntity<Void> deleteRole(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @PathVariable String roleId,
            @RequestParam long expectedVersion) {
        workspaceService.deleteCustomRole(actor, id, roleId, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/workspaces")
    WorkspaceViews.Spaces list(
            @AuthenticationPrincipal CurrentUser actor,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {
        return workspaceService.list(actor, cursor, size, sort, direction);
    }

    @PostMapping("/workspaces")
    @ApiResponse(responseCode = "201", description = "Workspace and owner created")
    ResponseEntity<Void> create(
            @AuthenticationPrincipal CurrentUser actor, @Valid @RequestBody WorkspaceRequests.Create body) {
        return ResponseEntity.created(space(workspaceService.create(actor, body.name(), body.slug())))
                .build();
    }

    @GetMapping("/workspaces/{id}")
    WorkspaceViews.Space get(@AuthenticationPrincipal CurrentUser actor, @PathVariable String id) {
        return workspaceService.get(actor, id);
    }

    @PatchMapping("/workspaces/{id}")
    @ApiResponse(responseCode = "204", description = "Workspace updated")
    ResponseEntity<Void> rename(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @RequestBody WorkspaceRequests.Rename body) {
        workspaceService.rename(actor, id, body.getName(), body.hasName());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/workspaces/{id}/logo")
    @ApiResponse(responseCode = "204", description = "Logo changed")
    ResponseEntity<Void> changeLogo(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @Valid @RequestBody WorkspaceRequests.Logo body) {
        workspaceService.changeLogo(actor, id, body);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/workspaces/{id}/logo")
    @ApiResponse(responseCode = "204", description = "Logo removed")
    ResponseEntity<Void> removeLogo(@AuthenticationPrincipal CurrentUser actor, @PathVariable String id) {
        workspaceService.removeLogo(actor, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/workspaces/{id}/logo/{pictureId}", produces = "image/jpeg")
    ResponseEntity<byte[]> logo(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String id, @PathVariable String pictureId) {
        var file = workspaceService.logoBytes(actor, id, pictureId);
        return PictureBytes.of(file.contentType(), file.body());
    }

    @DeleteMapping("/workspaces/{id}")
    @ApiResponse(responseCode = "204", description = "Workspace deleted")
    ResponseEntity<Void> delete(@AuthenticationPrincipal CurrentUser actor, @PathVariable String id) {
        workspaceService.delete(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/auth/sessions/current/workspace")
    @ApiResponse(responseCode = "204", description = "Active workspace selected")
    ResponseEntity<Void> select(
            @AuthenticationPrincipal CurrentUser actor, @Valid @RequestBody WorkspaceRequests.Selection body) {
        workspaceService.select(actor, body.workspaceId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/workspaces/{id}/members")
    WorkspaceViews.Members members(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "joinedAt") String sort,
            @RequestParam(defaultValue = "ASC") String direction) {
        return workspaceService.members(actor, id, cursor, size, sort, direction);
    }

    @PatchMapping("/workspaces/{id}/members/{memberId}")
    @ApiResponse(responseCode = "204", description = "Member role changed")
    ResponseEntity<Void> role(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @PathVariable String memberId,
            @Valid @RequestBody WorkspaceRequests.ChangeRole body) {
        workspaceService.role(actor, id, memberId, body.role());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/workspaces/{id}/members/{memberId}")
    @ApiResponse(responseCode = "204", description = "Member removed")
    ResponseEntity<Void> remove(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String id, @PathVariable String memberId) {
        workspaceService.remove(actor, id, memberId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/workspaces/{id}/members/me")
    @ApiResponse(responseCode = "204", description = "Left workspace")
    ResponseEntity<Void> leave(@AuthenticationPrincipal CurrentUser actor, @PathVariable String id) {
        workspaceService.leave(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/workspaces/{id}/owner")
    @ApiResponse(responseCode = "204", description = "Ownership transferred")
    ResponseEntity<Void> transfer(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @Valid @RequestBody WorkspaceRequests.Transfer body) {
        workspaceEnrollmentService.transfer(actor, id, body.userId(), body.currentPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/workspaces/{id}/invitations")
    WorkspaceViews.Invites invitations(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {
        return workspaceService.invitations(actor, id, status, cursor, size, sort, direction);
    }

    @PostMapping("/workspaces/{id}/invitations")
    @ApiResponse(responseCode = "201", description = "Invitation token shown once")
    ResponseEntity<WorkspaceViews.CreatedInvitation> invite(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String id,
            @Valid @RequestBody WorkspaceRequests.Invite body) {
        var result = workspaceService.invite(actor, id, body.email(), body.role());
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + id + "/invitations/" + result.id()))
                .body(result);
    }

    @GetMapping("/workspaces/{id}/invitations/{invitationId}")
    WorkspaceViews.Invite invitation(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String id, @PathVariable String invitationId) {
        return workspaceService.invitation(actor, id, invitationId);
    }

    @DeleteMapping("/workspaces/{id}/invitations/{invitationId}")
    @ApiResponse(responseCode = "204", description = "Invitation revoked")
    ResponseEntity<Void> revoke(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String id, @PathVariable String invitationId) {
        workspaceService.revoke(actor, id, invitationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/invitation-previews")
    WorkspaceViews.Preview preview(@Valid @RequestBody WorkspaceRequests.Token body) {
        return workspaceService.preview(body.token());
    }

    @PostMapping("/invitation-acceptances")
    @ApiResponse(responseCode = "201", description = "Invitation accepted")
    @ApiResponse(responseCode = "204", description = "Already accepted by this member")
    ResponseEntity<Void> accept(
            @AuthenticationPrincipal CurrentUser actor, @Valid @RequestBody WorkspaceRequests.Token body) {
        var result = workspaceService.accept(actor, body.token());
        return result.repeated()
                ? ResponseEntity.noContent().build()
                : ResponseEntity.created(space(result.workspaceId())).build();
    }

    @PostMapping("/invitation-registrations")
    @ApiResponse(responseCode = "201", description = "Invited account and membership created")
    ResponseEntity<Void> register(
            @AuthenticationPrincipal CurrentUser actor, @Valid @RequestBody WorkspaceRequests.Registration body) {
        workspaceEnrollmentService.register(actor, body.token(), body.name(), body.password());
        return ResponseEntity.created(URI.create("/api/v1/me")).build();
    }

    private static URI space(String id) {
        return URI.create("/api/v1/workspaces/" + id);
    }
}
