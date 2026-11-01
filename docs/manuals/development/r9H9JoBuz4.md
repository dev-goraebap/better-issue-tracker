# 요청 모델을 수정하고 포맷 검사하기

요청/응답 필드를 추가하거나 서버 파일의 명명·포맷을 정리할 때 수행합니다.

## 시작 전 확인

현재 Requests/Views·도메인 제약·클라이언트 소비 지점을 찾습니다. 필드의 누락·길이·기본값이 바뀌는지 확인하고, 계약 변경이면 REST/MCP 절차도 함께 엽니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 요청 모델·명명·코드 일관성](../architecture/Alg91m18V6.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 연결된 횡단 관심사의 DTO·명명 기준과 실제 Save record 예를 확인합니다.
2. 요청/응답 모델과 이를 받는 서비스·화면을 함께 수정합니다.
3. 포맷 수정이 필요한 경우에만 formatter를 실행하고 자기 변경 외의 diff가 생겼는지 검토합니다.
4. 형식 검사를 실행합니다.

`server`, PowerShell:

```powershell
.\gradlew.bat spotlessCheck checkstyleMain
```

포맷을 적용할 때의 명령은 `.\gradlew.bat spotlessApply`입니다. 검사 명령과 파일을 바꾸는 명령을 구분합니다.

## 완료 확인

형식 검사를 통과하고 DTO 변경에 따른 OpenAPI/생성 타입의 의미가 일치하는지 확인합니다. 명명 의미·입력 제약은 횡단 관심사의 수동 기준으로 검토합니다.

## 막히면

포맷 적용이 다른 작업 파일까지 바꿨으면 해당 변경을 함께 커밋하지 않습니다. 기존 변경과 구분해 내 변경만 정리합니다. 검사 예외는 현재 설정의 허용 범위와 이유를 확인합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualRequests.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualRequests.java)
- [server/config/checkstyle/checkstyle.xml](../../../server/config/checkstyle/checkstyle.xml)
- [server/build.gradle](../../../server/build.gradle)
- [.agents/skills/bit-development/references/backend/02-code-style.md](../../../.agents/skills/bit-development/references/backend/02-code-style.md)
