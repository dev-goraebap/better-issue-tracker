package io.github.goraebap.bit.module.manual.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ManualErrorCode implements ErrorCode {
    MANUAL_NOT_FOUND(HttpStatus.NOT_FOUND, "매뉴얼을 찾을 수 없습니다"),
    MANUAL_ASSET_LIMIT(HttpStatus.PAYLOAD_TOO_LARGE, "매뉴얼 이미지의 전체 용량은 100MB까지 저장할 수 있습니다"),
    MANUAL_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 초안은 유지됩니다. 최신 내용을 확인해 주세요"),
    MANUAL_INVALID_CONTENT(HttpStatus.BAD_REQUEST, "매뉴얼 구성이나 이미지 참조를 확인해 주세요");
    private final HttpStatus status;
    private final String message;
}
