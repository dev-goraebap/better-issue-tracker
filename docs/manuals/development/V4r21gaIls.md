# 이미지 업로드·참조 경로 변경하기

매뉴얼 이미지의 업로드·본문 연결·열기·정리를 바꾸거나 확인합니다.

## 시작 전 확인

시험 이미지 원본과 실제 파일 형식·크기를 확인합니다. 업로드 계약과 저장 대상 책의 권한·소속을 확인하고 다른 책의 첨부 ID를 시험 자료로 재사용하지 않습니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 이미지 원본·첨부 참조·소유권](../architecture/kKgaLI96P5.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 원본·소유권·참조 기준과 실제 저장 검사를 읽습니다.
2. 현재 업로드 티켓 발급→원본 전송→본문과 업로드 ID 확정 경로를 따라갑니다.
3. 저장한 책을 다시 열어 이미지 원본과 본문 참조를 확인합니다.
4. 잘못된 참조·비이미지·한도·역할별 첨부 열기를 확인합니다.
5. 본문에서 이미지를 뺀 뒤 저장·재열기 결과와 정리 상태를 확인합니다.
6. 어댑터를 바꿨으면 해당 저장소 환경에서도 같은 경로를 확인합니다.

## 완료 확인

원본과 저장된 참조가 일치하고 권한 없는 주체가 첨부 URL로 우회하지 못하는지 확인합니다. 로컬 어댑터와 S3, 정상 저장과 실패 회복의 검증 범위를 구분합니다.

## 막히면

참조 검사에서 거절되면 코드 블록을 포함한 본문의 첨부 문자열·책 소유권·uploadIds를 확인합니다. 파일과 DB의 상태가 달라졌으면 각각을 조회하고 보정 필요를 기록합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java)
- [client/src/pages/project/manuals/api/manuals.ts](../../../client/src/pages/project/manuals/api/manuals.ts)
- [server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java](../../../server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java)
