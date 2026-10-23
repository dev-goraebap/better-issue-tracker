package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ProjectErrorCode implements ErrorCode {
    PROJECT_NOT_FOUND(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다"),
    PROJECT_KEY_CONFLICT(HttpStatus.CONFLICT, "이미 사용된 프로젝트 키입니다"),
    PROJECT_ARCHIVED(HttpStatus.CONFLICT, "보관한 프로젝트를 먼저 복원해 주세요"),
    PROJECT_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    PROJECT_COLUMN_NOT_FOUND(HttpStatus.NOT_FOUND, "보드 컬럼을 찾을 수 없습니다"),
    PROJECT_COLUMN_REQUIRED(HttpStatus.CONFLICT, "보드 컬럼이 하나 이상 필요합니다"),
    PROJECT_FINAL_COLUMN_REQUIRED(HttpStatus.CONFLICT, "완료 컬럼이 하나 이상 필요합니다"),
    PROJECT_COLUMN_TARGET_INVALID(HttpStatus.BAD_REQUEST, "이동할 컬럼을 확인해 주세요");
    private final HttpStatus status;
    private final String message;
}
