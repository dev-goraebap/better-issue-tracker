# 서버 기능의 수정 위치 정하기

서버 기능을 추가하거나 책임을 나눌 때, 바꿀 파일과 공개 계약의 범위를 정합니다.

## 시작 전 확인

BIT 업무와 현재 작업 트리를 확인합니다. 변경할 사용자 동작·API·MCP·데이터를 한 흐름으로 적고 현재 요청의 진입점과 저장 위치를 찾습니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 모듈·계층·의존성 배치](../architecture/tIv5Msv7KG.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 가까운 기존 기능의 Controller 또는 MCP Tools에서 호출하는 Service를 추적합니다.
2. 변경할 모듈의 application·domain·infrastructure와 공개 계약을 표시합니다. 경계 판단은 연결된 횡단 관심사를 따릅니다.
3. 새 파일을 소비하는 위치에 추가하고 다른 모듈이 필요한 계약만 함께 수정합니다.
4. 단위/통합 시나리오를 변경하고 경계 검사를 실행합니다.

`server` 디렉터리, PowerShell:

```powershell
.\gradlew.bat test --tests "*ArchitectureTest"
```

## 완료 확인

검사 실패가 없고 실제 요청이 바뀐 Service를 통과하는지 확인합니다. 변경 파일·권한·생성 계약을 빠뜨리지 않았는지 diff를 검토합니다. 이 검사는 도메인 경계의 적절성까지 보증하지 않으므로 횡단 관심사의 수동 기준도 적용합니다.

## 막히면

다른 모듈 내부를 참조해 검사가 실패하면 억제하기 전에 공개 계약과 호출 방향을 다시 확인합니다. 작업 범위 밖의 구조 개편이 필요하면 같은 업무에 이유와 선택을 남깁니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualRepository.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualRepository.java)
- [.agents/skills/bit-development/references/backend/02-code-style.md](../../../.agents/skills/bit-development/references/backend/02-code-style.md)
- [server/src/test/java/io/github/goraebap/bit/ArchitectureTest.java](../../../server/src/test/java/io/github/goraebap/bit/ArchitectureTest.java)
