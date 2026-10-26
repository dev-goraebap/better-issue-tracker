package io.github.goraebap.bit.module.file.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum FileErrorCode implements ErrorCode {
    FILE_STORAGE_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "파일 저장소가 꺼져 있습니다. 관리자에게 저장소 설정을 확인해 달라고 해 주세요"),
    FILE_UPLOAD_MISSING(HttpStatus.BAD_REQUEST, "올린 파일을 찾을 수 없습니다. 파일을 다시 올려 주세요"),
    FILE_NOT_STORED(HttpStatus.BAD_REQUEST, "파일 업로드가 끝나지 않았습니다. 파일을 다시 올려 주세요"),
    FILE_PICTURE_INVALID(HttpStatus.BAD_REQUEST, "사진을 읽을 수 없습니다. 다른 사진을 골라 주세요");

    private final HttpStatus status;
    private final String message;
}
