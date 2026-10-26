package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.PictureBytes;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
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
class AuthController {
    private final AuthService authService;
    private final IamService iamService;
    private final AuthCookies authCookies;
    private final SignedCsrfTokens signedCsrfTokens;

    @GetMapping("/auth/bootstrap")
    IamViews.BootstrapStatus bootstrap() {
        return new IamViews.BootstrapStatus(iamService.canBootstrap());
    }

    @GetMapping("/auth/csrf")
    IamViews.Csrf csrf(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return new IamViews.Csrf(token.getToken(), token.getHeaderName());
    }

    @PostMapping("/auth/bootstrap")
    @ApiResponse(responseCode = "201", description = "First administrator created")
    ResponseEntity<Void> bootstrap(@Valid @RequestBody IamRequests.Bootstrap request) {
        authService.bootstrap(request);
        return ResponseEntity.created(URI.create("/api/v1/me")).build();
    }

    @PostMapping("/auth/sessions")
    @ApiResponse(responseCode = "201", description = "Session created")
    ResponseEntity<Void> login(
            @Valid @RequestBody IamRequests.Login body, HttpServletRequest request, HttpServletResponse response) {
        var session = authService.login(body);
        authCookies.session(response, session);
        signedCsrfTokens.rotate(request, response, session.principal());
        return ResponseEntity.created(URI.create("/api/v1/auth/sessions/current"))
                .build();
    }

    @GetMapping("/auth/sessions/current")
    IamViews.Session currentSession(@AuthenticationPrincipal CurrentUser actor) {
        return iamService.currentSession(actor);
    }

    @GetMapping("/me")
    IamViews.Me me(@AuthenticationPrincipal CurrentUser actor) {
        return iamService.me(actor);
    }

    @DeleteMapping("/auth/sessions/current")
    @ApiResponse(responseCode = "204", description = "Session ended")
    ResponseEntity<Void> logout(
            @AuthenticationPrincipal CurrentUser actor, HttpServletRequest request, HttpServletResponse response) {
        return logout(actor, false, request, response);
    }

    @DeleteMapping("/auth/sessions")
    @ApiResponse(responseCode = "204", description = "All sessions ended")
    ResponseEntity<Void> logoutAll(
            @AuthenticationPrincipal CurrentUser actor, HttpServletRequest request, HttpServletResponse response) {
        return logout(actor, true, request, response);
    }

    @PatchMapping("/me")
    @ApiResponse(responseCode = "204", description = "Name changed")
    ResponseEntity<Void> rename(
            @AuthenticationPrincipal CurrentUser actor, @Valid @RequestBody IamRequests.Rename body) {
        iamService.rename(actor, body);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me/avatar")
    @ApiResponse(responseCode = "204", description = "Picture changed")
    ResponseEntity<Void> changeAvatar(
            @AuthenticationPrincipal CurrentUser actor, @Valid @RequestBody IamRequests.Avatar body) {
        iamService.changeAvatar(actor, body);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me/avatar")
    @ApiResponse(responseCode = "204", description = "Picture removed")
    ResponseEntity<Void> removeAvatar(@AuthenticationPrincipal CurrentUser actor) {
        iamService.removeAvatar(actor);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/users/{userId}/avatar/{pictureId}", produces = "image/jpeg")
    ResponseEntity<byte[]> avatar(@PathVariable String userId, @PathVariable String pictureId) {
        var file = iamService.avatarBytes(userId, pictureId);
        return PictureBytes.of(file.contentType(), file.body());
    }

    @PutMapping("/me/password")
    @ApiResponse(responseCode = "204", description = "Password changed and session rotated")
    ResponseEntity<Void> password(
            @AuthenticationPrincipal CurrentUser actor,
            @Valid @RequestBody IamRequests.Password body,
            HttpServletRequest request,
            HttpServletResponse response) {
        var session = authService.changePassword(actor, body);
        authCookies.session(response, session);
        signedCsrfTokens.rotate(request, response, session.principal());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/api-keys")
    IamViews.Keys keys(
            @AuthenticationPrincipal CurrentUser actor,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {
        if (!sort.equals("createdAt") || !direction.equals("DESC"))
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        return authService.keys(actor, cursor, size);
    }

    @PostMapping("/me/api-keys")
    @ApiResponse(responseCode = "201", description = "Key shown once")
    ResponseEntity<IamViews.CreatedKey> key(
            @AuthenticationPrincipal CurrentUser actor, @Valid @RequestBody IamRequests.CreateKey body) {
        var key = authService.createKey(actor, body);
        return ResponseEntity.created(URI.create("/api/v1/me/api-keys/" + key.id()))
                .body(key);
    }

    @DeleteMapping("/me/api-keys/{keyId}")
    @ApiResponse(responseCode = "204", description = "Key revoked")
    ResponseEntity<Void> revoke(@AuthenticationPrincipal CurrentUser actor, @PathVariable String keyId) {
        iamService.revokeKey(actor, keyId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/users/{userId}/temporary-passwords")
    IamViews.TemporaryPassword temporaryPassword(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String userId,
            @Valid @RequestBody IamRequests.Reauthenticate body) {
        return authService.temporaryPassword(actor, userId, body);
    }

    private ResponseEntity<Void> logout(
            CurrentUser actor, boolean all, HttpServletRequest request, HttpServletResponse response) {
        iamService.logout(actor, all);
        authCookies.clearSession(response);
        signedCsrfTokens.saveToken(null, request, response);
        return ResponseEntity.noContent().build();
    }
}
