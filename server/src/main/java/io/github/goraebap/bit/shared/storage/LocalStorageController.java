package io.github.goraebap.bit.shared.storage;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Where the browser sends and opens files when they live on this machine (LocalObjectStorage). The signed URL is the
 * permission, as with S3, so no session or CSRF token is asked for (AuthSecurityConfig lets this path through). With S3
 * storage the path answers 404. Browsers reach it only through signed URLs, never the generated client, so the OpenAPI
 * document leaves it out.
 */
@Hidden
@RestController
class LocalStorageController {
    private final LocalObjectStorage storage;

    LocalStorageController(ObjectStorage objectStorage) {
        this.storage = objectStorage instanceof LocalObjectStorage local ? local : null;
    }

    @PutMapping(LocalObjectStorage.PATH)
    ResponseEntity<Void> put(@RequestParam Map<String, String> params, HttpServletRequest request) throws IOException {
        if (storage == null) throw CommonErrorCode.COMMON_NOT_FOUND.raise();
        storage.put(params, request.getContentType(), request.getContentLengthLong(), request.getInputStream());
        return ResponseEntity.ok().build();
    }

    @GetMapping(LocalObjectStorage.PATH)
    ResponseEntity<Resource> get(@RequestParam Map<String, String> params) {
        if (storage == null) throw CommonErrorCode.COMMON_NOT_FOUND.raise();
        var download = storage.get(params).orElseThrow(CommonErrorCode.COMMON_NOT_FOUND::raise);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, download.disposition())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(new FileSystemResource(download.file()));
    }

    @ExceptionHandler(LocalObjectStorage.Refused.class)
    ResponseEntity<Void> refused() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
}
