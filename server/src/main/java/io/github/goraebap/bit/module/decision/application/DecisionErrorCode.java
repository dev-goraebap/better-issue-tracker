package io.github.goraebap.bit.module.decision.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum DecisionErrorCode implements ErrorCode {
    DECISION_NOT_FOUND(HttpStatus.NOT_FOUND, "결정을 찾을 수 없습니다"),
    DECISION_INVALID_INPUT(HttpStatus.BAD_REQUEST, "결정 입력값을 확인해 주세요"),
    DECISION_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    DECISION_STATE_CONFLICT(HttpStatus.CONFLICT, "현재 결정 상태에서 허용되지 않는 변경입니다");
    private final HttpStatus status;
    private final String message;
}
