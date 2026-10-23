package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum WorkItemErrorCode implements ErrorCode {
    WORKITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "작업항목을 찾을 수 없습니다"),
    WORKITEM_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    WORKITEM_ASSIGNEE_NOT_MEMBER(HttpStatus.BAD_REQUEST, "현재 워크스페이스 멤버에게만 배정할 수 있습니다"),
    WORKITEM_DATE_RANGE_INVALID(HttpStatus.BAD_REQUEST, "시작일은 마감일보다 늦을 수 없습니다"),
    WORKITEM_MOVE_INVALID(HttpStatus.BAD_REQUEST, "이동할 위치를 다시 확인해 주세요");
    private final HttpStatus status;
    private final String message;
}
