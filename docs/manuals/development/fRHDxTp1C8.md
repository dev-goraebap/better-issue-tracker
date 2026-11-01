# 마이그레이션 추가하고 기존 데이터 확인하기

스키마 변경을 새 SQL로 추가하고 생성 타입과 실제 SQLite 적용을 확인합니다.

## 시작 전 확인

현재 최신 마이그레이션 번호와 병행 작업을 확인합니다. 변경을 소비하는 Service·Repository/Query와 기존 데이터 보존 항목을 정합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 스키마 변경과 데이터 보존](../architecture/ghuI6tESTu.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 스키마 변경·보존 기준과 실제 V33 예를 읽습니다.
2. 다음 버전의 SQL을 추가하고 기존 행의 변환·제약·인덱스를 검토합니다.
3. jOOQ를 생성하고 검사를 실행합니다.

`server`, PowerShell:

```powershell
.\gradlew.bat jooqCodegen
.\gradlew.bat check
```

4. 필요한 이전 버전의 시험 DB에서 업그레이드를 수행합니다.
5. 기존 행·ID·첨부 관계·제약·인덱스와 변경 기능을 다시 읽어 확인합니다.
6. API 계약이 바뀌었으면 [REST·MCP 변경](xlXKn4GNiy.md)의 생성 절차도 수행합니다.

## 완료 확인

DDL 파싱·새 DB 적용·이전 DB 업그레이드·실제 기능 검증을 나누어 기록합니다. 이미 적용된 SQL을 수정하지 않았는지 diff와 이력을 확인합니다.

## 막히면

checksum 또는 적용 실패를 이력 편집이나 DB 삭제로 숨기지 않습니다. 실패 로그·버전·데이터 조건을 남기고 격리 사본에서 원인을 확인합니다. 운영 복구는 별도 승인된 절차로 수행합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/build.gradle](../../../server/build.gradle)
- [server/src/main/resources/application.properties](../../../server/src/main/resources/application.properties)
- [.agents/skills/bit-development/references/database/01-database.md](../../../.agents/skills/bit-development/references/database/01-database.md)
- [docs/deployment.md](../../deployment.md)
- [server/src/main/resources/db/migration/V33__manuals.sql](../../../server/src/main/resources/db/migration/V33__manuals.sql)
