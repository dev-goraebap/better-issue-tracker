package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.shared.domain.Ids;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Where GitHub, GitLab and Gitea deliver their webhooks (D-087). No session or key: a delivery counts only when signed
 * with its integration's secret, and any refusal looks the same so the address tells an outsider nothing.
 */
@Hidden
@RestController
@RequiredArgsConstructor
class HookController {
    private static final int MAX_BODY = 5 * 1024 * 1024;
    private final InboundService inboundService;

    @PostMapping("/api/v1/hooks/{integrationId}")
    ResponseEntity<Void> deliver(
            @PathVariable String integrationId,
            @RequestBody(required = false) byte[] body,
            HttpServletRequest request) {
        String id;
        try {
            id = Ids.parse(integrationId);
        } catch (IllegalArgumentException invalid) {
            throw CodeRefErrorCode.HOOK_REJECTED.raise();
        }
        byte[] payload = body == null ? new byte[0] : body;
        if (payload.length > MAX_BODY) throw CodeRefErrorCode.HOOK_REJECTED.raise();
        var headers = new HashMap<String, String>();
        for (String name : Collections.list(request.getHeaderNames()))
            headers.put(name.toLowerCase(Locale.ROOT), request.getHeader(name));
        inboundService.receive(id, headers, payload);
        return ResponseEntity.accepted().build();
    }
}
