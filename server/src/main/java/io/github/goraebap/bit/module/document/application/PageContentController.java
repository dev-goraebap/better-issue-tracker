package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.PagePath;
import io.github.goraebap.bit.module.file.FileFacade;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Serves page versions and BIT's fonts for them (D-113). It owns the whole /pages family, so the screens' fallback
 * never answers there, and answers every miss itself rather than through an error page. The security chain writes the
 * sandbox headers; this writes the type, caching and CORS: a sandboxed page's origin is null, so its module scripts and
 * fonts are cross-origin fetches, and the URL's token is already the permission.
 */
@Hidden
@Controller
@RequiredArgsConstructor
class PageContentController {
    private static final String ANY_ORIGIN = "*";

    private final PageTokens pageTokens;
    private final PageQuery pageQuery;
    private final PageFonts pageFonts;
    private final FileFacade fileFacade;

    @GetMapping({"/pages", "/pages/**"})
    void none(HttpServletResponse response) throws IOException {
        text(response, HttpServletResponse.SC_NOT_FOUND, "페이지를 찾을 수 없습니다");
    }

    @GetMapping("/pages/_fonts/{name}")
    void font(@PathVariable String name, HttpServletResponse response) throws IOException {
        if (name.equals(PageFonts.CSS) && pageFonts.css().isPresent()) {
            byte[] css = pageFonts.css().get().getBytes(StandardCharsets.UTF_8);
            fontHeaders(response, "text/css;charset=utf-8", css.length);
            response.getOutputStream().write(css);
            return;
        }
        var font = pageFonts.font(name);
        if (font.isEmpty()) {
            text(response, HttpServletResponse.SC_NOT_FOUND, "글꼴을 찾을 수 없습니다");
            return;
        }
        fontHeaders(response, "font/woff2", font.get().contentLength());
        try (var in = font.get().getInputStream()) {
            in.transferTo(response.getOutputStream());
        }
    }

    @GetMapping("/pages/{versionId}/{token}/{*path}")
    void file(
            @PathVariable String versionId,
            @PathVariable String token,
            @PathVariable String path,
            HttpServletResponse response)
            throws IOException {
        switch (pageTokens.check(versionId, token)) {
            case FORGED -> {
                text(response, HttpServletResponse.SC_NOT_FOUND, "페이지를 찾을 수 없습니다");
                return;
            }
            case EXPIRED -> {
                text(response, HttpServletResponse.SC_FORBIDDEN, "이 주소는 만료되었습니다. BIT에서 페이지를 다시 여세요");
                return;
            }
            case VALID -> {}
        }
        String relative = Normalizer.normalize(path.startsWith("/") ? path.substring(1) : path, Normalizer.Form.NFC);
        if (relative.isEmpty()) {
            var entry = pageQuery.entry(versionId);
            if (entry.isEmpty()) {
                text(response, HttpServletResponse.SC_NOT_FOUND, "페이지를 찾을 수 없습니다");
                return;
            }
            response.setStatus(HttpServletResponse.SC_FOUND);
            response.setHeader(HttpHeaders.LOCATION, pageTokens.address(versionId, token, new PagePath(entry.get())));
            return;
        }
        if (relative.endsWith("/")) relative += "index.html";
        var file = pageQuery.served(versionId, relative);
        if (file.isEmpty()) {
            text(response, HttpServletResponse.SC_NOT_FOUND, "묶음에 없는 파일입니다");
            return;
        }
        var served = file.get();
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(served.contentType());
        response.setHeader(HttpHeaders.CACHE_CONTROL, "private, max-age=3600");
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ANY_ORIGIN);
        response.setContentLengthLong(served.size() + (served.injectAt() == null ? 0 : PageInjection.BYTES.length));
        if (served.blobId() == null) {
            if (served.injectAt() != null) response.getOutputStream().write(PageInjection.BYTES);
            return;
        }
        try (var in = fileFacade.openKept(served.blobId())) {
            PageInjection.splice(in, response.getOutputStream(), served.injectAt());
        }
    }

    private static void fontHeaders(HttpServletResponse response, String contentType, long length) {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(contentType);
        response.setHeader(HttpHeaders.CACHE_CONTROL, "public, max-age=86400");
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ANY_ORIGIN);
        response.setContentLengthLong(length);
    }

    private static void text(HttpServletResponse response, int status, String message) throws IOException {
        byte[] body = message.getBytes(StandardCharsets.UTF_8);
        response.setStatus(status);
        response.setContentType("text/plain;charset=utf-8");
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ANY_ORIGIN);
        response.setContentLength(body.length);
        response.getOutputStream().write(body);
    }
}
