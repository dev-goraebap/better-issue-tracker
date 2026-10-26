---
name: bit-api-contract
description: BIT API·오류·인증과 권한·파일 첨부의 공통 계약. "API 추가", "엔드포인트 만들어줘", "업무 API", "오류 응답", "권한 검사", "로그인", "비밀번호", "API 키", "MCP 인증", "파일 업로드", "산출물 업로드"를 다루거나 컨트롤러·요청·응답 DTO를 바꿀 때 쓴다.
---

서버가 API 계약의 원본이며, OpenAPI에서 생성한 클라이언트 타입과 그 소비 코드를 같은 커밋에서 함께 바꾼다.

## 참고 파일

| 작업 | 파일 |
| :--- | :--- |
| API를 추가하거나 바꿀 때 | [API 계약](references/01-api-contract.md) |
| 오류를 던지거나 화면에서 다룰 때 | [오류 계약](references/02-error-contract.md) |
| 로그인·세션·API 키·권한 검사를 다룰 때 | [인증과 권한](references/03-authentication.md) |
| 파일 첨부·산출물 원본 업로드를 다룰 때 | [파일 첨부](references/04-attachments.md) |

## BIT에서 정할 것

이 스킬을 옮길 때 원본(SandboxHr)과 BIT 문서 어디에도 답이 없던 것이다. 정해지면 해당 참고 파일로 옮기고 이 목록에서 지운다.


- 후속 워크스페이스 역할 검사의 코드 표현. 역할별 허용 표와 인스턴스 관리자 분리는 D-037·인증 계약에 확정했다.


- 업무 기준 시간대(SandboxHr는 `Asia/Seoul` 고정)

## 완료 기준

- `server/openapi.json`, `client/src/shared/api/schema.d.ts`, 그 타입을 쓰는 화면 코드가 같은 커밋에 있다
- 오류는 `ErrorCode`를 가진 예외로 던지고, 응답이 `application/problem+json`이다

결과가 틀리면 `skill-repair`로 이 스킬을 고친다.
