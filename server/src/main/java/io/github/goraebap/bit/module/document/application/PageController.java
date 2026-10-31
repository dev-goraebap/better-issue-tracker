package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pages over REST (D-113). Creating answers with what was made, unlike other creations, because the warnings (a
 * stripped folder, blocked external addresses) are only known then.
 */
@RestController
@Validated
@RequestMapping(value = "/api/v1/workspaces/{workspaceId}/documents", produces = "application/json")
@RequiredArgsConstructor
class PageController {
    private final PageService pageService;

    @PostMapping("/pages")
    @Operation(summary = "Make a page and its first version from an upload with purpose page (D-113)")
    @ApiResponse(responseCode = "201", description = "페이지 생성")
    ResponseEntity<PageViews.Published> create(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @Valid @RequestBody PageRequests.Create request) {
        var published = pageService.create(actor, workspaceId, request);
        return ResponseEntity.created(
                        URI.create("/api/v1/workspaces/" + workspaceId + "/documents/" + published.documentId()))
                .body(published);
    }

    @PostMapping("/{documentId}/versions")
    @Operation(
            summary =
                    "Add a page's next version from an upload with purpose page; the same upload again is that version")
    @ApiResponse(responseCode = "201", description = "새 버전")
    ResponseEntity<PageViews.Published> publish(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @Valid @RequestBody PageRequests.Publish request) {
        var published = pageService.publish(actor, workspaceId, documentId, request);
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/documents/" + documentId
                        + "/versions/" + published.version()))
                .body(published);
    }

    @GetMapping("/{documentId}/versions/{number}")
    @Operation(summary = "One version of a page: its files and the address to view it at for about an hour")
    PageViews.Version version(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @PathVariable @Min(1) int number) {
        return pageService.version(actor, workspaceId, documentId, number);
    }

    @GetMapping(value = "/{documentId}/bundle", produces = "application/zip")
    @Operation(summary = "A version's files as one zip, the latest unless version is given")
    @ApiResponse(
            responseCode = "200",
            content = @Content(mediaType = "application/zip", schema = @Schema(type = "string", format = "binary")))
    void bundle(
            @AuthenticationPrincipal CurrentUser actor,
            @PathVariable String workspaceId,
            @PathVariable String documentId,
            @RequestParam(required = false) @Min(1) Integer version,
            HttpServletResponse response)
            throws IOException {
        var bundle = pageService.bundle(actor, workspaceId, documentId, version);
        response.setContentType("application/zip");
        response.setHeader(
                HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment()
                        .filename(bundle.filename(), StandardCharsets.UTF_8)
                        .build()
                        .toString());
        // Written here rather than as a streaming body: an async dispatch would come back without the API key's
        // identity.
        pageService.writeBundle(bundle, response.getOutputStream());
    }
}
