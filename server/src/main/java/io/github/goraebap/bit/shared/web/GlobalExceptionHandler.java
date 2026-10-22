package io.github.goraebap.bit.shared.web;

import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.error.DomainRuleViolation;
import io.github.goraebap.bit.shared.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.ElementKind;
import jakarta.validation.Path;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.tomcat.util.http.InvalidParameterException;
import org.slf4j.MDC;
import org.springframework.beans.TypeMismatchException;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.core.MethodParameter;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import tools.jackson.core.JacksonException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    ProblemDetail handleAccessDenied(
            org.springframework.security.access.AccessDeniedException exception, HttpServletRequest request) {
        ProblemDetail problem =
                ProblemDetail.forStatusAndDetail(org.springframework.http.HttpStatus.FORBIDDEN, "접근 권한이 없습니다");
        problem.setProperty("code", "AUTH_FORBIDDEN");
        problem.setProperty("traceId", MDC.get(TraceIdFilter.MDC_KEY));
        return problem;
    }

    public record InvalidField(String field, String message) {}

    @ExceptionHandler(BusinessException.class)
    ProblemDetail handleBusiness(BusinessException businessException, HttpServletRequest httpServletRequest) {
        return toProblemDetail(businessException.errorCode(), businessException.getMessage(), httpServletRequest);
    }

    @ExceptionHandler(DomainRuleViolation.class)
    ProblemDetail handleDomainRule(DomainRuleViolation domainRuleViolation, HttpServletRequest httpServletRequest) {
        return toProblemDetail(
                CommonErrorCode.COMMON_INVALID_REQUEST, domainRuleViolation.getMessage(), httpServletRequest);
    }

    /** Constraint violations a service finds after binding, such as a request detail read by its kind. */
    @ExceptionHandler(ConstraintViolationException.class)
    ProblemDetail handleConstraintViolation(
            ConstraintViolationException constraintViolationException, HttpServletRequest httpServletRequest) {
        ProblemDetail problemDetail = toProblemDetail(
                CommonErrorCode.COMMON_INVALID_REQUEST,
                CommonErrorCode.COMMON_INVALID_REQUEST.message(),
                httpServletRequest);
        problemDetail.setProperty(
                "errors",
                constraintViolationException.getConstraintViolations().stream()
                        .map(violation -> new InvalidField(fieldOf(violation), ValidationWords.of(violation)))
                        .toList());
        return problemDetail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail handleIllegalArgument(
            IllegalArgumentException illegalArgumentException, HttpServletRequest httpServletRequest) {
        return toProblemDetail(
                CommonErrorCode.COMMON_INVALID_REQUEST,
                CommonErrorCode.COMMON_INVALID_REQUEST.message(),
                httpServletRequest);
    }

    /**
     * A query string whose percent-encoding is broken (cursor=%%%%). Tomcat reads the parameters only when one is first
     * asked for, so this surfaces wherever that happens; the name and value it quotes may be the broken ones and are
     * not repeated.
     */
    @ExceptionHandler(InvalidParameterException.class)
    ProblemDetail handleInvalidParameter(
            InvalidParameterException invalidParameterException, HttpServletRequest httpServletRequest) {
        return toProblemDetail(
                CommonErrorCode.COMMON_INVALID_REQUEST,
                CommonErrorCode.COMMON_INVALID_REQUEST.message(),
                httpServletRequest);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail handleConflict(
            DataIntegrityViolationException dataIntegrityViolationException, HttpServletRequest httpServletRequest) {
        log.warn("유일성 제약 충돌 (traceId={})", MDC.get(TraceIdFilter.MDC_KEY), dataIntegrityViolationException);
        return toProblemDetail(CommonErrorCode.COMMON_CONFLICT, "요청이 다른 작업과 충돌했습니다. 다시 시도해 주세요", httpServletRequest);
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception exception, HttpServletRequest httpServletRequest) {
        log.error("처리되지 않은 예외 (traceId={})", MDC.get(TraceIdFilter.MDC_KEY), exception);
        return toProblemDetail(
                CommonErrorCode.COMMON_INTERNAL_ERROR, "일시적인 오류입니다. 잠시 후 다시 시도해 주세요", httpServletRequest);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<InvalidField> invalidFields = ex.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> new InvalidField(fieldError.getField(), messageOf(fieldError)))
                .toList();

        ProblemDetail problemDetail =
                ProblemDetail.forStatusAndDetail(status, CommonErrorCode.COMMON_INVALID_REQUEST.message());
        problemDetail.setProperty("errors", invalidFields);
        return handleExceptionInternal(ex, problemDetail, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(
            TypeMismatchException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return withErrors(ex, status, headers, request, fieldErrors(ex.getPropertyName(), ValidationWords.UNREADABLE));
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestParameter(
            MissingServletRequestParameterException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        return withErrors(ex, status, headers, request, fieldErrors(ex.getParameterName(), ValidationWords.REQUIRED));
    }

    /** A body that does not read; when one field's value is what failed (a malformed date), that field is named. */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return withErrors(ex, status, headers, request, fieldErrors(bodyPathOf(ex), ValidationWords.UNREADABLE));
    }

    /** Constraints on a handler's own parameters, such as @RequestParam @Min(2000) int year. */
    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<InvalidField> invalidFields = new ArrayList<>();
        for (ParameterValidationResult result : ex.getParameterValidationResults()) {
            if (result instanceof ParameterErrors parameterErrors) {
                parameterErrors
                        .getFieldErrors()
                        .forEach(fieldError ->
                                invalidFields.add(new InvalidField(fieldError.getField(), messageOf(fieldError))));
                continue;
            }
            String field = parameterNameOf(result.getMethodParameter());
            for (MessageSourceResolvable error : result.getResolvableErrors()) {
                invalidFields.add(new InvalidField(field, messageOf(result, error)));
            }
        }
        return withErrors(ex, status, headers, request, invalidFields);
    }

    private ResponseEntity<Object> withErrors(
            Exception ex,
            HttpStatusCode status,
            HttpHeaders headers,
            WebRequest request,
            List<InvalidField> invalidFields) {
        ProblemDetail problemDetail =
                createProblemDetail(ex, status, CommonErrorCode.COMMON_INVALID_REQUEST.message(), null, null, request);
        if (!invalidFields.isEmpty()) problemDetail.setProperty("errors", invalidFields);
        return handleExceptionInternal(ex, problemDetail, headers, status, request);
    }

    private static List<InvalidField> fieldErrors(String field, String message) {
        return field == null || field.isBlank() ? List.of() : List.of(new InvalidField(field, message));
    }

    /**
     * The errors Spring answers itself (a path that is no API, a method not allowed, a body or value that does not read)
     * speak in the common codes and words: Spring's own detail can repeat what was sent and name internal classes, so
     * it is replaced. Field errors keep their per-field messages.
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        ResponseEntity<Object> responseEntity = super.handleExceptionInternal(ex, body, headers, statusCode, request);
        if (responseEntity != null && responseEntity.getBody() instanceof ProblemDetail problemDetail) {
            ErrorCode errorCode = ProblemResponse.commonCodeOf(statusCode);
            Map<String, Object> properties = problemDetail.getProperties();
            if (properties == null || !properties.containsKey("code")) {
                problemDetail.setProperty("code", errorCode.code());
            }
            if (!(ex instanceof MethodArgumentNotValidException)) problemDetail.setDetail(errorCode.message());
            problemDetail.setProperty("traceId", MDC.get(TraceIdFilter.MDC_KEY));
        }
        return responseEntity;
    }

    private static ProblemDetail toProblemDetail(
            ErrorCode errorCode, String detail, HttpServletRequest httpServletRequest) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(errorCode.status(), detail);
        problemDetail.setInstance(URI.create(httpServletRequest.getRequestURI()));
        problemDetail.setProperty("code", errorCode.code());
        problemDetail.setProperty("traceId", MDC.get(TraceIdFilter.MDC_KEY));
        return problemDetail;
    }

    /**
     * A field's message: the rule it broke in the contract's words (ValidationWords), or for a value that could not be
     * read as its type (a word where a date or an id belongs) a plain sentence, since Spring's own names the value sent
     * and the Java type.
     */
    private static String messageOf(FieldError fieldError) {
        if (fieldError.isBindingFailure()) return ValidationWords.UNREADABLE;
        if (fieldError.contains(ConstraintViolation.class))
            return ValidationWords.of(fieldError.unwrap(ConstraintViolation.class));
        return CommonErrorCode.COMMON_INVALID_REQUEST.message();
    }

    private static String messageOf(ParameterValidationResult result, MessageSourceResolvable error) {
        try {
            return ValidationWords.of(result.unwrap(error, ConstraintViolation.class));
        } catch (IllegalArgumentException notAViolation) {
            return CommonErrorCode.COMMON_INVALID_REQUEST.message();
        }
    }

    /**
     * The field a violation names as the client sent it. Method validation paths start with the method and the
     * parameter (usage.year, submit.request.startDate); the client knows neither, so they are dropped.
     */
    private static String fieldOf(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath().toString();
        List<Path.Node> nodes = new ArrayList<>();
        violation.getPropertyPath().forEach(nodes::add);
        if (nodes.isEmpty()) return path;
        ElementKind first = nodes.get(0).getKind();
        if (first != ElementKind.METHOD && first != ElementKind.CONSTRUCTOR) return path;
        int drop = nodes.size() > 2 && nodes.get(1).getKind() == ElementKind.PARAMETER ? 2 : 1;
        for (int i = 0; i < drop; i++) {
            int dot = path.indexOf('.');
            if (dot < 0) break;
            path = path.substring(dot + 1);
        }
        return path;
    }

    private static String parameterNameOf(MethodParameter methodParameter) {
        RequestParam requestParam = methodParameter.getParameterAnnotation(RequestParam.class);
        if (requestParam != null && !requestParam.name().isBlank()) return requestParam.name();
        PathVariable pathVariable = methodParameter.getParameterAnnotation(PathVariable.class);
        if (pathVariable != null && !pathVariable.name().isBlank()) return pathVariable.name();
        return methodParameter.getParameterName();
    }

    /** The JSON path of the value that failed to read (attendees[0].start), or null when the body itself is broken. */
    private static String bodyPathOf(HttpMessageNotReadableException ex) {
        for (Throwable cause = ex.getCause(); cause != null; cause = cause.getCause()) {
            if (cause instanceof JacksonException jacksonException
                    && !jacksonException.getPath().isEmpty()) {
                StringBuilder path = new StringBuilder();
                for (JacksonException.Reference reference : jacksonException.getPath()) {
                    if (reference.getPropertyName() != null) {
                        if (!path.isEmpty()) path.append('.');
                        path.append(reference.getPropertyName());
                    } else if (reference.getIndex() >= 0)
                        path.append('[').append(reference.getIndex()).append(']');
                }
                return path.toString();
            }
        }
        return null;
    }
}
