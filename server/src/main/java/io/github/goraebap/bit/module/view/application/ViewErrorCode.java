package io.github.goraebap.bit.module.view.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ViewErrorCode implements ErrorCode {
    VIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "뷰를 찾을 수 없습니다"),
    VIEW_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    VIEW_INVALID(HttpStatus.BAD_REQUEST, "뷰의 이름·설명·아이콘·색·보기 방식·정렬을 확인해 주세요"),
    VIEW_FILTERS_INVALID(HttpStatus.BAD_REQUEST, "필터는 status·priority·assignee·label만, 값마다 900자까지 쓸 수 있습니다"),
    VIEW_COLUMNS_INVALID(HttpStatus.BAD_REQUEST, "표시할 속성이 비었거나 겹칩니다"),
    VIEW_ORDER_INVALID(HttpStatus.BAD_REQUEST, "뷰 순서에 없는 뷰나 겹친 뷰가 있습니다");
    private final HttpStatus status;
    private final String message;
}
