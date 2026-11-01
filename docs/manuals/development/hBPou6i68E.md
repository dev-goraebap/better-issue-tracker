# 실패 응답 추가·변경하기

새 업무 오류를 만들거나 실패 안내와 회복 동작을 바꿉니다.

## 시작 전 확인

실패를 일으키는 입력·상태·권한과 사용자에게 필요한 다음 행동을 정합니다. 서버 ErrorCode와 클라이언트 ApiError/안내 소비 위치를 찾습니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 오류 코드·복구 안내·예외 처리](../architecture/qcb1FD05j8.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사에서 오류 분류와 매뉴얼 ErrorCode 예를 확인합니다.
2. 오류를 만드는 경로와 HTTP/MCP 표현, 화면 안내를 수정합니다.
3. 실제 실패 조건으로 status/code와 실패 후 자료·초안 상태를 확인합니다.
4. 클라이언트의 관련 HTTP 테스트를 실행합니다.

저장소 루트:

```powershell
npm test --prefix client
```

5. 안내대로 복구할 수 있는지 화면에서 확인합니다.

## 완료 확인

실패가 성공으로 보이지 않고 초안·이전 저장 결과가 보존되는지 확인합니다. 응답과 업무에 남길 로그에 비밀값이 포함되지 않았는지 검토합니다.

## 막히면

오류를 재현하지 못했다면 문구만 보고 통과로 기록하지 않습니다. 재현한 조건과 확인하지 못한 경로를 업무에 남깁니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualErrorCode.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualErrorCode.java)
- [client/src/shared/api/http.ts](../../../client/src/shared/api/http.ts)
