# 역할·범위별 접근 검증하기

읽기·쓰기·첨부 URL에 대한 역할과 소속 검증을 변경하거나 회귀 확인합니다.

## 시작 전 확인

시험용 공간·프로젝트와 owner·작성 가능 역할·viewer·비멤버의 주체를 준비합니다. 대상의 실제 소속과 요청 URL의 범위를 구분합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 권한·소속·감사 주체 확인](../architecture/YwbxTrzXk9.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 권한 판정·감사 기준을 읽고 성공/거절 표를 만듭니다.
2. 읽기·쓰기·첨부 URL 각각을 역할별로 요청합니다.
3. 다른 공간 ID와 대상 ID를 섞은 요청도 확인합니다.
4. REST와 MCP에서 같은 유스케이스를 확인하고 화면의 표시와 비교합니다.
5. 매뉴얼 관련 변경이면 현재 통합 검사를 실행합니다.

`server`, PowerShell:

```powershell
.\gradlew.bat integrationTest --tests "*ManualIntegrationTest"
```

## 완료 확인

허용/거절과 데이터 보존 결과를 기록합니다. Service 통합 검사, 실제 HTTP/MCP, 화면 표시 중 무엇을 확인했는지 구분합니다. 감사 정보가 실제 요청 주체를 나타내는지도 확인합니다.

## 막히면

버튼이 안 보인다는 이유로 검증을 끝내지 않습니다. 서버 결과가 예상과 다르면 연결된 권한 기준과 현재 역할 설정을 대조하고 실제 저장 자료를 확인합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java)
- [server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java](../../../server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java)
- [server/src/main/java/io/github/goraebap/bit/module/project/application/ProjectService.java](../../../server/src/main/java/io/github/goraebap/bit/module/project/application/ProjectService.java)
