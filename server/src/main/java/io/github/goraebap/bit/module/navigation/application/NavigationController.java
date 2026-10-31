package io.github.goraebap.bit.module.navigation.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}", produces = "application/json")
@RequiredArgsConstructor
class NavigationController {
    private final NavigationService navigationService;

    @GetMapping("/navigation/{scope}")
    NavigationViews.Scope get(
            @AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId, @PathVariable String scope) {
        return NavigationViews.from(navigationService.get(actor, workspaceId, scope));
    }

    @PutMapping("/navigation/{scope}")
    NavigationViews.Scope save(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String scope,
            @Valid @RequestBody NavigationRequests.Update body) {
        return NavigationViews.from(
                navigationService.save(actor, workspaceId, scope, body.expectedVersion(), body.entries()));
    }

    @GetMapping("/project-favorites")
    List<String> favorites(@AuthenticationPrincipal CurrentUser actor, @PathVariable String workspaceId) {
        return navigationService.favorites(actor, workspaceId);
    }

    @PutMapping("/project-favorites/{projectId}")
    void favorite(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String projectId,
            @Valid @RequestBody NavigationRequests.Favorite body) {
        navigationService.favorite(actor, workspaceId, projectId, body.favorite());
    }
}
