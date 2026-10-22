package io.github.goraebap.bit.shared.web;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.error.ErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import tools.jackson.databind.json.JsonMapper;

/**
 * The problem body for errors answered outside Spring MVC: a URL the security firewall rejects, the error page, and
 * what Tomcat refuses before the application sees the request. It carries the fields GlobalExceptionHandler writes, in
 * the common code and words for the status.
 */
public final class ProblemResponse {
    private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();

    private ProblemResponse() {}

    /** The common code for a status the framework answers itself, as the error contract lists them. */
    public static ErrorCode commonCodeOf(HttpStatusCode statusCode) {
        return switch (statusCode.value()) {
            case 404 -> CommonErrorCode.COMMON_NOT_FOUND;
            case 405 -> CommonErrorCode.COMMON_METHOD_NOT_ALLOWED;
            case 406 -> CommonErrorCode.COMMON_NOT_ACCEPTABLE;
            case 415 -> CommonErrorCode.COMMON_UNSUPPORTED_MEDIA_TYPE;
            default ->
                statusCode.is5xxServerError()
                        ? CommonErrorCode.COMMON_INTERNAL_ERROR
                        : CommonErrorCode.COMMON_INVALID_REQUEST;
        };
    }

    /** Answers with the code's problem and status. */
    public static void write(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        String body = prepare(response, errorCode.status().value(), errorCode);
        response.getWriter().write(body);
        response.flushBuffer();
    }

    /**
     * Sets the status and the problem's content type on the response and returns the body to write. Tomcat's error
     * report writes it through a writer of its own.
     */
    public static String prepare(HttpServletResponse response, int status, ErrorCode errorCode) {
        // Without a type, as Spring writes its problems: RFC 9457 reads a missing type as about:blank.
        Map<String, Object> body = new LinkedHashMap<>();
        HttpStatus httpStatus = HttpStatus.resolve(status);
        body.put("title", (httpStatus == null ? errorCode.status() : httpStatus).getReasonPhrase());
        body.put("status", status);
        body.put("detail", errorCode.message());
        body.put("code", errorCode.code());
        body.put("traceId", traceIdOf(response));
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        return JSON_MAPPER.writeValueAsString(body);
    }

    /** The request's trace id: the one TraceIdFilter gave it, or a new one when the request never reached it. */
    private static String traceIdOf(HttpServletResponse response) {
        String traceId = MDC.get(TraceIdFilter.MDC_KEY);
        if (traceId == null) traceId = response.getHeader(TraceIdFilter.HEADER);
        if (traceId == null) {
            traceId = UUID.randomUUID().toString();
            response.setHeader(TraceIdFilter.HEADER, traceId);
        }
        return traceId;
    }
}
