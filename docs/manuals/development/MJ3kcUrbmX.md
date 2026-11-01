# 목록 검색·정렬·커서 변경하기

목록 조건이나 정렬, 건수와 다음 페이지를 바꿀 때 수행합니다.

## 시작 전 확인

현재 쿼리와 DTO·화면 조건을 찾습니다. 조건별 예제 데이터, 같은 정렬값, 여러 자식이 있는 대상과 다음 페이지가 필요한 데이터를 준비합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 검색·페이징·다른 모듈 조회](../architecture/kegByIaS5R.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 조회·조인·페이징 기준을 읽고 쿼리의 부모 행 단위를 정합니다.
2. 검색·정렬·건수·커서 계산을 함께 수정합니다.
3. 조건 없음/있음·공통/프로젝트 범위·첫/다음/마지막 페이지를 확인합니다.
4. 같은 정렬값·null·여러 자식이 있는 대상에서 누락과 중복을 확인합니다.
5. 해당 통합 검사와 실제 화면의 조건/결과를 대조합니다.

## 완료 확인

필터 결과·total·nextCursor와 표시 순서가 일치해야 합니다. 성능이 변경의 목적이면 실제 실행 계획·데이터 양·측정 조건도 별도로 남깁니다.

## 막히면

건수나 페이지가 어긋나면 화면에서 배열을 다시 잘라 맞추기 전에 SQL 결과의 행 단위·정렬·조건 위치를 확인합니다. 생성 타입 컴파일 성공과 목록 의미의 정확성을 구분합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualRepository.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualRepository.java)
- [.agents/skills/bit-development/references/backend/04-cross-module-read.md](../../../.agents/skills/bit-development/references/backend/04-cross-module-read.md)
- [server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualQuery.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualQuery.java)
- [server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java](../../../server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java)
