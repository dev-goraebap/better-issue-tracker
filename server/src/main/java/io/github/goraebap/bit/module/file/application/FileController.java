package io.github.goraebap.bit.module.file.application;

import io.github.goraebap.bit.shared.web.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Starts an upload, and shows the instance admin which storage is in use. Opening a file goes through the module that
 * owns it, which checks who may see it first.
 */
@RestController
@RequiredArgsConstructor
class FileController {
    private final FileService fileService;

    /**
     * Returns where to send the bytes. The body is an explicit exception to the empty 201 of skill api/01-api-contract, since
     * the browser uses the URL and headers right away.
     */
    @Operation(summary = "Start an upload: where to send a file's bytes")
    @ApiResponse(responseCode = "201", description = "업로드 주소 발급")
    @PostMapping(value = "/api/v1/files/uploads", produces = "application/json")
    @ResponseStatus(HttpStatus.CREATED)
    FileViews.UploadTicket upload(
            @AuthenticationPrincipal CurrentUser user, @Valid @RequestBody FileRequests.Upload request) {
        return fileService.prepare(user, request);
    }

    @Operation(summary = "Read the file storage in use and whether it answered (instance admin)")
    @GetMapping(value = "/api/v1/admin/storage", produces = "application/json")
    FileViews.Storage storage() {
        return fileService.storage();
    }
}
