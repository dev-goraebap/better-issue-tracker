package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum LinkErrorCode implements ErrorCode {
    LINK_TARGET_NOT_FOUND(HttpStatus.NOT_FOUND, "연결 대상을 찾을 수 없습니다"),
    LINK_NOT_FOUND(HttpStatus.NOT_FOUND, "연결을 찾을 수 없습니다"),
    LINK_RELATION_INVALID(HttpStatus.BAD_REQUEST, "이 대상에 사용할 수 없는 관계입니다"),
    LINK_CYCLE(HttpStatus.CONFLICT, "순환하는 관계를 만들 수 없습니다"),
    LINK_REPLACEMENT_CONFLICT(HttpStatus.CONFLICT, "이미 대체 결정이 있습니다"),
    LINK_PARENT_CONFLICT(HttpStatus.CONFLICT, "이미 상위 작업이 있습니다"),
    LINK_PROTECTED_RELATION(HttpStatus.CONFLICT, "결정 대체 흐름에서 변경해 주세요");
    private final HttpStatus status;
    private final String message;
}
