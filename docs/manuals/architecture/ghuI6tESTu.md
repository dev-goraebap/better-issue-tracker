# 스키마 변경과 데이터 보존

테이블·제약·인덱스를 바꾸는 모든 모듈에 적용합니다. 이 페이지는 스키마 원본과 데이터 보존 원칙을 설명합니다. 명령 실행 순서는 개발 매뉴얼에 있습니다.

## 규칙과 이유

Flyway SQL은 스키마 변경의 원본입니다. 이미 공유 환경에 적용된 마이그레이션은 바꾸지 않고 새 마이그레이션으로 전진합니다. jOOQ 생성물은 마이그레이션 DDL에서 파생되므로 직접 수정하지 않습니다. 파서 통과와 실제 SQLite 적용은 별도로 검증합니다.

새 제약을 추가할 때 기존 행이 이를 만족하는지, 테이블 재작성에서 열·FK·CHECK·인덱스·첨부 관계가 보존되는지 확인합니다. 현재 SQLite의 WAL·IMMEDIATE 쓰기 경계와 시간/ID 바인딩도 유지합니다.

## BIT 실제 코드

현재 코드 발췌: `server/src/main/resources/db/migration/V33__manuals.sql` · 42행부터. 주변 선언·호출부는 원본에서 확인합니다.

```sql
INSERT INTO attachment_new SELECT * FROM attachment;
DROP TABLE attachment;
ALTER TABLE attachment_new RENAME TO attachment;
CREATE INDEX ix_attachment_owner ON attachment(owner_type,owner_id,position) WHERE deleted_at IS NULL;
CREATE INDEX ix_attachment_blob_id ON attachment(blob_id);
```

기존 행을 새 테이블로 옮기고 이름과 두 인덱스를 다시 구성합니다. 새 테이블의 열 순서·제약·참조 보존을 함께 확인해야 하며 INSERT SELECT 한 줄만으로 모든 데이터가 보존된다고 판정하지 않습니다.

## 피해야 할 예

적용된 `V33__manuals.sql`에 새 열을 끼워 넣어 현재 DB와 맞추는 방법은 checksum과 배포 이력을 깨뜨립니다. 생성된 jOOQ 타입을 고쳐 컴파일만 통과시켜도 실제 DB에는 해당 열이 생기지 않습니다. 다음 버전의 SQL이 변경을 표현해야 합니다.

## 예외와 적용 한계

아직 공유·배포되지 않은 로컬 초기화 예외는 저장소 DB 플레이북의 명시적 조건에서만 판단합니다. 새 DB에서의 성공은 기존 데이터가 있는 업그레이드 성공을 대신하지 않습니다. 문서 검증을 위해 운영 DB를 실험 대상으로 삼지 않습니다.

## 검증 기준

`jooqCodegen`은 DDL 파싱과 생성 타입을 확인합니다. `check`에 포함된 통합 테스트는 실제 SQLite에 마이그레이션을 적용합니다. 변경의 영향에 따라 기존 버전에서의 업그레이드·행/ID·첨부 관계·제약/인덱스 보존 시나리오를 추가 확인합니다. 일반 통합 테스트 통과만으로 모든 과거 버전의 업그레이드를 검증했다고 하지 않습니다.

## 적용 절차

[마이그레이션 추가와 기존 데이터 확인](../development/fRHDxTp1C8.md)에서 SQL 추가·생성·적용·결과 검증 순서를 따릅니다.


## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/build.gradle](../../../server/build.gradle)
- [server/src/main/resources/application.properties](../../../server/src/main/resources/application.properties)
- [.agents/skills/bit-development/references/database/01-database.md](../../../.agents/skills/bit-development/references/database/01-database.md)
- [docs/deployment.md](../../deployment.md)
- [server/src/main/resources/db/migration/V33__manuals.sql](../../../server/src/main/resources/db/migration/V33__manuals.sql)

## 상세 적용 기준: 개발환경 01. 로컬 DB와 마이그레이션


DB는 SQLite 파일 하나다. 테이블과 제약의 이름 규칙, 로컬 DB를 만드는 방식, 스키마를 바꾸는 규칙, 값을 저장하는 형식을 정한다. 어떤 테이블과 열이 있는지는 `docs/06-schema.md`가 기준이다. 공유 환경(QA·운영)의 마이그레이션도 같은 규칙을 따르며, 운영 규칙(볼륨, 백업, Litestream)은 [배포와 운영](../development/tpKZ6UIr31.md)에 있다.

## 원칙

- 스키마 전체는 `V1__schema.sql` 하나에서 시작한다. V1은 `docs/06-schema.md`를 기준으로 쓴다.
- 적용된 마이그레이션 파일은 고치지 않는다. 스키마를 바꿀 때는 새 버전(V2, V3…)을 더한다.
- SQLite는 나중에 제약을 더할 수 없으므로, 기본 키·고유·외래 키·CHECK는 테이블 안에 둔다. 제약을 바꾸는 마이그레이션은 SQLite의 테이블 다시 만들기(새 테이블 → 복사 → 이름 바꾸기)로 쓴다.
- `flyway repair`로 체크섬을 덮어쓰거나 이력 행을 손으로 고치지 않는다.
- jOOQ 코드 생성은 마이그레이션 SQL을 읽는다(`DDLDatabase`). 그 파서(H2에 재생)가 읽지 못하는 것은 `-- [jooq ignore start]`·`-- [jooq ignore stop]`으로 감싼다. 감싸는 대상은 CHECK, 외래 키(H2는 아직 만들지 않은 테이블을 가리키는 외래 키를 만들지 못한다), 부분·식 인덱스다. 코드는 jOOQ의 외래 키 정보를 쓰지 않는다. 실제 적용은 통합 테스트가 SQLite 파일에 파일 전체로 검증한다.

## 이름 규칙

| 대상 | 규칙 | 예 |
| --- | --- | --- |
| 테이블 | 단수 snake_case. 인증 계열만 `iam_` 접두사 | `work_item`, `iam_session` |
| 기본 키 열 | `<table>_id varchar(10)`. 값은 애플리케이션이 `Ids.newId()`로 만드는 10자 ID(`[A-Za-z][A-Za-z0-9]{9}`, D-083). V1~V8의 ID 열은 타입 이름이 `uuid`로 남아 있고 jOOQ가 문자열로 만든다. 새 표의 ID 열과 그것을 가리키는 열은 `varchar(10)`으로 쓴다 | `work_item_id` |
| 기본 키 제약 | `<table>_pkey` | `work_item_pkey` |
| 외래 키 | `<t>_<col>_<ref>_<refcol>_fk` | `work_item_project_id_project_project_id_fk` |
| 고유 인덱스 | `ux_` + 테이블·열 이름 | `ux_work_item_project_id_number` |
| 일반 인덱스 | `ix_` + 테이블·열 이름 | `ix_board_column_project_id_position` |
| CHECK | `ck_` + 테이블·열 이름 | `ck_workspace_member_role` |
| 열거값 | `varchar` + CHECK. 값은 소문자 snake_case | `proposed`, `agent_session` |
| 본문 | Markdown 글자는 `text` | `decision.body` |

- **감사 열**: 필요한 테이블에 `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`를 둔다. 어느 테이블에 두는지는 `docs/06-schema.md`의 "감사" 표기를 따른다.
- **에이전트 표시**: API 키로 만든 기록은 사람 ID 열과 함께 키의 `agent_name`을 `*_agent` 열(`created_by_agent`, `actor_agent`, `author_agent`)에 남긴다(D-021).
- **사람이 읽는 번호**: 업무·결정·세션 번호는 ID와 별도 열(`number`)이다. 업무 키(`BIT-42`)는 저장하지 않고 `project_key`의 현재 키와 `number`로 만든다.
- **다형 대상**: `link`, `activity`, `comment`, `attachment`처럼 대상 종류가 여럿인 테이블은 `*_type` + `*_id`로 가리키고 DB 외래 키를 두지 않는다. 대상 존재 검사는 애플리케이션이 한다(D-014, D-020).

## 소프트 삭제

- 소프트 삭제는 `deleted_at` 하나로 한다.
- 고유 제약은 `WHERE deleted_at IS NULL` 부분 인덱스로 건다(지운 행이 같은 값의 새 행을 막지 않게).
- SQLite 고유 인덱스는 NULL을 서로 다른 값으로 본다. NULL이 들어갈 수 있는 열로 고유를 걸 때는 `coalesce(col, '')` 식 인덱스를 쓴다(예: `ux_folder_workspace_id_parent_name`, `ux_link_edge`).

## 저장 형식

SQLite는 열 타입을 강제하지 않으므로, 같은 열의 값은 서버가 쓰는 한 형식으로만 둔다. 비교와 정렬이 글자 순서로 일어나기 때문이다.

| 열 | 형식 |
| --- | --- |
| 순간(`timestamptz`, Java `Instant`) | `2026-10-02T03:04:05.678901Z`. UTC, 소수 6자리 고정. `InstantTextBinding`이 쓰고, 스키마의 기본값도 같은 형식을 만든다. 읽을 때는 다른 형식도 받는다 |
| 벽시계 시각(`timestamp`, `LocalDateTime`) | `2026-10-05 10:00:00.0`(jOOQ 기본) |
| 날짜 | `2026-10-05` |
| 참거짓 | `1`·`0` |
| ID | 글자 10자, 대소문자 구분 |
| JSON(`jsonb` 타입 이름) | JSON 글자 |

테스트나 손으로 쓰는 SQL도 순간 값은 `InstantTextBinding.text(…)`나 `strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z'`로 쓴다. `CURRENT_TIMESTAMP`(`2026-10-02 03:04:05`)나 `Instant.toString()`은 소수 자릿수가 달라 비교가 어긋난다.

## 연결과 동시성

`application.properties`의 연결 속성으로 Rails 8과 같은 기본값을 쓴다. WAL(쓰는 동안에도 읽기 가능), `synchronous=NORMAL`, `busy_timeout=5000`(앞선 쓰기를 5초까지 기다림), 외래 키 켜기, 모든 트랜잭션 `BEGIN IMMEDIATE`(시작할 때 쓰기 잠금을 잡아 도중 충돌이 없음)다. 그래서 행 잠금(`FOR UPDATE`, `SKIP LOCKED`)은 쓰지 않는다. 프로젝트별 번호(`project.last_*_number`)를 증가시켜 받는 것도 이 쓰기 잠금 안에서 처리한다.

트랜잭션 안에서는 메일·웹훅 후처리·Git 호스팅 API·문서 텍스트 변환·PDF 생성 같은 느린 외부 호출을 하지 않는다. SQLite 오류는 `SqliteExceptionTranslator`가 Spring 예외(중복 키, 무결성 위반, 잠금 실패)로 바꾼다.

## 로컬 DB 구성

- DB 파일은 환경 변수 `DB_PATH`(기본 `./data/bit.db`, 서버 디렉터리 기준이라 `server/data/bit.db`, Git 제외)다. 서버가 처음 켤 때 폴더와 파일을 만들고 Flyway가 V1을 적용한다. 도커로 띄우면 데이터 볼륨 하나(`/var/lib/bit`)에 DB와 로컬 파일 저장소가 함께 있다.
- baseline 설정(`FLYWAY_BASELINE_ON_MIGRATE`)의 기본값은 false이며 QA·운영 설정에는 넣지 않는다.
- 데이터와 덤프는 Git에서 제외된 `server/data/`, `.tmp/db-backup/`에만 둔다. 계정 정보와 업무 기록이 들어 있으므로 커밋하거나 공유 채널에 올리지 않는다.

## 로컬 DB를 다시 만들 때

1. 보존할 DB 파일을 복사해 둔다(서버를 멈추고 `bit.db`와 `-wal`·`-shm` 파일을 함께).
2. DB 파일을 지운다.
3. `./gradlew bootRun`(Windows는 `.\gradlew.bat bootRun`)을 실행해 Flyway가 스키마를 만들게 하고, 서버를 멈춘다.
4. 필요한 데이터를 넣는다.
5. jOOQ 생성과 서버 검사(`./gradlew check`)를 다시 실행한다.

## 검토한 대안

| 안 | 기각 이유 |
| --- | --- |
| PostgreSQL | 이미지 하나·볼륨 하나로 끝나는 단일 배포가 되지 않는다. 셀프호스팅 단일 서버, 쓰기가 적은 규모에서는 SQLite로 충분하다. |
| 순간 값을 jOOQ 기본 형식으로 두기 | 소수 자릿수와 구분자가 값마다 달라져 글자 비교·정렬이 어긋난다. |
