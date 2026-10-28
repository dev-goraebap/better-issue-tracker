package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * Work item types and the parent rules they set (D-104). The rule refusals carry a detail naming the types, items and
 * counts involved and how to fix it, so a person or an agent can act on it as it is.
 */
@Getter
@RequiredArgsConstructor
public enum WorkItemTypeErrorCode implements ErrorCode {
    WORK_ITEM_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "업무 유형을 찾을 수 없습니다"),
    WORK_ITEM_TYPE_NAME_CONFLICT(HttpStatus.CONFLICT, "같은 이름의 업무 유형이 있습니다"),
    WORK_ITEM_TYPE_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 변경이 있습니다. 새로 읽은 뒤 다시 시도해 주세요"),
    WORK_ITEM_TYPE_INVALID(HttpStatus.BAD_REQUEST, "이 워크스페이스의 업무 유형만 쓸 수 있습니다"),
    WORK_ITEM_TYPE_RULE_INVALID(HttpStatus.BAD_REQUEST, "상위가 필요한 유형은 상위가 될 수 있는 유형을 하나 이상 골라야 합니다"),
    WORK_ITEM_TYPE_IN_USE(HttpStatus.CONFLICT, "업무가 쓰고 있거나 기본인 유형은 지울 수 없습니다"),
    WORK_ITEM_TYPE_RULE_CONFLICT(HttpStatus.CONFLICT, "지금 있는 업무가 바뀐 규칙에 맞지 않습니다"),
    WORK_ITEM_PARENT_REQUIRED(HttpStatus.CONFLICT, "이 유형의 업무는 상위 업무 아래에 있어야 합니다"),
    WORK_ITEM_PARENT_NOT_ALLOWED(HttpStatus.CONFLICT, "이 유형의 업무는 그 업무 아래에 둘 수 없습니다");
    private final HttpStatus status;
    private final String message;
}
