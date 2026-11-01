# 서비스 쓰기 흐름 변경하기

유스케이스의 조회·검사·상태 변경·저장 순서를 바꿀 때 수행합니다.

## 시작 전 확인

현재 트랜잭션 시작/종료 위치와 외부 I/O를 표시합니다. 성공 때 저장할 데이터와 중간 실패 때 남을 수 있는 DB·파일 상태를 확인합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 서비스 명령과 트랜잭션 경계](../architecture/by1uOTKEyK.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 트랜잭션 기준과 매뉴얼 저장 예를 읽습니다.
2. 현재 요청에서 권한·기존 상태·버전을 확인하는 시점을 추적합니다.
3. 변경 흐름을 구현하고 외부 I/O와 실패 지점을 다시 표시합니다.
4. 성공과 중간 실패를 해당 통합 시나리오로 검증합니다.
5. 저장 후 다른 경로로 다시 읽어 결과를 확인합니다.

## 완료 확인

성공 시 의도한 변경이 반영되고 실패 시 DB와 외부 객체 상태를 각각 설명할 수 있어야 합니다. 자동 검사와 실제 실패 재현의 범위를 구분합니다.

## 막히면

실패 후 데이터 상태를 설명할 수 없으면 트랜잭션을 더 넓혀 해결했다고 판단하지 않습니다. 외부 작업의 실행 시점과 보정·재시도 필요를 설계 기준으로 다시 검토합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java)
- [.agents/skills/bit-development/references/backend/03-layers.md](../../../.agents/skills/bit-development/references/backend/03-layers.md)
- [server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java](../../../server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java)
