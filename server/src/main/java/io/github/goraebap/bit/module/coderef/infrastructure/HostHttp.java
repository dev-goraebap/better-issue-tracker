package io.github.goraebap.bit.module.coderef.infrastructure;

import io.github.goraebap.bit.module.coderef.domain.GitHostException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * JSON over HTTP for the host adapters: a short timeout, the host's message kept when it refuses, and nothing of the
 * token in errors or logs.
 */
final class HostHttp {
    private static final Duration TIMEOUT = Duration.ofSeconds(15);
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final JsonMapper jsonMapper;

    HostHttp(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    JsonMapper json() {
        return jsonMapper;
    }

    JsonNode get(String url, Map<String, String> headers) {
        return send("GET", url, headers, null).body();
    }

    Reply getWithLinks(String url, Map<String, String> headers) {
        return send("GET", url, headers, null);
    }

    JsonNode send(String method, String url, Map<String, String> headers, Object body, boolean expectBody) {
        return send(method, url, headers, body).body();
    }

    Reply send(String method, String url, Map<String, String> headers, Object body) {
        HttpRequest.Builder request;
        try {
            request = HttpRequest.newBuilder(URI.create(url)).timeout(TIMEOUT);
        } catch (IllegalArgumentException invalid) {
            throw new GitHostException(0, "저장소 호스트 주소가 올바르지 않습니다");
        }
        if (!headers.containsKey("Accept")) request.header("Accept", "application/json");
        headers.forEach(request::header);
        if (body == null) request.method(method, HttpRequest.BodyPublishers.noBody());
        else
            request.header("Content-Type", "application/json")
                    .method(method, HttpRequest.BodyPublishers.ofString(jsonMapper.writeValueAsString(body)));
        HttpResponse<String> response;
        try {
            response = client.send(request.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException failure) {
            throw new GitHostException(
                    0, "저장소 호스트에 연결하지 못했습니다: " + URI.create(url).getHost());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new GitHostException(0, "저장소 호스트 요청이 중단되었습니다");
        } catch (IllegalArgumentException invalid) {
            throw new GitHostException(0, "저장소 호스트 주소가 올바르지 않습니다");
        }
        int status = response.statusCode();
        String text = response.body();
        if (status < 200 || status >= 300) throw new GitHostException(status, message(status, text));
        JsonNode node = text == null || text.isBlank() ? jsonMapper.nullNode() : jsonMapper.readTree(text);
        return new Reply(node, response.headers().firstValue("link").orElse(null));
    }

    private String message(int status, String text) {
        String detail = "";
        try {
            var node = jsonMapper.readTree(text == null ? "" : text);
            detail = s(node, "message");
            if (detail == null) detail = s(node, "error");
        } catch (RuntimeException notJson) {
            detail = null;
        }
        String head =
                switch (status) {
                    case 401 -> "토큰이 거절되었습니다";
                    case 403 -> "토큰에 이 저장소 권한이 없습니다";
                    case 404 -> "저장소를 찾지 못했습니다(이름과 토큰 권한을 확인해 주세요)";
                    default -> "저장소 호스트가 요청을 거절했습니다(" + status + ")";
                };
        return detail == null || detail.isBlank()
                ? head
                : head + ": " + (detail.length() > 200 ? detail.substring(0, 200) : detail);
    }

    /** A field as text, or null when missing or null. */
    static String s(JsonNode node, String field) {
        var value = node == null ? null : node.get(field);
        return value == null || value.isNull() || value.isMissingNode() ? null : value.asString();
    }

    static String at(JsonNode node, String pointer) {
        var value = node == null ? null : node.at(pointer);
        return value == null || value.isNull() || value.isMissingNode() ? null : value.asString();
    }

    static boolean bool(JsonNode node, String pointer) {
        var value = node == null ? null : node.at(pointer);
        return value != null && value.isBoolean() && value.asBoolean();
    }

    /** Whether a delivery's HMAC-SHA256 over the body, in lower-case hex, is the one given (in constant time). */
    static boolean hmac(byte[] body, String secret, String givenHex) {
        if (givenHex == null || secret == null) return false;
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal(body));
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.US_ASCII),
                    givenHex.strip().toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
        } catch (NoSuchAlgorithmException | InvalidKeyException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    static boolean same(String a, String b) {
        return a != null
                && b != null
                && MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    record Reply(JsonNode body, String link) {
        /** The next page's address from a Link header (GitHub, Gitea), or null on the last page. */
        String next() {
            if (link == null) return null;
            for (String part : link.split(",")) {
                if (part.contains("rel=\"next\"")) {
                    int start = part.indexOf('<');
                    int end = part.indexOf('>');
                    if (start >= 0 && end > start) return part.substring(start + 1, end);
                }
            }
            return null;
        }
    }
}
