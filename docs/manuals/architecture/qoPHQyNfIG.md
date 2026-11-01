# 버전 충돌·감사·사용자 편집 보존

저장·삭제·설정 변경처럼 이전 상태에 의존하는 명령에 적용합니다.

## 규칙과 이유

읽은 version을 쓰기 요청에 전달하고 오래된 변경은 거절합니다. 충돌 시 새 version만 붙여 재전송하지 않습니다. 감사 작성자·agent·시각은 서버의 현재 주체와 Clock에서 정하며 입력값을 신뢰하지 않습니다.

## BIT 실제 코드

현재 코드 발췌: `server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java` · 190행부터. 주변 선언·호출부는 원본에서 확인합니다.

```java
    private ManualViews.Detail edit(CurrentUser actor, McpArguments args) {
        var d = get(actor, args);
        if (d.version() != args.integer("expected_version", -1)) throw ManualErrorCode.MANUAL_VERSION_CONFLICT.raise();
        return d;
    }
```

도구가 최신 책을 읽고 expected_version을 비교합니다. 최종 저장 Service에도 버전 검사가 있습니다. 한 페이지를 바꿔도 책의 version이 바뀌므로 연속 MCP 쓰기마다 최신 응답 version이 필요합니다.

## 피해야 할 예

아래는 실패 이유를 보여 주는 설명용 반례이며 현재 BIT 구현의 발췌가 아닙니다. 생략된 선언이 있어 그대로 실행하는 완성 코드가 아닙니다.

```java
// 충돌 후 최신 버전만 갈아 끼우면 다른 사람의 편집을 지움
oldDraft.version = latest.version;
await storeManual(workspaceId, projectId, oldDraft);
```

## 예외와 적용 한계

이 계약은 현재 SQLite 트랜잭션 경계와 함께 동작합니다. 저장 방언이나 트랜잭션을 바꾸면 선조회 비교와 실제 쓰기 사이의 경합을 다시 검증합니다. 서버 상태를 재조회해도 사용자의 로컬 초안을 자동 덮어쓰지 않습니다.

## 검증 기준

자동: ManualIntegrationTest는 예전 버전 쓰기를 거절하고 앞서 저장된 의견·서버 작성자·시각을 보존하는지 검사합니다.

수동: 두 편집 세션에서 같은 책을 열어 앞 저장 성공→뒤 저장 충돌→초안 복사/병합→최신 버전 저장을 확인합니다. 다른 페이지 편집도 같은 충돌 단위인지 설명과 일치해야 합니다.

## 적용 절차

실제 변경은 [개발 매뉴얼의 작업 절차](../development/bXuMEwplXk.md)로 이어 갑니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java)
- [server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java](../../../server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java)
- [client/src/pages/project/manuals/ui/ManualWorkspace.tsx](../../../client/src/pages/project/manuals/ui/ManualWorkspace.tsx)
