# T-005. 결정·세션·링크·활동·댓글 (Codex 작업 지시서)

> 작성: 2026-10-23. 선행 코드: T-004 서버 `33c26f8`, 화면 `17ccc6f`. 상태: 정책 확정·기반 구현 진행.
> 남은 MVP의 권장안·구현·검증·커밋은 D-047의 위임을 따른다. T-004 Docker 게이트는 2026-10-23 검증 완료했고 상세 범위는 T-004 지시서에 있다. T-005의 Docker V4 게이트는 별도다.
> bit-architecture / bit-backend / bit-database / bit-api-contract / bit-frontend 적용. D-011·D-012·D-014·D-020·D-021·D-037·D-051~D-055 기준.

## 목표와 범위

세션 요약에서 결정이 나오고 작업항목으로 이어지는 실제 흐름과 역추적의 기반을 만든다. REST와 공개 Facade에서 같은 업무 인가를 사용하고 화면은 그 위에 구성한다.

포함: 결정 CRUD·확정·대체·이행 진행 계산, 세션/참석자 CRUD와 세션+결정+링크 일괄 기록, 범용 링크 생성·해제·양방향 조회, 작업/결정/세션의 댓글과 활동 기록, 프로젝트 최근 기록 요약, 작업 상세의 연결/활동 영역. 입력·버튼 크기와 모서리는 D-052를 유지한다.

제외: 파일·산출물 실체(T-006), Git/code_ref 실체(T-007), MCP 전송/도구와 깊이 있는 trace·맥락 묶음(T-008), 검색·Inbox·라벨 및 통합 운영 게이트(T-009). 미구현 대상의 resolver를 가짜로 성공시키지 않는다. 관리 문서·결재·위키는 MVP 밖이다.

## 기준 소스

- docs/02-domain-model.md, docs/03-user-flows.md A/C/D/E, docs/05-ui.md, docs/06-schema.md 5·8절, docs/07-mcp.md의 결정/세션/연결/댓글 도구.
- ProjectFacade의 현재 인가·별칭·번호, WorkspaceFacade의 업무 쓰기·현재 멤버 확인, WorkItemFacade의 대상 접근 계약.
- Audit / InstantTextBinding / ListParams / Keyset / SqliteExceptionTranslator, MVC 바인딩 전 권한 필터, 세션/Bearer 동일 규칙.
- WorkspaceShell / PageFrame / CompactDialog / 공통 날짜 필드, URL 조건·Query·독립 초안, 생성 타입.

## 확정 정책

| 항목 | 권장안 채택 |
|---|---|
| 역할 | owner/admin/member가 업무 생성·수정·확정·대체·댓글/링크 쓰기. viewer 조회. 인스턴스 관리자 우회 없음. 프로젝트 보관/삭제의 기존 쓰기 차단 유지 |
| 결정 번호 | 프로젝트의 last_decision_number를 생성과 같은 트랜잭션에서 증가. D-001부터 표시(세 자리 최소 폭, 1000 이상 자르지 않음). S-001도 동일. 번호는 삭제 후 재사용하지 않음 |
| 참조 | UUID 기본, 프로젝트 안 D-007/S-003 및 현재/별칭 프로젝트 키를 붙인 참조 해석. 응답은 현재 키와 UUID. 결정·세션 소유 Facade가 해석 |
| 상태 | proposed→accepted→superseded 단방향. acceptedAt/supersededAt 최초 시각 유지. 대체할 결정은 같은 프로젝트의 다른 accepted 결정. 새 결정→옛 결정 supersedes 링크와 옛 상태 변경 원자 처리 |
| 결정 수정/삭제 | 제안·확정 결정의 본문 정정은 version 검사와 변경 이력으로 보존. superseded는 읽기 전용. 삭제/복원은 proposed만 허용하며 확정 판단을 없애려면 대체 흐름을 사용. 삭제는 soft delete |
| 대체 그래프 | 옛 결정당 현재 대체 결정 최대 하나. 자기 대체·순환·서로 다른 프로젝트·proposed/superseded 대체자 거부. supersedes 링크는 결정 상태 전이로만 만들고 일반 unlink로 지우지 않음 |
| 이행 진행 | 활성 derives_from(work_item→decision) 링크의 서로 다른 살아 있는 작업 중 closedAt이 있는 수/전체 수. 보관 작업은 포함, 삭제 작업/프로젝트는 제외. 작업 없음은 0/0과 applicable=false, 별도 상태 저장 안 함 |
| 세션 | type meeting/agent_session, title, occurredAt(UTC Instant), summary Markdown, 참석자 스냅샷. 표시 시간대는 화면의 기기 설정, API는 오프셋 있는 일시만 수신 |
| 참석자 | kind user/agent/guest. user는 현재 공간 멤버 ID를 검증하고 서버 이름 스냅샷, 그 외는 이름만. 탈퇴 뒤 과거 이름 유지. 계정을 새로 만들거나 이메일을 노출하지 않음 |
| 일괄 기록 | 세션+참석자+결정 최대20개+출처 링크+관련 작업 링크를 한 트랜잭션에서 생성. 실패 시 번호 카운터까지 전부 롤백. 관련 작업은 같은 프로젝트, session_record↔work_item relates_to 연결 |
| 입력 | 제목 1~200, 결정 body 1~20000, rejectedAlternatives 최대20000(없으면 null), triggerType 기존 다섯 값 또는 null, 세션 summary 1~100000. 참석자≤100/관련 작업≤100, 중복 user/작업은 정규화. 댓글 1~20000. PATCH 누락=유지/null=허용 nullable 필드 비우기 |
| 댓글 | 작업·결정·세션·향후 산출물 대상. member 이상 작성, 본인만 본문 수정. 본인 또는 owner/admin 삭제, 복원도 같은 규칙. 다른 사람의 댓글을 관리자가 고쳐 쓰지 않음. version/감사/에이전트 보존 |
| 삭제 대상 | 링크·활동·댓글 행은 보존하되 대상/부모가 삭제되면 조회에서 숨김. 복원하면 다시 표시. 삭제된 상대를 제목/건수/커서에서 유출하지 않음 |

## 링크·활동 모듈과 의존 방향 (D-053)

link 모듈이 Link/Comment/Activity 애그리거트와 공개 LinkFacade·CommentFacade·ActivityFacade, TargetSpi, TargetRef, TargetType, TargetChangedEvent를 소유한다. 업무가 작고 모두 다형 대상 인가를 공유하므로 별도 범용 플랫폼을 만들지 않는다.

- link는 다른 업무 Facade를 직접 참조하지 않고 TargetSpi 구현 목록을 받는다. workitem/decision/session은 자기 application에 resolver를 구현하며 저장소와 ProjectFacade로 대상·소속·현재 인가를 확인한다. 향후 artifact/coderef도 같은 방식으로 확장한다.
- resolver는 LinkFacade를 호출하거나 이를 주입받은 업무 Service를 참조하지 않는다. 같은 모듈의 독립 access helper/저장소를 사용해 Spring 빈 순환도 막는다. module 단방향 참조를 ArchUnit으로 검사한다.
- decision→link/project/workspace, session→decision/link/project/workspace, workitem→link/project/workspace. link는 대상 resolver의 공개 계약만 알고 각 모듈 내부를 참조하지 않는다.
- Activity는 각 업무 변경의 TargetChangedEvent를 커밋 전 동기 처리하여 같은 트랜잭션에 저장한다. 이력 저장 실패도 업무 전체 롤백. 외부 호출·별도 비동기 큐는 없음. 기존 T-004 행의 과거 이력을 만들어 넣지 않는다.
- 공개 Facade로 REST/MCP가 같은 업무 규칙을 호출한다. Controller 전용 로직·다른 모듈 내부 Service 직접 호출 금지. 일괄 기록은 SessionService public 메서드가 조율하는 명시적 다중 애그리거트 예외다.

## 링크 무결성과 조회 (D-054)

- 타입은 work_item/decision/session_record/artifact/code_ref. 생성 때 양쪽이 같은 workspace인지, 모두 존재하고 현재 읽기/쓰기 가능한지 잠금 안에서 검사한다. 수동 링크의 서로 다른 프로젝트는 같은 공간에서 양쪽 접근 가능하면 허용한다.
- relation은 derives_from, implements, revises, based_on, supersedes, blocks, relates_to, subtask_of. derives_from은 decision→session_record 또는 work_item→decision, implements는 code_ref→work_item, revises/based_on은 work_item/decision→artifact, supersedes는 decision→decision. 나머지 세 종류는 work_item↔work_item이며 세션의 관련 작업에 한해 relates_to(session_record↔work_item)도 허용한다.
- relates_to는 방향을 정규화해 역순 중복을 막는다. 자기 링크 거부, 활성 동일 edge는 멱등이며 같은 ID 반환. 해제 후 재연결은 새 행으로 남겨 과거 이력을 보존한다.
- blocks/subtask_of/supersedes는 순환 금지. subtask_of는 작업당 부모 하나. 순환 검사는 숨겨진 대상을 포함한 비삭제 edge 전체를 고려해 복원 뒤 순환도 막는다.
- artifactVersionId와 anchor는 관리 문서 전까지 null만 허용(D-019). 미구현 resolver 대상은 404이며 가짜 존재를 만들지 않는다.
- 목록은 SQL 검색·정렬·size+1 keyset으로 읽고, 삭제 대상 필터도 SQL에 포함한다. 한 페이지를 읽은 뒤 Java에서 숨겨서 빈 페이지/잘못된 cursor를 만드는 방식은 금지. 검색/집계가 필요한 교차 모듈 SQL은 조회 구현체에 한정하고 업무 쓰기는 공개 계약으로만 수행한다.
- 활동 payload에는 허용한 변경 필드만 보관. 결정 본문의 before/after로 확정 뒤 정정 이력을 유지하되 비밀번호/키/토큰/헤더/요청 전체를 기록하지 않는다. 댓글 삭제 이력에 지운 본문을 다시 노출하지 않는다. payload 최대128KiB, cursor에는 글 본문을 넣지 않는다. 결정 body/rejectedAlternatives의 큰 정정은 필드별 이벤트로 나눠 같은 트랜잭션에 남겨 본문 손실 없이 행 상한을 지킨다. 세션 요약과 댓글은 이력에 본문 전체를 복제하지 않고 변경 필드·메타데이터만 남긴다.

## DB와 마이그레이션

새 V4__decision_session_links.sql에 decision, session_record, session_participant, link, activity, comment를 추가한다. V1~V3 수정·개발 DB 초기화 금지. docs/06-schema.md에 version/댓글 workspace 등 실제 추가 열을 반영한다.

- decision/session_record: project FK, 영구 (project,number) 고유, version, Audit, 에이전트. 상태와 시각의 CHECK. 세션 occurredAt/createdAt·결정 status/createdAt 정렬 인덱스.
- session_participant: session FK, user FK(nullable), kind/이름 제약과 세션+user 중복 방지. 과거 사용자 snapshot은 남김.
- link: workspace FK와 다형 type/id(대상 FK 없음), 활성 edge 부분 고유 인덱스, 대체/부모의 부분 고유 제약. relation/타입/자기링크/관리문서 미지원 값 CHECK. 감사/해제 주체 포함.
- activity: append only, workspace/project FK, 다형 대상, actor/agent, 고정 UTC occurredAt, JSON text 및 JSON 유효성/크기 제한. target/project의 시간+UUID 인덱스.
- comment: workspace FK, 대상, body, version, Audit 및 agent. target·createdAt·UUID 인덱스. 로그인 세션 iam_session과 session_record 혼동 금지.
- 프로젝트의 결정·세션 카운터를 늘리는 공개 계약을 추가하고 증가가 project.version을 불필요하게 바꾸지 않도록 T-004 번호 정책과 맞춘다.

## REST 계약

workspace 기본 경로 `/api/v1/workspaces/{workspaceId}`. 각 생성은 201 빈 본문+Location, 수정/삭제/업무 처리는 204. 일괄 생성 결과는 Location의 세션 상세 GET으로 확인한다. 요청 스키마 이름 충돌을 피하고 nullable 응답 필드는 항상 반환한다.

- `/projects/{projectId}/decisions` GET/POST, `/{decisionId}` GET/PATCH/DELETE, 하위 `/acceptances`, `/supersessions`, `/restore` POST. 업무 처리에는 expectedVersion, 대체에는 replacementId와 replacementExpectedVersion도 받는다.
- `/projects/{projectId}/sessions` GET/POST(일괄 기록), `/{sessionId}` GET/PATCH/DELETE, `/restore` POST. 수정은 세션 본문·참석자, 이미 기록된 결정/링크는 별도 업무 경로로 변경한다.
- `/projects/{projectId}/decisions/by-ref/{reference}`, `/sessions/by-ref/{reference}` GET. 참조 조회에도 현재 공간/프로젝트 확인.
- `/links` POST, `/{linkId}` DELETE, `GET /targets/{targetType}/{targetId}/links?direction=in|out|both`.
- `/targets/{targetType}/{targetId}/comments` GET/POST, `/comments/{commentId}` PATCH/DELETE, `/restore` POST.
- `/targets/{targetType}/{targetId}/activities` GET, `/projects/{projectId}/activities` GET, 프로젝트 overview GET(최근 결정/세션/진행 작업, 각 묶음 상한 명시; 산출물은 T-006에서 추가).
- 결정/세션: q(title/body/summary), status/type, deleted, sort createdAt/occurredAt(세션), direction, cursor,size≤100. 댓글/활동/링크는 시간+UUID 정렬. cursor는 workspace/target/project/필터/정렬과 결합한다.
- MVC 바인딩 전 대상 인가와 최종 쓰기 트랜잭션의 현재 권한 재검사를 모두 유지한다. 비멤버/다른 공간/삭제 부모/대상은404, 같은 공간 역할 부족은403, stale version409. Bearer 허용 업무 경로도 누락 없이 갱신한다.

## 화면

- 프로젝트 결정·세션 목록/상세/작성·편집, URL 필터/커서 다음 조각. 결정 상태·대체자·기각 대안·계산된 이행 진행, 세션의 참석자·도출 결정·관련 작업 표시.
- 확정/대체는 명시적 다이얼로그이며 버전 충돌에서 입력을 보존한다. 대체자 선택은 같은 프로젝트의 accepted 결정만 조회하되 서버도 재검사한다.
- 작업/결정/세션 상세에서 연결 추가·해제와 댓글/활동의 공통 영역. 연결 이름과 방향을 사용자에게 표시하고 원시 UUID만 입력시키지 않는다. 대상 검색은 현재 구현된 자원에 제한한다.
- 작업 상세 맥락은 데스크톱 주본문+오른쪽 연결 요약, 모바일 본문 다음의 동일 내용. 전체 깊이 trace는 T-008에서 추가한다. 빈 목록·로딩·권한/실패 상태와 독립 초안 유지.
- 프로젝트 메뉴에 결정·세션을 추가한다. 모바일 핵심 하단 세 항목은 유지하고 더보기로 연결한다. 공통 헤더/탭의 필터·조건 행과 Inset/Split·하단 고정 영역 유지. 모든 버튼은 D-052 모양.

## 반증 가능한 완료 기준

| ID | 검사 |
|---|---|
| DS-01 | 같은 프로젝트 동시 결정/세션 생성 번호 중복 없음. 실패한 일괄 기록의 모든 행·참석자·카운터·링크·활동 롤백 |
| DS-02 | 현재/옛 프로젝트 키·D/S 참조 같은 UUID로 해석. 삭제/다른 공간/잘못된 프로젝트 404 |
| DS-03 | 확정·대체 상태/최초 시각/단일 대체자·순환·타 프로젝트·stale version 불변. 강제 링크 저장 실패 전체 롤백 |
| DS-04 | 작업 완료·재개방·보관·삭제/복원·중복 링크 뒤 이행 진행 실시간 계산, 작업 없음 해당없음 |
| DS-05 | 실제 세션/Bearer의 owner/admin/member/viewer·비멤버·must_change·CSRF·제거된 멤버 쓰기 거부, 인스턴스 관리자 우회 없음 |
| DS-06 | 다형 대상 조작/없는 대상·교차 공간·삭제 상대·자기 관계·중복 역순·단일 부모·복원 후 순환 거부 |
| DS-07 | 댓글 본인 수정·관리자 타인 수정 거부/삭제 허용, 탈퇴한 작성자 스냅샷, agent provenance, 삭제 본문 활동 유출 없음 |
| DS-08 | 활동 저장 실패 업무 롤백, 수정 before/after·기록 시각·주체 일치, 비밀값 미기록, 기존 행 가짜 이력 없음 |
| DS-09 | SQL 페이징·검색/상태/타입·동률/마지막 페이지·조건 다른 cursor·삭제 대상 숨김·집계 범위 검증 |
| DS-10 | 1440/390px 결정/세션/작업 연결·댓글·이력, 키보드/두 레이아웃·필터·충돌 초안·D-052 입력/버튼 확인 |
| DS-11 | spotlessApply/exportOpenApi/check, 타입 생성, npm check 전체 성공. 기존 75개 서버/13개 클라이언트 회귀와 ArchUnit 유지 |
| DS-12 | 격리 V3→V4(SQLite·Docker) 업그레이드, 동일 볼륨 재생성 후 인증·프로젝트/작업·결정/세션/링크·댓글 보존, healthy |

## 마무리

검증한 단위별로 커밋하고 실행/미실행 수동 범위를 이 문서에 기록한다. AGENTS/미결/스키마/결정을 실제 상태와 동기화한다. T-004 Docker 게이트도 함께 추적한다. 다음은 T-006 문서함·파일/변환 → T-007 Git/Markdown/PDF → T-008 MCP/맥락 → T-009 검색/Inbox/라벨/통합 운영이다.

## 기반 구현·검증 — 2026-10-23

- V4에 결정·세션/참석자·링크·활동·댓글 스키마를 추가했다. 기존 V1~V3는 수정하지 않았다. 현재는 순수 Decision/SessionRecord/Participant와 프로젝트의 독립 결정·세션 번호 발급 계약까지 구현했다.
- `gradlew.bat --max-workers=2 spotlessApply check` 성공. 단위/계약/아키텍처 28개 + 실제 SQLite/HTTP 통합 54개, 총82개. Spotless·Checkstyle·SpotBugs·ArchUnit 통과. 이전75개 회귀와 새7개(결정3·세션/번호3·V3→V4 마이그레이션1)를 포함한다.
- 결정 최초 확정 시각/재확정 멱등성·대체 후 읽기 전용·제안만 삭제/복원·잘못된 수정의 부분 적용 방지, 참석자 불변 스냅샷/중복 정규화/식별 규칙, 카운터 독립/설정 version 불변을 확인했다.
- 격리 SQLite V3→V4에서 기존 작업/비밀번호 해시 보존, 결정 상태/시각·번호 유일성, 대체자 한 개·자기 링크 거부·해제 후 재연결, 참가자 중복/종류 제약, 잘못된/과대 JSON payload 거부, integrity/foreign_key_check를 검사했다.
- 아직 T-005 완료가 아니다. TargetSpi·Link/Comment/Activity 업무·저장소·조회, Decision/Session Service·REST·화면, 원자적 세션 일괄 기록·대체·활동, 현재 권한·그래프 순환·실제 API 커서 및 Docker V4 게이트를 이어서 구현한다. 도메인/스키마 검사만으로 이 기능들을 완료로 계산하지 않는다. 이 단계는 HTTP 계약 변경이 없어 OpenAPI/클라이언트 API 타입을 변경하지 않았다.

## 저장소·대상 확인·링크 명령 기반 — 2026-10-23

- 결정·세션/참석자 저장소와 작업항목·결정·세션의 TargetSpi를 구현했다. 현재 워크스페이스 자격과 프로젝트 접근 권한을 다시 확인하며, 삭제된 대상/상위 프로젝트와 다른 공간의 UUID는 노출하지 않는다. 프로젝트 키 변경 후 현재 키로 표시한다. 아직 문서/코드 참조 대상은 등록하지 않아 404로 처리한다.
- 링크 연결/해제는 양쪽 대상의 쓰기 권한을 검사한다. 대칭 관계의 역순 중복은 같은 ID를 반환하고, 해제는 이력을 남기며 재연결은 새 행을 만든다. 방향 관계의 순환과 단일 부모/대체자 제약을 검사한다. 순환 탐색은 삭제되지 않은 링크를 따라 숨겨진 중간 대상도 포함한다.
- 일반 연결/해제로 대체 관계를 조작할 수 없다. 대체 연결은 기존 트랜잭션 안에서만 호출하며 두 결정의 같은 프로젝트·확정 상태를 확인한다. 실제 DecisionService의 상태 전이 조율은 후속 구현이다.
- 격리 SQLite 통합 9개에서 저장/복원과 이름 스냅샷, 참석자 저장 실패 시 부모·번호 롤백, 최신 역할/비밀번호 변경 강제 상태, 보관/삭제 접근, 링크 역순/재연결/순환/부모 제약, 수동 조율 트랜잭션의 대체 상태·링크 원자성을 확인했다. 수동 조율 검사를 실제 대체 API 완료로 계산하지 않는다.
- `gradlew.bat --max-workers=2 spotlessApply check` 성공. 단위/계약/아키텍처28개 + SQLite/HTTP 통합63개, 총91개. Spotless·Checkstyle·SpotBugs·ArchUnit 통과. 기존82개 검사를 유지했고 OpenAPI 계약 테스트의 DB 대체 저장소도 새 모듈에 맞췄다.
- 남은 범위: Decision/Session 업무·REST·조회/화면, 일괄 세션 기록, 댓글·활동과 업무 트랜잭션 연결, SQL 페이징·진행률, 실제 HTTP 권한/동시성·화면·Docker V4 게이트. 이 단계도 HTTP 계약 변경은 없다.

## 결정 업무·활동 원자성 — 2026-10-23

- DecisionService에서 생성/최대20개 일괄 생성, 참조 해석, 정정, 확정, 대체, 제안 삭제/복원을 구현했다. 현재 인가와 version을 검사하며 accepted 최초 시각, superseded 읽기 전용, 같은 프로젝트 확정 대체자와 보호 링크 규칙을 적용한다. 결정 일괄 번호는 프로젝트 한 번 저장, 결정은 batch 저장한다.
- TargetChangedEvent의 커밋 전 동기 처리로 활동을 같은 트랜잭션에서 저장한다. 실제 활동 INSERT 실패를 강제로 발생시켜 새 결정/번호와 대체 링크/옛 상태가 모두 롤백되는 것을 확인했다. 기존 행의 과거 이력은 만들지 않았다.
- 정정 필드의 before/after를 허용 목록으로 기록하고 긴 값은 D-056의 조각으로 보존한다. 제어 문자로 JSON이 커지는 2만자 본문/기각 대안도 손실 없이 복원되고 각 행이 128KiB 이하임을 검사했다. 활동에는 CurrentUser나 요청 객체·인증 자격을 넣지 않는다.
- 결정 동시 생성 8건의 번호/이력 중복 없음, 확정 멱등성, 정정 이력, stale version, 제안 삭제/복원, viewer 거부를 검사했다. 이 단계는 Service 통합 검사이며 HTTP/화면 검증을 대신하지 않는다.
- API 키를 사용한 서비스 호출에서 사람 소유자와 에이전트를 업무/활동에 보존하고 자격 식별자·해시가 payload에 없으며 폐기된 키는 거부함을 확인했다. `gradlew.bat --max-workers=2 spotlessApply check` 전체 성공: 단위/계약/아키텍처28개 + 통합69개, 총97개. Spotless·Checkstyle·SpotBugs·ArchUnit 통과. 기존91개 검사를 유지했다.
- 미완료: SessionService 일괄 기록과 참석자 현재 멤버 검증, 댓글·작업/링크 활동 연결, 결정/세션/링크/활동/댓글의 REST·SQL 조회/진행률·화면, 실제 HTTP 정책과 Docker V4. 공개 HTTP 계약은 아직 바뀌지 않았다.
