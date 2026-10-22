package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.shared.error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum WorkspaceErrorCode implements ErrorCode {
    WORKSPACE_NOT_FOUND(HttpStatus.NOT_FOUND, "워크스페이스를 찾을 수 없습니다"),
    WORKSPACE_SLUG_CONFLICT(HttpStatus.CONFLICT, "이미 사용된 식별자입니다"),
    WORKSPACE_MEMBER_EXISTS(HttpStatus.CONFLICT, "이미 참여 중인 멤버입니다"),
    WORKSPACE_INVITATION_ALREADY_PENDING(HttpStatus.CONFLICT, "아직 유효한 초대가 있습니다"),
    WORKSPACE_INVITATION_UNAVAILABLE(HttpStatus.NOT_FOUND, "초대 링크가 만료되었거나 더 이상 유효하지 않습니다"),
    WORKSPACE_INVITATION_ACCOUNT_MISMATCH(HttpStatus.FORBIDDEN, "초대받은 이메일의 계정으로 로그인해 주세요"),
    WORKSPACE_INVITATION_LOGIN_REQUIRED(HttpStatus.CONFLICT, "이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요"),
    WORKSPACE_INVITATION_ALREADY_ACCEPTED(HttpStatus.CONFLICT, "이미 수락된 초대입니다"),
    WORKSPACE_OWNER_REQUIRED(HttpStatus.CONFLICT, "소유권을 먼저 이전해 주세요"),
    WORKSPACE_INVALID_OWNER(HttpStatus.CONFLICT, "다른 활성 멤버에게 소유권을 이전해 주세요");
    private final HttpStatus status;
    private final String message;
}
