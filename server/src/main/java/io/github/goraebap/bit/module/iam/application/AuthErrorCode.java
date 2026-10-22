package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AuthErrorCode implements ErrorCode {
    AUTH_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다"),
    AUTH_UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다"),
    AUTH_FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"),
    AUTH_BOOTSTRAP_CLOSED(HttpStatus.CONFLICT, "초기 관리자 가입이 이미 완료되었습니다"),
    AUTH_CSRF_INVALID(HttpStatus.FORBIDDEN, "보안 토큰을 다시 확인해 주세요"),
    AUTH_RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요"),
    AUTH_PASSWORD_INVALID(HttpStatus.BAD_REQUEST, "비밀번호는 15~64자, UTF-8 72바이트 이하로 입력해 주세요"),
    AUTH_NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 항목을 찾을 수 없습니다");
    private final HttpStatus status;
    private final String message;
}
