package io.github.goraebap.bit.shared.web;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.error.ErrorCode;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.apache.tomcat.util.http.InvalidParameterException;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The error page the servlet container forwards to when something answered with an error outside Spring MVC (a
 * filter's exception, a sendError). It answers in the problem format with the common code for the status, in place of
 * Spring Boot's own body (timestamp, error, path) which has neither code nor trace id. Asked for directly, it is not
 * an address and answers 404.
 */
@Hidden
@RestController
class ProblemErrorController implements ErrorController {
    @RequestMapping("${server.error.path:${error.path:/error}}")
    void error(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        if (!(status instanceof Integer statusCode)) {
            ProblemResponse.write(response, CommonErrorCode.COMMON_NOT_FOUND);
            return;
        }
        // Broken percent-encoding read first by a filter is the client's mistake, not the server's.
        if (request.getAttribute(RequestDispatcher.ERROR_EXCEPTION) instanceof InvalidParameterException) {
            ProblemResponse.write(response, CommonErrorCode.COMMON_INVALID_REQUEST);
            return;
        }
        ErrorCode errorCode = ProblemResponse.commonCodeOf(HttpStatusCode.valueOf(statusCode));
        String body = ProblemResponse.prepare(response, statusCode, errorCode);
        response.getWriter().write(body);
    }
}
