package io.github.goraebap.bit.module.session.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum SessionErrorCode implements ErrorCode {
    SESSION_RECORD_NOT_FOUND(HttpStatus.NOT_FOUND, "세션 기록을 찾을 수 없습니다"),
    SESSION_RECORD_INVALID_INPUT(HttpStatus.BAD_REQUEST, "세션 기록 입력값을 확인해 주세요"),
    SESSION_PARTICIPANT_NOT_MEMBER(HttpStatus.BAD_REQUEST, "현재 워크스페이스 멤버만 사용자 참석자로 지정할 수 있습니다"),
    SESSION_RECORD_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요");
    private final HttpStatus status;
    private final String message;
}
