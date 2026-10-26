package io.github.goraebap.bit.module.coderef.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CodeRefErrorCode implements ErrorCode {
    INTEGRATION_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "저장소 연동이 꺼져 있습니다(암호화 키가 설정되지 않음)"),
    INTEGRATION_NOT_FOUND(HttpStatus.NOT_FOUND, "저장소 연동을 찾을 수 없습니다"),
    INTEGRATION_EXISTS(HttpStatus.CONFLICT, "이 프로젝트는 이미 이 호스트의 저장소와 연결되어 있습니다"),
    INTEGRATION_INVALID(HttpStatus.BAD_REQUEST, "저장소 주소나 이름을 다시 확인해 주세요"),
    INTEGRATION_HOST_REFUSED(HttpStatus.BAD_REQUEST, "저장소 호스트가 요청을 거절했습니다"),
    INTEGRATION_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    HOOK_REJECTED(HttpStatus.UNAUTHORIZED, "서명이 맞지 않는 웹훅입니다");
    private final HttpStatus status;
    private final String message;
}
