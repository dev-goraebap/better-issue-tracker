# T-004. 프로젝트·보드·작업항목 (Codex 작업 지시서)

> 작성: 2026-10-22. 선행: T-003 `eeb31ce`. 상태: 정책 확정·구현 진행.
> 사용자가 남은 MVP의 지시서 작성·권장안 채택·구현·검증 진행을 위임했다. D-009·D-011·D-021·D-037·D-038·D-047~D-049를 따른다.
> bit-architecture / bit-backend / bit-database / bit-api-contract / bit-frontend를 적용한다.

## 목표와 범위

워크스페이스 안에서 프로젝트를 만들고, 보드·목록·백로그에서 실제 작업항목을 생성·수정·이동·보관한다. 세션과 API 키가 동일한 현재 멤버십·업무 규칙을 사용한다. 과거 프로젝트 키로도 같은 작업을 찾는다.

포함: 프로젝트 CRUD·키 별칭·보관/해제, 컬럼 CRUD·순서, 작업 CRUD·담당자·우선순위·트리거·날짜·순서·보관/해제, 조회 필터·커서 페이징, 보드/목록/백로그/일정 타임라인과 상세 화면, My Tasks 실제 조회. 삭제는 소프트 삭제다.

제외: 결정·세션·링크·댓글·파일·라벨 CRUD·활동 타임라인·Git·MCP는 후속 지시서에서 구현한다. 이름이 같은 작업 일정 타임라인과 엔티티 연결 타임라인을 혼동하지 않는다. 사용자 정의 필드·시간 기록·스프린트·실시간 공동 편집은 MVP 밖이다. 기존 개발 DB·적용된 V1/V2는 보존한다.

## 기준 소스

- docs/02-domain-model.md, docs/03-user-flows.md, docs/05-ui.md, docs/06-schema.md 3·4절.
- WorkspaceFacade / WorkspaceService / WorkspaceHttpAuthorizationFilter: 현재 공간 접근 계약. 다른 모듈의 내부 Service/Repository를 호출하지 않는다.
- CurrentUser, SecretTokens, SqliteExceptionTranslator, InstantTextBinding: 인증 주체·에이전트 표시·SQLite·시간 형식 재사용.
- WorkspaceShell / PageFrame / CompactDialog / NavIcon: 기존 Inset·Split·모바일 셸과 Lucide, 옅은 오버레이 경계 유지.

## 확정한 권장 정책

| 항목 | 적용 정책 | 이유·기각 대안 |
|---|---|---|
| 역할 | owner/admin 프로젝트·컬럼 설정과 프로젝트 삭제. owner/admin/member 작업 생성·수정·보관·소프트 삭제. viewer 조회. 세션/Bearer 동일 | 인스턴스 관리자 우회·작성자만 수정 제한은 두지 않음 |
| 키 | trim·대문자화 후 [A-Z0-9]{2,10}. workspace의 모든 현재/과거/삭제 프로젝트 키에서 유일 | 과거 커밋 참조를 다른 프로젝트에 연결하지 않음 |
| 재사용 | 자기 프로젝트의 옛 키로 돌아가면 해당 행을 current로 승격. 현재 키 재설정은 멱등 | 별칭 중복 삽입·별칭 삭제 금지 |
| 생성 | 프로젝트+현재 키+할 일/진행 중/검토 중/완료 컬럼을 원자 생성. 마지막 컬럼만 final | 반쪽 프로젝트·비어 있는 기본 보드 방지 |
| 번호 | 1부터 프로젝트 카운터를 같은 쓰기 트랜잭션에서 증가. 키 변경·삭제·보관 뒤에도 재사용 금지 | MAX(number)+1 및 삭제 번호 재활용 금지 |
| 보드 | 상태는 board_column_id만. NULL=백로그. 완료 컬럼 진입 시 closed_at, 나오면 NULL | 상태 문자열 이중 저장 금지 |
| 컬럼 편집 | final 변경 시 해당 컬럼의 모든 작업 closed_at을 원자 갱신. 컬럼은 최소 1개, final은 최소 1개 유지. 작업이 남으면 명시한 목적 컬럼 또는 백로그로 이관한 뒤 삭제 | 묵시적 작업 삭제 금지 |
| 순서 | 명시적 순서 배열/앞뒤 이웃 ID로 검증한 뒤 서버가 순서를 재계산. 대상은 같은 프로젝트·컬럼으로 제한. 동률은 UUID로 정렬 | 클라이언트 임의 위치값·무한 분수 누적 회피 |
| 보관 | 프로젝트 보관 시 조회는 유지하고 하위 쓰기는 거부(복원은 허용). 작업 보관은 기본 목록에서 제외, 명시 필터로 조회·해제 | 완료와 보관은 별개, 하위 행 archived_at 일괄 덮어쓰기 금지 |
| 삭제·복원 | 삭제는 deleted_at. 삭제된 부모의 자원은 404. 작업 복원은 활성 프로젝트에서만, 원 컬럼이 삭제됐으면 백로그로. 프로젝트 복원 시 자식의 개별 삭제/보관 상태 보존 | 영구 삭제 API·복원 시 자식 상태 일괄 초기화 금지 |
| 담당자 | 현재 워크스페이스 활성 멤버만 지정, NULL로 해제. 멤버 탈퇴 후 과거 담당 표시 유지하되 새 지정 거부 | workspace→workitem 역방향 참조/외래 키 연쇄 삭제 금지 |
| 경쟁 | project/workitem/column 편집에 version 사용, 불일치는 409. 같은 완료 컬럼으로 재이동은 closed_at 유지 | 조용한 덮어쓰기·재시도마다 완료 시각 변경 금지 |
| 입력 | 프로젝트명 1~64, 설명 최대 20,000, 제목 1~200. priority low/medium/high/urgent 또는 NULL. trigger request/finding/external/improvement/planned 또는 NULL. 날짜 ISO LocalDate, 시작≤마감 | nullable 필드의 누락=유지, 명시적 null=초기화를 PATCH 계약에서 구분 |

## 모듈·트랜잭션

- project→workspace, workitem→project/workspace 공개 루트 계약만 의존. project가 workitem 내부를 참조하지 않는다.
- 프로젝트 현재 키·별칭 해석/번호 발급은 ProjectFacade 책임. 업무 참조 해석은 해당 모듈 Facade가 책임진다. UUID와 사람이 읽는 키를 API에서 명확히 구분한다.
- WorkspaceFacade에 업무 쓰기 및 현재 멤버 검증 공개 계약을 추가한다. workspace 내부 저장소를 다른 모듈에 노출하지 않는다.
- 프로젝트 생성의 키·기본 컬럼, 번호 발급+작업 생성, 컬럼 변경/삭제+작업 이관은 원자성 예외로 같은 쓰기 트랜잭션에 둔다. project가 제공한 컬럼 변경용 Spi를 workitem이 구현해 참조 방향을 단방향으로 유지한다. DB 잠금 안에서 인가를 다시 확인한다.
- HTTP 접근 사전 검사와 Facade의 최종 업무 인가 모두 유지. 비멤버·다른 공간·삭제 리소스는 404, 같은 공간의 역할 부족은 403. must_change·CSRF·Bearer 정책 유지.
- created_by_agent/updated_by_agent를 CurrentUser에서 기록한다. 외부 호출은 쓰기 트랜잭션 밖이다.

## DB

새 V3__project_work_item.sql에 project, project_key, board_column, work_item을 만든다. docs/06-schema.md의 열·감사 규칙 및 CHECK/FK/부분 인덱스 규칙을 지키고 실제 추가한 version 열 등은 문서에 반영한다. FK는 프로젝트와 컬럼의 소속 일치까지 보장하도록 복합 키를 고려한다. project_key는 삭제 여부와 무관하게 예약한다. 작업 number는 삭제 후에도 유일하다.

생성 스키마에는 향후 decision/session 카운터를 포함한다. work_item_label은 라벨 구현 때 새 마이그레이션으로 추가한다. jOOQ 생성 뒤 실제 SQLite에 V1→V2→V3 적용·제약 검사·integrity/foreign_key_check를 실행한다.

## REST 계약

모든 경로는 /api/v1/workspaces/{workspaceId} 아래다. 변경은 표준 Problem 응답·추적 ID, 생성은 201 Location, 삭제 204, 페이지는 기존 cursor 계약을 따른다.

- GET/POST /projects — status(active/archived/deleted), q, cursor, size. 삭제 필터는 관리자만.
- GET/PATCH/DELETE /projects/{projectId}; POST /projects/{projectId}/archive, /unarchive, /restore.
- GET/POST /projects/{projectId}/columns; PATCH/DELETE /projects/{projectId}/columns/{columnId}. DELETE의 moveTo 지정(백로그는 명시적 값), POST /columns/reorder.
- GET/POST /projects/{projectId}/work-items; GET/PATCH/DELETE /projects/{projectId}/work-items/{workItemId}.
- POST 작업 하위 /move, /archive, /unarchive, /restore. 이동은 targetColumnId(NULL=백로그), 이웃 및 expectedVersion을 받는다.
- GET /work-items/by-ref/{ref} — 현재 키·별칭 + number 해석, 현재 키와 UUID 반환.
- GET /my-tasks — 본인 담당 작업, 현재 접근 가능한 활성 프로젝트만, 커서 페이징.
- 필터: column(백로그 포함), assignee, priority, triggerType, q, archived, closed, 날짜 범위. 커서는 공간·프로젝트·필터·정렬과 결합하며 다른 조건에서 거부한다. SQL 페이징, 무제한 전체 목록 금지.
- 오류: PROJECT_KEY_CONFLICT, PROJECT_ARCHIVED, VERSION_CONFLICT, COLUMN_REQUIRED, FINAL_COLUMN_REQUIRED, COLUMN_TARGET_INVALID, ASSIGNEE_NOT_MEMBER, DATE_RANGE_INVALID 등 의미 있는 코드. 409 경쟁과 400 입력 오류를 구분한다.

## 화면

- 공간의 프로젝트 목록·생성 버튼과 실제 사이드바 목록. 보관 필터·프로젝트 설정에서 이름/키/설명·보관·복원·삭제. 권한별 동작 표시와 서버 거부 모두 구현한다.
- /w/{workspaceId}/p/{projectId}: 보드/목록/백로그/타임라인 탭. 업무 상태·필터는 URL, 서버 데이터는 Query, 폼 초안은 로컬 state.
- 보드 컬럼마다 카드·개수·새 작업. 끌기 외에도 키보드로 가능한 이동 메뉴와 순서 버튼 제공. 새 DnD 의존성은 실제 필요할 때만 검토.
- 일정 타임라인은 시작/마감 날짜가 있는 작업을 표시하고 미지정 항목은 별도 목록. 연결 그래프 기능으로 가장하지 않는다.
- 작업 상세는 UUID 경로, 옛 키 참조 링크는 해석 후 현재 경로로 이동. 제목·본문·담당·우선순위·트리거·기간·상태·보관을 편집한다.
- 모바일 프로젝트 하단 메뉴는 보드/목록/백로그/더보기. 일정·설정·공간 전환은 더보기. 기존 워크스페이스 메뉴로 돌아갈 수 있어야 한다.
- 페이지 공통 헤더 생성 동작, 탭 행의 필터, 적용 조건 행, 카드 밖 하단 영역 유지. 오류/로딩/빈 상태와 쓰기 실패 초안 유지. 네트워크 쓰기 자동 재전송 금지.

## 반증 가능한 완료 기준

| ID | 검사 |
|---|---|
| PR-01 | 생성 실패 시 프로젝트·키·컬럼 모두 롤백. 정상 생성 4개 컬럼·final 1개 |
| PR-02 | 서로 다른 공간 같은 키 허용, 같은 공간 현재·별칭·삭제 프로젝트 키 충돌 409. 자기 별칭 복귀·현재 키 멱등 |
| PR-03 | 키 변경 뒤 옛 ref와 현재 ref가 같은 UUID/number로 해석. 다른 공간 조회 404 |
| PR-04 | 동시 작업 생성에서 번호 중복 없음. 중간 실패 롤백, 삭제 후 번호 재사용 없음 |
| PR-05 | 세션/Bearer owner/admin/member/viewer 실제 업무 쓰기. 비멤버·다른 공간 ID·must_change·CSRF 우회 거부 |
| PR-06 | 다른 프로젝트 컬럼/작업/이웃 혼입 거부. final 진입·재이동·재개방 시각 일관 |
| PR-07 | 컬럼 final 변경·삭제 이관 중 강제 실패 롤백. 최소 컬럼/final 제약과 충돌 검증 |
| PR-08 | 보관 프로젝트 하위 쓰기 거부, 복원 뒤 자식 개별 삭제·보관 유지. 작업 복원·백로그 fallback |
| PR-09 | 담당자 현재 멤버 검증·탈퇴 경쟁. 무관 공간 계정 노출 없음 |
| PR-10 | version 동시 편집 하나만 성공. 키·순서 경쟁 뒤 유일성·순서·최종 상태 일관 |
| PR-11 | 모든 필터·커서 경계·다른 필터 커서 거부·SQL 페이징·권한 변경 즉시 반영 |
| PR-12 | 390/1440px 보드/목록/백로그/일정/상세, 키보드 이동, 옅은 팝오버, Inset/Split·프로필 유지 |
| PR-13 | gradlew check, OpenAPI 내보내기→타입 생성, npm run check 전체 통과. 실제 SQLite V3·기존 인증 회귀 유지 |
| PR-14 | Docker 이미지 빌드·healthy·V2 볼륨 업그레이드·동일 볼륨 재생성 후 프로젝트/작업 보존 |

## 마무리와 다음 단계

실행 결과·수동 미확인 범위를 이 문서에 기록하고 AGENTS/스키마/API/결정 기록을 실제 구현과 맞춘다. 단위별 검증을 마치면 커밋한다. 이어서 T-005 결정·세션·범용 링크/활동·댓글, T-006 파일·문서함·변환, T-007 Git 저장소·Markdown/PDF·웹훅, T-008 MCP·맥락 묶음, T-009 검색·Inbox·운영/통합 검증 순서로 지시서를 구체화한다. 범위는 기존 MVP 문서 안에서 유지한다. 선택 외부 기능의 실제 연결은 설정이 있을 때만 검증하고 미설정을 성공으로 기록하지 않는다.

## 구현 진행 기록 — 2026-10-23

### 완료한 기반 작업

- V3 프로젝트·키·보드 컬럼·작업 테이블과 복합 소속 FK, 키 영구 예약·현재 키 부분 인덱스. 생성/수정/삭제 감사와 에이전트 표시, version, bigint 번호 카운터.
- Project / ProjectKey / BoardColumn / WorkItem 도메인. 완료 시각 멱등성·재개방, 잘못된 날짜/입력의 부분 변경 방지, 삭제 컬럼 복원 시 백로그 이동 규칙.
- ProjectFacade, ProjectService, ProjectQueryService 및 jOOQ 저장소. 생성+키+컬럼 원자성, 키 변경/자기 별칭 복귀, 프로젝트 보관·삭제·복원, 현재 역할 검사·번호 발급·커서 페이징.
- 프로젝트·컬럼 REST 경로와 MVC 바인딩 전 권한 필터. 세션/Bearer 공통 업무 인가와 명시적 Bearer 업무 경로 허용. 새 요청 스키마 이름을 CreateProject/UpdateProject 등으로 구분해 기존 Workspace Create와 충돌하지 않게 했다.
- OpenAPI 내보내기와 클라이언트 생성 타입 갱신. 공용 감사 객체와 읽기 DTO는 불변 값으로 노출한다.

### 실행한 검사

| 검사 | 결과 |
|---|---|
| `gradlew.bat --max-workers=2 spotlessApply check` | 성공. 단위·계약·아키텍처 22개 + 실제 SQLite/HTTP 통합 37개. Spotless·Checkstyle·SpotBugs 통과 |
| V2→V3 격리 SQLite 파일 업그레이드 | 기존 사용자/비밀번호 해시 보존. 삭제 프로젝트의 키 예약·현재 키 유일성·다른 프로젝트 컬럼 FK 거부, integrity_check=ok / foreign_key_check 오류 없음 |
| 실제 프로젝트 서비스/저장소 | 생성 중 강제 컬럼 삽입 실패 전체 롤백, 8개 동시 번호 발급 중복 없음, 외부 트랜잭션 실패 시 번호 증가 롤백, 별칭·보관·삭제/복원·현재 역할 재검사 |
| 실제 HTTP | 로그인→프로젝트 생성/조회/수정, stale version 409, API 키 프로젝트 생성·agent provenance, viewer의 세션/Bearer 설정 쓰기 403, 비멤버 404, 권한 검사 후에만 입력 바인딩. null 컬럼 순서 입력 400 |
| 커서 | 다음 조각 중복 없음, 검색 조건이 다른 커서 거부, 기본 목록의 삭제 제외·명시적 삭제 목록 조회 |
| `exportOpenApi` → `npm run api:generate --prefix client` | 요청/응답 스키마와 생성 타입 동기화. CreateProject.key가 존재하고 Workspace Create와 섞이지 않는 계약 검사 |
| `npm run check --prefix client` | 컴포넌트/FSD·9개 테스트·타입·빌드 성공 |

### 아직 남은 것

T-004 완료 상태가 아니다. WorkItemRepository/Service/REST·필터/My Tasks·참조 해석, ColumnWorkItemSpi 실제 이관/완료 재분류 구현과 원자성 검증, 보드/목록/백로그/일정/상세 화면, 모바일/키보드/두 레이아웃 확인, Docker V2→V3·동일 볼륨 재생성 검증을 이어서 진행한다. 컬럼 변경 경로의 등록 자체를 이관 기능 완료로 계산하지 않는다. 기본 개발 DB를 초기화하거나 기존 배포 마이그레이션을 수정하지 않았다. T-004 변경은 구현 중이며 아직 커밋하지 않았다.

## 작업항목 서버 구현·검증 — 2026-10-23

- WorkItemRepository/Service/QueryService/Facade/REST와 MVC 바인딩 전 대상 인가를 연결했다. 생성·PATCH·이동·보관/해제·소프트 삭제/복원·현재/별칭 참조·My Tasks·필터·커서 페이지를 구현했다.
- ColumnWorkItemSpi를 실제 구현했다. final 변경과 작업 완료 시각 재분류, 컬럼 삭제와 살아 있는 작업의 이관이 같은 쓰기 트랜잭션에서 롤백된다. 보관 상태를 보존하고, 삭제 작업은 원 컬럼을 보존했다가 복원 시 백로그로 돌린다(D-050).
- `GET /projects/{projectId}/work-items/counts`는 목록과 같은 필터의 전체 일치 행을 컬럼별로 집계한다. 컬럼이 비면 집계 행은 생략하며 화면에서 0으로 표시한다. nullable columnId는 백로그다. 일반 목록의 정렬은 createdAt/position + ASC/DESC, My Tasks는 createdAt만 허용한다. from/to는 마감일 범위다.
- 컬럼 PATCH도 필드 누락=유지·명시적 color null=비우기를 적용했다. 명시적 isFinal null은 거부한다. 생성/수정 요청의 nullable 값과 항상 반환되는 응답 필드를 OpenAPI에 표시하고, OpenAPI 3.1 nullable enum에는 실제 null도 enum에 포함해 기계 계약을 일치시켰다.

| 검사 | 결과 |
|---|---|
| `gradlew.bat --max-workers=2 spotlessApply exportOpenApi check` | 성공. 단위·계약·아키텍처 22개 + 실제 SQLite/HTTP 통합 53개(총 75개). Spotless·Checkstyle·SpotBugs 통과 |
| 새 작업 통합 16개 | 완료/재개방·반복 이동 시각 유지, 옛 키 해석, 실패한 생성의 번호 롤백, 8개 동시 생성·동시 수정 1건만 커밋, 다른 프로젝트 컬럼/이웃/항목 거부 |
| 컬럼 트랜잭션 | final 변경/이관 중 강제 DB 실패 전체 롤백, 컬럼 삭제 대 이동 경합 후 삭제 컬럼에 살아 있는 작업 없음, 보관 작업 이관·삭제 작업 백로그 복원, 마지막 final 유지 |
| 현재 권한 | owner/admin/member 실제 쓰기·viewer 조회/쓰기 거부, 세션/Bearer 동일, 제거된 멤버 지정 거부·과거 담당 보존, 인스턴스 관리자 우회 없음, must_change의 오래된 주체 값 우회 거부 |
| 검색·페이징·집계 | 날짜·우선순위·트리거·담당자·완료·보관/삭제 필터, 위치 동률의 커서 경계, 검색 조건이 다른 커서 거부, 두 공간에 속한 같은 사용자의 My Tasks/커서/집계 격리, 페이지 크기와 무관한 집계 |
| 실제 HTTP | Bearer 생성·에이전트 기록, nullable PATCH·명시적 이동 대상 필수, 컬럼 색상만 변경/비우기 시 final 유지, 권한 부족 403/없는 대상 404를 입력 바인딩 전에 적용 |
| API·클라이언트 | OpenAPI/생성 타입 동기화, nullable 필드·enum·이름 충돌 계약 검사, `npm run check --prefix client` 성공(9개 검사·타입·빌드) |

이 단계의 서버 기능은 분리 커밋한다. T-004 전체 완료는 아니다. 프로젝트 목록·생성/설정, 사이드바, 보드/목록/백로그/일정/상세·My Tasks 화면과 모바일/키보드/Inset·Split 확인, Docker V2→V3·동일 볼륨 재생성 검증이 남았다. 이전 진행 기록의 '남은 서버 구현' 항목은 이 기록으로 갱신한다. MCP 서버·결정/세션·링크·문서함·Git 기능은 후속 작업이다.

## 화면 구현·검증 — 2026-10-23

- 프로젝트 목록/검색/생성/보관·삭제 목록·복원, 실제 사이드바/홈, 프로젝트 정보와 컬럼 생성·수정·순서·삭제 이관 설정을 연결했다.
- 보드의 컬럼별 커서 페이지와 전체 집계, 카드 이동·위아래 순서, 목록/백로그/일정/작업 상세와 편집·보관·삭제·복원, 담당자 전체 페이지 선택, My Tasks를 실제 API에 연결했다. 옛 키는 `/w/{workspaceId}/r/{reference}`에서 UUID 상세로 해석한다.
- 조회 조건은 URL, 폼은 독립 초안과 시작 version을 유지한다. 쓰기는 자동 재전송하지 않는다. 라우트 guard가 공유한 읽기를 이전 화면의 observer 해제로 취소하는 상황은 한 번만 다시 읽어 오류 화면으로 번지는 것을 막았다.
- D-051의 모바일 프로젝트 메뉴·공통 날짜 필드·Markdown 입력을 적용했다. 헤더 접기·인셋/분할형·프로필·카드 밖 하단 Agent 영역을 유지했다.

| 실행한 확인 | 결과 |
|---|---|
| 클라이언트 `npm run check --prefix client` | 컴포넌트 규칙·Steiger·13개 테스트·타입·프로덕션 빌드 성공. 기존 9개 + 날짜 입력/서울 날짜 경계 2개 + 실제 Query observer 취소/재시도 제한 2개 |
| 격리 SQLite/서버/화면 | `.tmp/t004-qa-data` DB와 18082 API/4403 Vite 사용. 별도 계정·공간·프로젝트·컬럼·작업을 만들었으며 기존 개발 DB에 검증용 항목을 넣지 않음 |
| 실제 화면 쓰기 | 프로젝트 생성→기본 4개 컬럼, 작업 생성→다이얼로그 닫힘→상세 이동, 컬럼 추가→설정 갱신, Enter/방향키/End로 완료 컬럼 이동→상태/집계 반영 |
| 조회 | 제목 필터→URL·추가 조건 행·집계·카드 반영, 조건 지우기, 백로그, 일정의 날짜/미지정 작업 분리, 내 담당 작업 목록, Markdown 본문 |
| 1440×960 | 밝은 인셋·분할형과 어두운 인셋 보드, 하단 상태 영역·사이드바·프로필 유지 |
| 390×844 | 보드 내부 가로 스크롤, 목록 내부 가로 스크롤, 긴 제목 상세/편집, 프로젝트 더보기/워크스페이스 복귀, 중첩 날짜 시트의 오늘 선택·닫기. 페이지 전체 scrollWidth=390 |
| 개발 서버 | 4402 Vite/8080 API 재기동. 기존 개발 DB가 V2→V3로 정상 업그레이드됨 |

### 남은 완료 게이트

- Docker Desktop을 실행했으나 Docker 엔진 API가 응답하지 않았다. 이미지 빌드·healthy·격리 V2 볼륨 업그레이드·동일 볼륨 재생성(PR-14)은 아직 실행하지 못했다. 이전 작업의 Docker 성공을 T-004 성공으로 재사용하지 않는다.
- 마우스 드래그 이동, 모든 역할의 화면 동작, 실패/충돌 초안 유지와 대량 데이터의 모든 페이지를 브라우저에서 전부 실행하지 않았다. 업무 권한·경쟁·필터·커서는 서버 75개 자동 검사 범위를 참고한다. 키보드 목적 컬럼 이동은 실제 실행했다.
- 따라서 T-004 전체 완료 표시는 보류한다. 검증한 UI 단위는 분리 커밋하고 Docker 게이트와 함께 후속 도메인 구현을 이어간다. 기존 T-003/T-002의 미실행 수동 확인을 완료로 바꾸지 않는다.
