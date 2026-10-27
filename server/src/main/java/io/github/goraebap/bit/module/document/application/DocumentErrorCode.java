package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum DocumentErrorCode implements ErrorCode {
    DOCUMENT_ORDER_CONFLICT(HttpStatus.CONFLICT, "순서가 변경되었습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    DOCUMENT_ORDER_INVALID(HttpStatus.BAD_REQUEST, "현재 폴더의 항목을 빠짐없이 한 번씩 지정해 주세요"),
    DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다"),
    DOCUMENT_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    DOCUMENT_LABEL_INVALID(HttpStatus.BAD_REQUEST, "이 워크스페이스의 라벨만 붙일 수 있습니다"),
    DOCUMENT_LINK_NOT_FOUND(HttpStatus.NOT_FOUND, "이 문서의 연결을 찾을 수 없습니다"),
    FOLDER_NOT_FOUND(HttpStatus.NOT_FOUND, "폴더를 찾을 수 없습니다"),
    FOLDER_NAME_CONFLICT(HttpStatus.CONFLICT, "같은 곳에 같은 이름의 폴더가 있습니다"),
    FOLDER_NOT_EMPTY(HttpStatus.CONFLICT, "폴더가 비어 있어야 지울 수 있습니다"),
    FOLDER_MOVE_INVALID(HttpStatus.BAD_REQUEST, "폴더를 자기 안으로 옮길 수 없습니다"),
    FOLDER_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요");
    private final HttpStatus status;
    private final String message;
}
