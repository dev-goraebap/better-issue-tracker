package io.github.goraebap.bit.module.label.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum LabelErrorCode implements ErrorCode {
    LABEL_NOT_FOUND(HttpStatus.NOT_FOUND, "라벨을 찾을 수 없습니다"),
    LABEL_NAME_CONFLICT(HttpStatus.CONFLICT, "같은 이름의 라벨이 있습니다"),
    LABEL_SYSTEM_LOCKED(HttpStatus.CONFLICT, "시스템 라벨은 이름을 바꾸거나 지울 수 없습니다"),
    LABEL_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요");
    private final HttpStatus status;
    private final String message;
}
