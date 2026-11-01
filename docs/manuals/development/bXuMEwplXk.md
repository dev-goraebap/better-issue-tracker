# 동시 편집 충돌 검증하기

버전에 의존하는 저장·삭제·설정 변경의 충돌과 초안 보존을 확인합니다.

## 시작 전 확인

시험 데이터의 같은 책을 두 세션에서 열고 각각의 본문·version을 확인합니다. 앞 저장과 뒤 저장의 의도한 차이를 정합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 버전 충돌·감사·사용자 편집 보존](../architecture/qoPHQyNfIG.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 버전·감사 기준과 실제 edit 메서드를 확인합니다.
2. 첫 세션에서 변경을 저장하고 새 version을 확인합니다.
3. 둘째 세션에서 이전 version으로 다른 변경을 저장합니다.
4. 충돌 거절과 첫 저장의 보존, 둘째 초안의 보존을 확인합니다.
5. 최신 본문을 읽고 둘째 초안과 합쳐 새 요청으로 저장합니다.
6. 다시 열어 두 의도가 반영됐는지 확인합니다. MCP 연속 쓰기는 각 응답 version으로 다음 요청을 만듭니다.

## 완료 확인

앞선 편집·작성자·시각이 보존되고 충돌한 사용자가 초안을 회복할 수 있어야 합니다. 같은 책의 다른 페이지 편집에서도 충돌 단위가 설명과 일치하는지 확인합니다.

## 막히면

충돌이 나면 예전 초안의 version만 새 값으로 바꿔 보내지 않습니다. 병합할 내용을 판단할 수 없으면 최신 내용과 충돌 범위를 제시하고 자동 덮어쓰기를 중단합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java)
- [server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java](../../../server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java)
- [client/src/pages/project/manuals/ui/ManualWorkspace.tsx](../../../client/src/pages/project/manuals/ui/ManualWorkspace.tsx)
