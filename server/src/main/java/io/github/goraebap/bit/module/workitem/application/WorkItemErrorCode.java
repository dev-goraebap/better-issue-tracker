package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum WorkItemErrorCode implements ErrorCode {
    WORK_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "업무를 찾을 수 없습니다"),
    WORK_ITEM_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    WORK_ITEM_PERSON_NOT_MEMBER(HttpStatus.BAD_REQUEST, "현재 워크스페이스 멤버만 담당자나 참석자로 넣을 수 있습니다"),
    WORK_ITEM_KIND_SHAPE_INVALID(HttpStatus.BAD_REQUEST, "작업은 날짜를, 일정은 시각이나 종일 날짜를 씁니다"),
    WORK_ITEM_DATE_RANGE_INVALID(HttpStatus.BAD_REQUEST, "시작일은 마감일보다 늦을 수 없습니다"),
    WORK_ITEM_MOVE_INVALID(HttpStatus.BAD_REQUEST, "이동할 위치를 다시 확인해 주세요"),
    WORK_ITEM_LABEL_INVALID(HttpStatus.BAD_REQUEST, "이 워크스페이스의 라벨만 붙일 수 있습니다"),
    WORK_ITEM_RECURRENCE_INVALID(HttpStatus.BAD_REQUEST, "반복 규칙을 다시 확인해 주세요"),
    WORK_ITEM_NOT_RECURRING(HttpStatus.BAD_REQUEST, "반복하는 업무가 아닙니다");
    private final HttpStatus status;
    private final String message;
}
