# REST·MCP 계약 변경하기

화면과 에이전트가 함께 사용할 기능의 입력·응답·도구를 바꿉니다.

## 시작 전 확인

현재 Controller·DTO·McpTools·Service와 OpenAPI·생성 타입·도구 안내를 찾습니다. 두 진입점에 필요한 입력과 권한을 확인합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — REST와 MCP가 같은 규칙을 사용하게 하기](../architecture/Qz4Sozn74C.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사에서 진입점과 서비스의 책임을 확인합니다.
2. 실제 Service와 DTO를 수정하고 HTTP와 MCP의 입력/결과 변환을 맞춥니다.
3. HTTP 계약이 바뀌었으면 아래 순서로 생성합니다.

`server`, PowerShell:

```powershell
.\gradlew.bat exportOpenApi
```

저장소 루트:

```powershell
npm run api:generate --prefix client
node scripts/check-bit-skill.mjs
```

4. 생성 diff와 화면 소비 코드, MCP 도구 설명을 함께 검토합니다.
5. 같은 주체로 REST와 MCP의 성공·입력 오류·권한 거절을 확인합니다.

## 완료 확인

스냅샷·생성 타입·구현·도구 안내가 같은 의미를 표현하고 두 진입점이 동일한 유스케이스 규칙을 적용하는지 확인합니다.

## 막히면

생성 결과가 예상과 다르면 생성 타입을 손으로 고치지 말고 서버 계약과 exporter 설정부터 확인합니다. 도구 목록 검사가 성공해도 실제 입력 처리를 검증한 것으로 대신하지 않습니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualController.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualController.java)
- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java)
- [server/build.gradle](../../../server/build.gradle)
- [client/package.json](../../../client/package.json)
