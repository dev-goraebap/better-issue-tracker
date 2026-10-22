package io.github.goraebap.bit.shared.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CommonErrorCode implements ErrorCode {
    AUTH_UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다"),

    AUTH_FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"),

    COMMON_INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청이 올바르지 않습니다"),

    COMMON_NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 주소를 찾을 수 없습니다"),

    COMMON_METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "이 주소에서 허용하지 않는 요청 방식입니다"),

    COMMON_NOT_ACCEPTABLE(HttpStatus.NOT_ACCEPTABLE, "요청한 응답 형식을 제공할 수 없습니다"),

    COMMON_UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "지원하지 않는 요청 본문 형식입니다"),

    COMMON_CONFLICT(HttpStatus.CONFLICT, "요청이 다른 작업과 충돌했습니다"),

    COMMON_INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다"),

    COMMON_MAIL_DELIVERY_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "메일을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요");

    private final HttpStatus status;
    private final String message;
}
