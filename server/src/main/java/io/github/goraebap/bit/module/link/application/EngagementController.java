package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.file.AttachedFile;
import io.github.goraebap.bit.shared.web.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
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
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/engagement/{type}/{id}", produces = "application/json")
class EngagementController {
    private final EngagementService service;

    public record React(
            @NotBlank @Size(max = 32) String emoji, @NotNull Boolean active) {}

    public record AttachFiles(
            @NotNull @Size(min = 1, max = 20) List<@Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") String> uploadIds) {
        public AttachFiles {
            uploadIds = uploadIds == null ? null : List.copyOf(uploadIds);
        }
    }

    @GetMapping("/reactions")
    List<EngagementService.ReactionView> reactions(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String type,
            @PathVariable String id) {
        return service.reactions(actor, workspaceId, type, id);
    }

    @PutMapping("/reactions")
    ResponseEntity<Void> react(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String type,
            @PathVariable String id,
            @Valid @RequestBody React request) {
        service.react(actor, workspaceId, type, id, request.emoji(), request.active());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/files")
    List<AttachedFile> files(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String type,
            @PathVariable String id) {
        return service.files(actor, workspaceId, type, id);
    }

    @PostMapping("/files")
    ResponseEntity<Void> attach(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String type,
            @PathVariable String id,
            @Valid @RequestBody AttachFiles request) {
        service.attach(actor, workspaceId, type, id, request.uploadIds());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/files/{fileId}")
    ResponseEntity<Void> discard(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String type,
            @PathVariable String id,
            @PathVariable String fileId) {
        service.discard(actor, workspaceId, type, id, fileId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/files/{fileId}/open")
    ResponseEntity<Void> open(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String type,
            @PathVariable String id,
            @PathVariable String fileId,
            @RequestParam(defaultValue = "true") boolean download) {
        return ResponseEntity.status(302)
                .location(service.open(actor, workspaceId, type, id, fileId, download))
                .build();
    }
}
