package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}", produces = "application/json")
@RequiredArgsConstructor
class CodeLinkController {
    private static final int MAX_ISSUES = 500;
    private final IntegrationService integrationService;

    @GetMapping("/pull-requests")
    @Operation(summary = "The pull and merge requests of the given issues of the given projects, for badges")
    List<CodeRefViews.Pull> pulls(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @RequestParam String projects,
            @RequestParam String issues) {
        return integrationService.pulls(actor, workspaceId, ids(issues), ids(projects));
    }

    private static List<String> ids(String joined) {
        var ids = Arrays.stream(joined.split(","))
                .map(String::strip)
                .filter(each -> !each.isEmpty())
                .distinct()
                .toList();
        if (ids.size() > MAX_ISSUES) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        try {
            return ids.stream().map(Ids::parse).toList();
        } catch (IllegalArgumentException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }
}
