package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.RelationRef;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.web.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/relations", produces = "application/json")
class RelationController {
    private final LinkService service;

    public record Connect(
            @NotNull TargetType fromType,

            @NotBlank @Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") String fromId,

            @NotBlank @Pattern(regexp = "subtask_of|relates_to|references") String relation,

            @NotNull TargetType toType,

            @NotBlank @Pattern(regexp = "[A-Za-z][A-Za-z0-9]{9}") String toId) {}

    @GetMapping
    List<RelationRef> list(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam TargetType type,
            @RequestParam String id) {
        return service.relations(actor, workspaceId, type, id);
    }

    @PostMapping
    ResponseEntity<Void> connect(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody Connect request) {
        String id = service.connect(
                actor,
                workspaceId,
                request.fromType(),
                request.fromId(),
                request.relation(),
                request.toType(),
                request.toId());
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/relations/" + id))
                .build();
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> disconnect(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId, @PathVariable String id) {
        service.disconnect(actor, workspaceId, id);
        return ResponseEntity.noContent().build();
    }
}
