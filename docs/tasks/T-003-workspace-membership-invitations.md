# T-003. 워크스페이스·멤버십·초대 (Codex 작업 지시서)

> 작성: 2026-10-22. 선행 작업: T-002 (`ba28c94`). 상태: **구현·자동 검증 완료 / 수동 UI 제출 범위 별도 기록**.
> `AGENTS.md`와 `bit-architecture`, `bit-backend`, `bit-api-contract`, `bit-database`, `bit-frontend`를 따른다.
> 사용자가 추가 추천안대로 구현을 요청했다. D-036~D-039와 추가 추천안 D-040~D-043을 기준으로 구현한다.

## 목표와 범위

로그인한 사람이 워크스페이스를 만들고, 다른 사람을 SMTP 없이 초대한다. 초대받은 사람은 기존 계정으로 참여하거나 초대에 묶인 새 계정을 만든다. 서버는 모든 접근을 현재 멤버십과 역할로 판정한다.

- 포함: 생성·내 목록·상세·이름 변경·소프트 삭제, 선택/전환, 멤버 목록·역할 변경·제거·탈퇴, 소유권 이전, 초대 생성·조회·폐기·수락·초대 가입, 필요한 화면.
- 첫 실제 업무 쓰기는 워크스페이스 이름 변경이다. 이 API에서 세션/Bearer 권한 판정 일치를 검증한다.
- 제외: 프로젝트·보드·작업항목·라벨 CRUD, 문서함 데이터, MCP 엔드포인트/도구, SMTP/OTP·자동 메일, 사용자 정의 역할·프로젝트별 멤버 제한, 전역 사용자 검색·계정 관리 UI, 삭제 복원 UI.
- 초기 가입의 공개 범위를 넓히거나 테스트용 로그인·가짜 워크스페이스를 넣지 않는다. 기존 기본 개발 DB를 초기화하지 않는다.

## 기준과 현재 코드

| 기준 | 위치 |
|---|---|
| 가입·역할·키 정책 | `docs/decisions.md` D-036~D-039, `docs/tasks/T-002-authentication.md` |
| 엔티티·예정 스키마 | `docs/02-domain-model.md`, `docs/06-schema.md` 1·2절 |
| API·보안·페이징 | `.agents/skills/bit-api-contract/references/01-api-contract.md`, `02-error-contract.md`, `03-authentication.md` |
| 계층·트랜잭션·모듈 조회 | `.agents/skills/bit-backend/references/03-layers.md`, `04-cross-module-read.md` |
| 기존 인증 진입점 | `server/src/main/java/io/github/goraebap/bit/module/iam/application/AuthenticationFilter.java`, `AuthSecurityConfig.java` |
| IAM 공개 계약 | `server/src/main/java/io/github/goraebap/bit/module/iam/IamFacade.java` — 현재 authenticate만 있음 |
| 공통 주체·현재 세션 | `shared/web/CurrentUser.java`, `module/iam/application/IamService.java`·`IamViews.java` |
| 현재 DB | `server/src/main/resources/db/migration/V1__schema.sql` — 인증 5개 테이블만 존재 |
| 화면·HTTP 계층 | `client/src/app/router/router.ts`, `widgets/app-shell/`, `shared/api/`, `pages/workspace/members/` |

V1은 변경하지 않는다. 문서에 예정된 workspace 테이블이 실제 DB에도 있다고 가정하지 않는다. SandboxHr가 필요하면 읽기만 하고 `credentials/`, `.env`, `CLAUDE.local.md`는 열지 않는다.

## 확정 정책 — 그대로 구현

- 첫 관리자 이후 가입은 초대뿐이다. 인스턴스 관리자는 업무 멤버십을 자동으로 얻지 않는다(D-036·D-037).
- owner/admin/member/viewer 네 역할만 사용한다. 비멤버·삭제 워크스페이스는 404, 소속 멤버의 역할 부족은 403이다. 역할은 각 요청과 쓰기 트랜잭션에서 다시 확인한다.
- 정상 사용자는 워크스페이스를 만들 수 있고 생성자는 owner다. 사용자 본인의 역할은 워크스페이스마다 별개다.
- API 키는 키 주인의 현재 업무 권한을 쓴다. 초대·멤버·소유권 변경 등 보안 작업은 세션 전용이다(D-038). 업무 이름 변경은 역할에 따라 Bearer도 허용한다.
- `must_change` 주체는 T-002의 복구 경로만 쓸 수 있다. workspace 기능으로 우회하지 않는다.

| 동작 | owner | admin | member | viewer |
|---|---|---|---|---|
| 소속 워크스페이스·멤버 목록 조회 | 허용 | 허용 | 허용 | 허용 |
| 워크스페이스 일반 설정(이름) | 허용 | 허용 | 거부 | 거부 |
| member/viewer 초대·역할 변경·제거 | 허용 | 허용 | 거부 | 거부 |
| admin 지정·해제·제거, admin 역할 초대 | 허용 | 거부 | 거부 | 거부 |
| 소유권 이전·워크스페이스 삭제 | 허용 | 거부 | 거부 | 거부 |

admin은 자신을 포함한 admin/owner의 역할을 일반 역할 변경 API로 바꿀 수 없다. 비owner의 본인 탈퇴는 별도 경로로 제공한다. 후속 업무 작성 권한(owner/admin/member)과 상태 전이 규칙은 T-004 이후 각 모듈에서 구현한다.

## 추가 추천안 — 채택 완료 (D-040~D-043)

| 주제 | 추천 | 이유·대안 |
|---|---|---|
| owner 수 | 활성 워크스페이스마다 정확히 1명. 이전은 기존 owner→admin, 기존 멤버→owner를 원자 처리 | 책임과 UI가 단순하다. 복수 owner도 가능하지만 이번에는 관리 경우의 수를 늘리지 않는다. D-037은 수를 확정하지 않았다 |
| 식별자 | UUID가 API·화면 경로의 기준. slug는 trim·소문자 처리 후 영문/숫자/하이픈 2~64자(시작·끝은 영문/숫자), 생성 후 고정·전체 행에서 고유 | 이름은 바꿀 수 있다. 삭제 후에도 slug는 재사용하지 않아 과거 참조를 다른 공간에 넘기지 않는다. slug 변경·별칭은 이후 |
| 초대 유효 기간 | 7일, 한 번만 수락. pending은 workspace+정규화 이메일당 하나 | 수동 전달 시간을 확보하면서 무기한 링크를 피한다. 사용자별 만료 선택·재발급 전용 API는 넣지 않는다 |
| 초대 링크 | `biti_` + 32바이트 CSPRNG. HMAC 용도 `workspace-invitation`. 원문은 생성 응답 한 번, 링크의 fragment에만 포함 | API 키·세션과 용도를 구분한다. 토큰이 서버 요청 URL·Referer·로그에 들어가는 것을 피한다 |
| 초대자 권한 변화 | 수락 시 초대자의 현재 멤버십·해당 역할 부여 권한도 재검사 | 초대 후 강등·탈퇴로 이미 잃은 권한을 링크가 보존하지 않는다. 권한 변화 시 효력을 잃는 pending 초대도 함께 폐기한다 |
| 새 계정 참여 | 유효 초대에 묶어 계정+비밀번호+멤버십+초대 소비를 한 트랜잭션으로 생성. 이후 일반 로그인 | 가입 실패 계정이나 사용된 초대만 남는 것을 막는다. 가입 즉시 자동 로그인은 T-002와 달라 채택하지 않는다 |
| 소유권 이전 재인증 | 현재 owner의 비밀번호 재확인. 새 owner는 이미 가입한 활성 멤버만 | 운영 권한을 넘기는 동작이다. 실패 횟수·잠금과 해시 계산은 T-002 규칙을 재사용한다 |
| 현재 공간 | URL의 workspaceId가 화면 문맥의 기준. 세션 active_workspace_id는 마지막 선택을 기억하는 편의 값 | 여러 탭에서 서로 다른 공간을 안전하게 연다. 세션 값만으로 API 대상이나 접근 권한을 정하지 않는다 |

아래 API·DB·화면은 사용자가 채택한 이 정책을 기준으로 구현했다.

## 사용자 흐름

### 1. 생성·선택·전환

1. 로그인 후 참여 중인 공간이 없으면 목록의 빈 상태에서 이름·slug로 생성한다. 계정 가입만으로 공간을 만들지 않는다.
2. 서버는 workspace와 owner 멤버십을 함께 저장한다. 생성은 세션 전용이다(소유권 부여 포함).
3. 성공한 Location의 workspace ID로 이동하고 현재 세션의 선택도 저장한다. 이름/slug 충돌이나 저장 실패를 폼에 표시한다.
4. 목록에는 자신의 활성 멤버십만 나온다. 인스턴스 관리자에게도 전체 목록을 노출하지 않는다.
5. `/`는 마지막 선택이 유효하면 해당 공간으로, 선택이 없고 공간이 하나면 그 공간으로, 나머지는 선택 목록으로 보낸다. 명시적인 `/workspaces`는 항상 목록을 연다.

### 2. 초대 생성·전달

- owner/admin이 이메일과 부여할 역할을 고른다. owner 역할은 초대할 수 없다. admin 역할은 owner만 부여한다.
- 이메일은 T-002와 동일하게 trim·소문자 처리한다. 다른 공간의 사용자 존재 여부에 따라 응답을 바꾸거나 전역 검색을 제공하지 않는다.
- 이미 이 공간의 멤버면 409, 유효 pending 초대가 있으면 409다. 만료된 pending은 쓰기 시 expired로 정리한 뒤 새 초대를 만들 수 있다.
- 생성 결과에 원문 토큰을 한 번 반환한다. UI는 현재 출처의 `/join#token=<token>` 링크를 만들어 복사한다. 메일을 보냈다고 표시하지 않는다.
- 목록에는 이메일·역할·상태·초대한 사람·시각·만료만 나온다. 원문과 HMAC은 나오지 않는다. 링크를 잃으면 기존 초대를 폐기하고 새로 만든다.
- 초대 목록·폐기도 owner/admin 전용이며, admin은 admin 역할 초대를 관리할 수 없다.

### 3. 기존 계정의 수락

- 링크를 연 뒤 POST 미리보기로 공간 이름·초대 이메일·역할·만료를 확인한다. 전체 멤버 목록은 주지 않는다.
- 세션이 없으면 같은 참여 화면 안에서 기존 계정으로 로그인한다. 토큰을 로그인 URL이나 영구 저장소로 옮기지 않는다. 로그인 폼이 두 곳에서 필요해지면 공통 feature로 추출한다.
- 로그인한 계정의 정규화 이메일이 초대 이메일과 일치해야 한다. 다르면 계정 전환을 안내하고 초대를 소비하지 않는다.
- 수락 시 현재 사용자·공간·초대 상태/기한·초대자 권한·대상 역할을 모두 다시 검사한다. 멤버 생성과 accepted 상태/수락자를 함께 저장한다.
- 수락의 재전송은 같은 accepted_by이고 현재 멤버십도 남아 있을 때만 변경 없이 204다. 현재 역할을 초대 역할로 덮어쓰지 않는다. 제거된 사람을 사용된 링크로 다시 가입시키지 않는다.
- 이미 다른 경로로 멤버가 된 사람의 pending 수락은 409이며 역할을 바꾸지 않는다. 관리자에게 남은 초대 폐기를 안내한다.

### 4. 초대받은 새 계정의 가입

- 입력은 초대 토큰·이름·비밀번호다. 이메일은 초대 행에서 정하며, 클라이언트가 이메일·역할·instanceAdmin 값을 바꿔 보낼 수 없다.
- 익명 상태에서만 이 가입을 허용한다. 정상 로그인 사용자는 기존 계정 수락을 사용하거나 먼저 로그아웃한다.
- 유효 초대에 해당 이메일의 활성 계정이 이미 있으면 `WORKSPACE_INVITATION_LOGIN_REQUIRED`(409)로 기존 계정 로그인을 안내한다. 비밀번호를 덮어쓰거나 링크만으로 기존 계정에 로그인시키지 않는다.
- 새 iam_user는 항상 is_instance_admin=false다. password 정책과 해시는 T-002를 재사용한다. 이메일 소유를 별도 검증했다고 표시하지 않는다.
- 실패하면 계정·비밀번호·멤버십·초대 소비가 모두 롤백된다. 같은 이메일의 동시 가입도 활성 사용자 한 명만 허용한다.
- 가입 성공 후 원문 토큰·비밀번호 초안을 비우고 로그인으로 이동한다. 로그인한 뒤 이미 참여된 공간을 선택할 수 있다.

### 5. 역할 변경·제거·탈퇴·소유권 이전·삭제

- 일반 역할 변경은 member/admin/viewer만 받는다. owner 부여는 이전 API 하나에서만 가능하다. 대상을 workspaceId와 묶어 조회한다.
- 비owner는 본인 탈퇴가 가능하다. owner는 먼저 소유권을 이전해야 한다. 관리자의 다른 사람 제거와 본인 탈퇴를 구분한다.
- 소유권은 현재 owner가 기존 활성 멤버에게 이전한다. 두 역할과 감사 정보를 같은 트랜잭션에서 바꾸고 최종 owner가 한 명인지 검사한다.
- 멤버 제거/탈퇴 시 해당 사용자의 모든 세션 중 그 공간을 선택한 포인터를 null로 한다. 역할 변경은 포인터를 지우지 않는다. 다른 공간과 계정의 세션·API 키 자체를 폐기하지 않는다.
- 공간 삭제는 owner의 세션만 허용하고 소프트 삭제한다. pending 초대를 폐기하고 모든 해당 세션 포인터를 지운다. 멤버십과 기록을 물리 삭제하지 않는다. 후속 업무 조회도 삭제 공간을 숨겨야 한다.
- 탈퇴·제거·이전·삭제는 확인창으로 대상과 결과를 보여 준다. 데이터 복원 UI와 고아 owner 복구 권한은 이번에 만들지 않는다. 인스턴스 관리자의 암묵적 복구 접근도 허용하지 않는다.

## REST 계약안

`/api/v1` 아래다. 기존 인증·CSRF·ProblemDetail 계약을 유지한다. 새 경로·메서드만 명시 등록하고 prefix 전체를 허용하지 않는다.
등록한 GET의 HEAD도 같은 권한으로 처리한다.

| 메서드·경로 | 주체·권한 | 성공·내용 |
|---|---|---|
| GET `/me/workspaces` | 세션/Bearer, 본인 멤버십 | 200 커서 목록: id/name/slug/myRole |
| POST `/workspaces` | 세션, 정상 사용자 | 201 빈 본문, Location=`/api/v1/workspaces/{id}`. 입력 name/slug |
| GET `/workspaces/{id}` | 세션/Bearer, 멤버 | 200 id/name/slug/myRole/createdAt |
| PATCH `/workspaces/{id}` | 세션/Bearer, owner/admin | 204. 입력 name만. 생략은 유지, null/공백은 400; slug 변경 불가 |
| DELETE `/workspaces/{id}` | 세션, owner | 204 소프트 삭제 |
| GET `/workspaces/{id}/members` | 세션/Bearer, 멤버 | 200 커서 목록: memberId/userId/name/email/role/joinedAt |
| PATCH `/workspaces/{id}/members/{memberId}` | 세션, 역할 표 | 204. 입력 role |
| DELETE `/workspaces/{id}/members/{memberId}` | 세션, 역할 표 | 204 다른 멤버 제거. 본인은 아래 탈퇴 사용 |
| DELETE `/workspaces/{id}/members/me` | 세션, 비owner | 204 본인 탈퇴 |
| PUT `/workspaces/{id}/owner` | 세션, owner+재인증 | 204. 입력 userId/currentPassword |
| GET `/workspaces/{id}/invitations` | 세션, owner/admin | 200 관리 가능한 초대의 커서 목록 |
| POST `/workspaces/{id}/invitations` | 세션, owner/admin | 201 id/token/expiresAt, Location=`/api/v1/workspaces/{id}/invitations/{invitationId}` |
| GET `/workspaces/{id}/invitations/{invitationId}` | 세션, owner/admin | 200 관리 메타데이터만; token/hash 제외 |
| DELETE `/workspaces/{id}/invitations/{invitationId}` | 세션, owner/admin | 204 pending 폐기, 이미 revoked/expired도 변경 없이 204. accepted는 409 |
| POST `/invitation-previews` | 익명/세션, Bearer 거부 | 200 미리보기. 입력 token |
| POST `/invitation-acceptances` | 세션, 이메일 일치 | 201 빈 본문, Location=`/api/v1/workspaces/{id}`. 같은 수락 재전송만 204 |
| POST `/invitation-registrations` | 익명만, 유효 초대 | 201 빈 본문, Location=`/api/v1/me`. 입력 token/name/password |
| PUT `/auth/sessions/current/workspace` | 세션, 해당 공간 멤버 | 204. 입력 workspaceId; workspace 서비스가 권한 확인 후 IAM 세션을 갱신 |

- 초대 생성의 일회용 응답은 T-002 API 키와 같은 POST 본문 예외다. `invitation-previews`는 토큰을 URL에 넣지 않기 위한 읽기 POST(200, DB 생성 없음) 예외로 OpenAPI에 명시한다.
- preview/acceptance/registration 모두 토큰을 JSON 본문으로만 받으며 `no-store`다. 로그·오류·trace·Location에 원문을 넣지 않는다. DTO toString도 숨긴다.
- 잘못된/만료/폐기/다른 조건으로 무효인 초대는 공통 404 `WORKSPACE_INVITATION_UNAVAILABLE`로 안내한다. 미리보기는 수락된 초대도 이 응답이다. 유효 초대의 계정 불일치는 403 `WORKSPACE_INVITATION_ACCOUNT_MISMATCH`이며 소비하지 않는다.
- slug/멤버/중복 pending 충돌, owner 탈퇴 금지 등은 원인별 `WORKSPACE_*` 409 코드로 나눈다. 공통 인증·권한·입력 오류는 기존 코드를 쓴다.
- 토큰을 받는 세 POST도 Origin+CSRF를 적용한다. 유효 Bearer가 함께 오면 세션으로 대체하지 않고 거부한다. 익명 preview/registration에는 IP 제한(기본 분당 10회, bounded TTL)을 적용하고 임의 Forwarded 헤더를 신뢰하지 않는다.
- 목록은 size 기본 50·최대 100, workspace/초대 createdAt DESC+id DESC, 멤버 joinedAt ASC+memberId ASC. 지원하는 sort/direction만 허용한다. 초대 상태 필터는 pending/accepted/revoked/expired다.
- 커서는 사용자·workspace·필터·정렬과 결합하고 SQL에서 size+1을 읽는다. 권한 확인 후 커서를 검증한다. 전체 데이터를 메모리에서 자르지 않는다.

## DB: V2만 추가

`V2__workspace_membership_invitations.sql`로 아래 세 테이블만 만든다. label·project 등은 후속이다. 공통 UUID·감사·UTC 소수 6자리·CHECK·인덱스 규칙을 적용하고 `docs/06-schema.md`를 실제 V2와 일치시킨다.

| 테이블 | 필요한 내용 |
|---|---|
| workspace | 예정 열 + updated_by_agent varchar(64) nullable. slug 전체 행 고유, 감사/소프트 삭제. 이름·slug 길이/형식 검증 |
| workspace_member | 예정 열 그대로. workspace/user FK, workspace+user 고유, 역할 CHECK. owner는 workspace별 최대 한 명인 부분 유니크 인덱스 |
| workspace_invitation | 예정 열 + accepted_by/accepted_at, revoked_by/revoked_at. user 참조는 FK, role은 admin/member/viewer CHECK, status는 네 상태 CHECK, token_hash 전체 고유, workspace+email의 pending 부분 유니크 |

- 최소 한 owner는 서비스 불변식으로 보장한다. 유니크 인덱스 때문에 이전은 기존 owner 강등 후 새 owner 승격 순서로 저장하되, 중간 상태를 커밋하지 않는다. 실패 시 둘 다 롤백한다.
- D-021에 따라 이름 변경의 updated_by는 키 주인이고 updated_by_agent는 해당 키의 agent_name이다. 세션 변경은 updated_by_agent를 null로 갱신한다. 이 열은 마지막 수정 주체만 나타내며 활동 로그 전체를 대신하지 않는다. activity 모듈을 이번에 미리 만들지 않는다.
- membership 제거는 행을 삭제한다(예정 스키마에 deleted_at 없음). 재참여는 새 memberId/joinedAt다. 과거 초대는 행을 유지하고 accepted_by로 재전송을 구분한다.
- 만료는 Clock의 현재 시각과 expires_at으로 항상 판정한다. 청소 작업이 없어도 만료 링크가 거부되어야 한다. 읽기는 expired로 투영할 수 있고, 새 초대 쓰기에서는 만료 pending을 먼저 expired로 갱신해 유니크 제약을 풀어 준다.
- 목록 정렬용 인덱스, 사용자의 workspace 목록 인덱스, 포인터 정리용 iam_session 인덱스를 추가한다. V1의 active_workspace_id 열을 재생성하지 않는다. 이번에는 해당 열에 workspace FK를 붙이기 위한 IAM 테이블 재작성도 하지 않는다. 포인터의 유효성은 workspace 검사와 원자적 갱신/정리가 보장한다.
- Flyway V1→V2 업그레이드에서도 기존 계정·비밀번호·세션·키·비밀값을 유지한다. jOOQ를 재생성하고 DDLDatabase의 SQLite 전용 CHECK/부분 인덱스 처리 규칙을 따른다.

## 서버 구조와 원자성

### 단방향 모듈 의존

- `module/workspace/{application,domain,infrastructure}`와 루트 `WorkspaceFacade`를 만든다. 외부 모듈은 루트 계약만 사용한다. domain은 순수 Java, jOOQ 구현은 package-private다.
- 컴파일 의존은 **workspace → iam의 루트 계약**만 허용한다. `iam → workspace`를 추가하지 않는다. shared는 어느 업무 모듈에도 의존하지 않는다.
- `WorkspaceFacade`에서 CurrentUser+workspaceId+행동으로 현재 접근/역할을 판정하는 계약을 제공한다. 후속 프로젝트/MCP도 같은 계약을 사용한다. 역할·멤버십을 CurrentUser나 API 키에 복사해 권한 사본으로 쓰지 않는다.
- 멤버 표시 정보는 IAM의 필요한 최소 배치 계약으로 받는다. 다른 모듈 내부 Service/Repository를 직접 import하지 않는다. 목록의 조건·정렬을 위한 SQL join은 cross-module-read 규칙에 맞춰 query 구현에서만 사용한다.
- IAM에는 초대 가입 준비/저장, 재인증 준비/재검사, 현재 세션 포인터 변경/일괄 정리에 필요한 최소 루트 계약을 추가한다. 이 계약에 대한 임의 HTTP/MCP 관리 API를 만들지 않는다.
- workspace에서 IAM 내부 TokenCodec을 직접 import하지 않는다. 두 모듈이 쓰는 CSPRNG/HMAC 부분은 업무 의존 없는 `shared/web` 기술 부품으로 추출한다. 기존 session/api-key/csrf 용도와 HMAC 입력 형식·인코딩을 보존해 기존 자격 증명을 무효화하지 않는다.
- 선택 경로의 Controller는 workspace가 소유하고 멤버십 검증 후 IAM 계약을 부른다. IAM 서비스가 WorkspaceFacade를 역호출하는 방식은 쓰지 않는다. 현재 세션 응답에는 activeWorkspaceId를 추가하되 접근권의 근거로 삼지 않는다.

### 트랜잭션

원자적 조율의 범위를 아래로 한정한다. 채택 시 일반적인 1 트랜잭션 1 애그리거트 규칙의 예외와 이유를 결정에 기록한다.

| 유스케이스 | 함께 커밋할 것 |
|---|---|
| 공간 생성 | workspace + 최초 owner membership |
| 초대 수락 | 초대 재검사 + membership + accepted/accepted_by/accepted_at |
| 초대 가입 | iam_user + iam_password + membership + 초대 소비 |
| 소유권 이전 | 두 역할 + 감사 + 기존 초대자의 새 권한으로 무효가 된 pending 초대 폐기 |
| 제거/탈퇴/삭제 | membership 또는 workspace 상태 + 무효 초대 정리 + 관련 IAM 세션 포인터 정리 |

- 비밀번호 검증·bcrypt 계산은 쓰기 트랜잭션 밖이다. 짧은 사전 초대 확인 후 계산하고, `BEGIN IMMEDIATE` 안에서 초대/주체/권한/이메일 고유성을 다시 확인한다. 사전 확인 결과를 쓰기 허가로 믿지 않는다.
- 준비된 비밀번호·재인증 정보는 서버 내부 전용 타입으로 주고받고 toString/로그/HTTP에서 숨긴다. 클라이언트가 해시나 재인증 증명을 제출하게 만들지 않는다.
- workspace의 조율 트랜잭션과 IAM 저장은 같은 DataSource/트랜잭션을 사용한다. IAM 저장 단계에 REQUIRES_NEW를 쓰지 않는다. 재인증 실패 횟수는 기존 T-002처럼 별도 경계에서 먼저 커밋한다.
- 서비스 public 메서드에 트랜잭션을 명시하고 자기 호출로 프록시를 우회하지 않는다. 동시 수락·이전·삭제·강등은 실제 SQLite 파일에서 경쟁시켜 검증한다.

### HTTP 인가와 Facade 인가

- T-002 AuthenticationFilter의 Bearer 허용 경로와 AuthSecurityConfig의 메서드/경로 목록을 분류표대로 확장한다. 모든 workspace 경로를 Bearer나 permitAll로 풀지 않는다.
- workspace 역할 부족은 본문 바인딩 전에 거부해야 한다. 추천 배치는 workspace 소유의 HTTP 인가 필터를 **Spring Security 서블릿 필터 뒤, DispatcherServlet 앞**에 한 번만 등록하는 것이다. IAM에 workspace 구현 타입을 주입해 순환을 만들지 않는다.
- 필터는 인증된 공통 주체·HTTP 메서드·경로 ID로 WorkspaceFacade의 공통 인가를 부른다. 권한 없는 사용자의 깨진 JSON·맞지 않는 Accept도 400/406보다 403/404가 먼저여야 한다(정상 Origin/CSRF 전제).
- HTTP 필터는 사전 거부용이다. 실제 Service/Facade는 쓰기 잠금을 잡은 뒤 다시 권한·소유권·현재 자격 증명을 검사한다. 필터만 믿는 API나 Controller에만 있는 역할 규칙을 만들지 않는다.
- 필터 등록 순서와 중복 실행 여부는 설치된 Spring Boot API를 확인하고 통합 테스트로 증명한다. 추천 구조가 현 버전에서 맞지 않으면 구현 전에 대안을 결정에 기록하고 같은 검증을 통과시킨다.

## 클라이언트

- OpenAPI에서 생성한 DTO를 사용한다. 페이지 우선 FSD로 선택/생성, 멤버, 공간 설정, 초대 참여를 나눈다. 서로 다른 페이지에서 실제로 쓰는 로그인 폼만 feature로 추출하고 페이지끼리 import하지 않는다.
- 화면 경로 추천: `/workspaces`, `/w/$workspaceId`, `/w/$workspaceId/members`, `/w/$workspaceId/settings`, `/join`. 기존 Inbox/My Tasks/문서함 빈 화면도 `/w/$workspaceId/...` 문맥으로 옮긴다. 기존 짧은 주소는 선택된 유효 공간 또는 목록으로 리다이렉트한다. 계정 설정·인증 주소는 전역으로 유지한다.
- 데스크톱 사이드바·모바일 상단에 공간 이름과 선택기를 둔다. 모바일 기본 탭은 D-034를 유지하고 더보기에 멤버·공간 설정을 연결한다. 권한 없는 관리 버튼을 숨기며 서버 거부도 처리한다.
- workspaceId는 URL, 필터/커서는 URL search, 서버 상태는 Query가 소유한다. 모든 workspace 쿼리 키에 ID를 포함한다. Router loader에는 개인정보 DTO를 별도 사본으로 반환하지 않고 Query를 준비만 한다.
- 포인터는 선택 동작에서 저장한다. 다른 탭의 선택으로 현재 탭 URL을 바꾸지 않는다. 키 요청은 항상 명시 workspaceId를 사용하고 브라우저의 세션 포인터에 기대지 않는다.
- 강등·제거 후 403/404는 전역 로그아웃으로 처리하지 않는다. 권한을 재조회하거나 해당 공간 캐시를 취소·제거하고 목록으로 이동한다. 계정 세션의 401만 기존 전체 캐시 파기 흐름을 쓴다.
- 초대는 멤버 화면의 관리 구역에 둔다. 역할 Selector는 현재 부여 가능한 값만 보인다. 링크 원문은 생성 직후 지역 메모리에만 두고 복사 실패·링크 분실·폐기 후 재생성 안내를 제공한다.
- `/join`은 fragment를 메모리로 읽고 Router의 replace로 주소에서 제거한다. token을 search/path, localStorage/sessionStorage, Query/Router/Mutation 캐시, 분석 로그에 보관하지 않는다. 이탈/새로고침 후에는 링크를 다시 열도록 안내한다.
- 로그인은 참여 페이지 안에서 완료해 토큰을 보존한다. must_change 계정은 먼저 비밀번호를 변경한 뒤 원래 초대 링크를 다시 열도록 안내한다. 토큰 없는 페이지·잘못된 링크·만료·계정 불일치·이미 멤버 상태도 만든다.
- Astryx CLI로 컴포넌트를 확인한다. 390px/1440px, 긴 이름/이메일, 터치 높이 48px·글자 16px, 확인창 Escape/뒤로가기/포커스 복원을 확인한다. 초대 화면의 계정 가입·비밀번호 제출은 브라우저 도구의 자격 증명 입력 정책이 적용되면 사용자 인계 항목으로 구분한다.
- 저장 성공 후 목록 재조회 실패를 저장 실패로 안내하지 않는다. 자동 낙관적 갱신·쓰기 네트워크 재전송은 넣지 않는다. 기존 CSRF 오류만 1회 갱신/재전송하는 HTTP 계층을 재사용한다.

## 구현 순서

1. 추천안 채택 여부와 T-002 수동 확인 잔여를 확인하고, 새 정책·조율 예외를 결정에 기록한다.
2. V2·도메인·포트·jOOQ와 단방향 IAM 계약을 만든다. 생성/조회·권한·단위/SQLite 테스트부터 붙인다.
3. 멤버 관리·소유권 이전·삭제와 세션 포인터 정리를 구현한다.
4. 초대 생성/폐기/수락/가입과 경쟁 조건·실패 롤백 테스트를 붙인다.
5. HTTP 인가·OpenAPI·생성 타입을 맞춘 뒤 화면과 캐시/초대 토큰 수명주기를 연결한다.
6. 전체 검사·별도 DB 로컬 실행·Docker 업그레이드/재생성 검증을 마치고 결과를 이 문서에 남긴다.

## 완료 기준

| ID | 반증 가능한 검증 |
|---|---|
| WS-01 | V1만 있는 DB에 V2 적용. 기존 사용자·비밀번호·유효 세션·키 유지. 기존 V1 diff 없음. 빈 DB에도 전체 마이그레이션 성공 |
| WS-02 | 정상 세션의 생성 201, workspace+owner 동시 저장. 강제 중간 실패 시 둘 다 없음. slug 충돌/형식·고정·삭제 후 재사용 금지 검증. Bearer 생성 403 |
| WS-03 | A/B 두 공간과 비멤버·인스턴스 관리자 fixture로 목록/상세/멤버 격리 검증. 없는/삭제/비멤버 404, 멤버 역할 부족 403. 인스턴스 관리자도 예외 없음 |
| WS-04 | owner/admin/member/viewer 각각 세션/Bearer의 이름 변경·조회 결과 일치. owner/admin Bearer 쓰기 204와 사람 ID/agent_name 감사 저장. 강등·제거 직후 기존 키의 결과가 바뀜. 잘못된 Bearer+정상 쿠키 401 유지 |
| WS-05 | 키로 멤버·초대·탈퇴·선택·소유권·삭제 API 호출 시 403. 비관리 멤버의 깨진 JSON/부적합 Accept도 권한 거부가 선행. 정상 인가 후 잘못된 입력은 400/406 |
| WS-06 | admin이 owner/admin을 변경·제거하거나 admin을 초대하지 못함. owner도 일반 역할 API로 owner를 만들거나 자신을 강등하지 못함. owner 탈퇴/제거 금지 |
| WS-07 | 소유권 이전 정상 204, 비밀번호 오입력·잠금·대상 비멤버/삭제/자신 처리 검증. 동시 이전·탈퇴/강등 경쟁에서도 최종 owner 정확히 한 명, 중간 실패 전체 롤백 |
| WS-08 | 초대 이메일 정규화·역할 제한·같은 pending 중복 거부. 만료 pending 뒤 새 생성 가능. HMAC만 저장, 원문은 생성 한 번이며 목록·단건·로그·Location에 없음 |
| WS-09 | Clock 경계에서 만료 거부, 폐기/사용된 토큰 재사용 거부. 초대자 강등/탈퇴·공간 삭제 후 기존 링크 무효. 한 공간의 invitationId를 다른 공간 경로에서 접근 시 404 |
| WS-10 | 기존 계정의 이메일 일치 수락 성공, 불일치 시 소비 없음. 같은 accepted_by의 재전송은 204/역할 유지. 제거 후 재전송으로 재가입 불가. 이미 멤버의 pending 수락으로 승격 불가 |
| WS-11 | 익명 초대 가입으로 비관리자 계정+비밀번호+멤버십+초대 소비 동시 생성. 무효 초대·현재 계정 중복·중간 DB 실패·동시 같은 이메일 가입에 고아 계정/반쪽 소비 없음. 기존 비밀번호 덮어쓰기 없음 |
| WS-12 | 두 세션·API 키, 두 공간으로 제거/탈퇴/삭제 시 포인터 정리와 즉시 접근 거부 확인. 다른 공간·유효 계정 세션·키는 유지. must_change의 새 경로 우회 거부 |
| WS-13 | 익명 초대 POST의 CSRF/Origin·IP TTL 제한, 유효 Bearer 동반 거부 검증. 모든 토큰 응답 no-store. 일반 네트워크 실패 쓰기는 재전송하지 않음 |
| WS-14 | 커서 경계의 같은 시각 행·다음 페이지·필터·공간/사용자/정렬이 다른 커서 거부 검증. 목록 SQL 페이징과 인덱스 확인 |
| WS-15 | 390px/1440px에서 생성→선택→초대 링크 복사→기존/신규 계정 참여→역할 변경→탈퇴/이전 흐름 확인. 두 탭 A/B 문맥·캐시 격리, 제거 후 뒤로가기·재접속 시 이전 데이터 없음. 실제 실행과 사용자 인계/미실행 수동 항목을 구분 |
| WS-16 | 초대 토큰 fragment 제거·영구 저장소/캐시/로그 미보관, 이탈 후 원문 소멸·링크 재열기 안내 확인. 등록된 기존 이메일을 링크만으로 인증할 수 없음 |
| WS-17 | `gradlew.bat check`, `exportOpenApi`→`npm run api:generate`, `npm ci && npm run check` 통과. 기존 T-002 테스트도 유지. ArchUnit으로 순환·내부 직접 참조·shared 업무 의존 없음 |
| WS-18 | `.env`·SMTP 없이 로컬 실행, Docker build/healthy, V1 데이터 볼륨의 V2 업그레이드와 재생성 후 세션·공간·멤버·초대 유지. 선택 기능을 허위로 mail=true로 바꾸지 않음 |

워크스페이스 이름 변경의 Bearer 성공을 member의 후속 업무 작성이나 MCP 검증 완료로 확대하지 않는다. 프로젝트·작업항목 구현 시 해당 역할별 실제 쓰기와 리소스 상태 검사를 다시 검증한다.

## 끝나면

- 채택된 추가 정책·원자성 예외·의존 방향을 `docs/decisions.md`에 무엇을/왜/기각한 대안으로 남긴다. 미채택 추천을 확정으로 기록하지 않는다.
- 실제 스키마·API·화면 경로를 문서에 반영하고, 스킬의 해결된 미결 항목은 승인 범위와 `skill-repair` 절차에 따라 갱신·동기화한다.
- 이 문서에 실행한 명령·결과·미실행 수동 항목을 기록하고 AGENTS/open-questions의 다음 작업을 갱신한다. T-002 수동 확인 잔여와 개발 도구 보안 갱신을 완료로 바꾸지 않는다.
- 커밋은 사용자가 요청할 때만 한다. 이번 구현 변경은 아직 커밋하지 않았다.


## 구현 및 검증 결과 (2026-10-22)

### 반영한 것

- D-040~D-043 채택, V2 마이그레이션과 jOOQ 생성, workspace 도메인·공개 Facade·API 18개. V1 파일은 변경하지 않았다.
- 현재 역할 기반 세션/Bearer 인가, MVC 바인딩 전 대상 역할 검사와 쓰기 중 재검사. workspace→IAM 공개 계약만 사용한다. `SecretTokens` 공통화 후에도 기존 HMAC 형식·목적을 유지했다.
- 초대 7일·일회용, 현재 초대자 권한, 원자적 신규 계정 가입, 재수락 멱등성, owner 정확히 한 명, 선택 포인터 정리, SQL 커서 페이징.
- `/workspaces`, `/w/$workspaceId`, `/w/$workspaceId/members`, `/w/$workspaceId/settings`, `/join`. 예전 짧은 메뉴 경로는 유효한 마지막 공간으로 보낸다. 로그인 폼을 Login/Join에서 재사용하는 feature로 추출했다.
- 초대 fragment는 Router 생성 전에 URL에서 지우고 페이지 지역 메모리에 전달한다. 가입·수락·생성 비밀값은 Query/Mutation 캐시에 넣지 않는다. 이탈/숨김 시 지운다.
- 사용자의 추가 레이아웃 지시(D-044)를 직접 반영했다. 기본 Inset/대안 Split, 화면 모드, 236~350px 사이드바 조절·저장, 헤더의 브레드크럼·동작 슬롯, 탭·도구 행·적용 조건 행, 바코드·Agent 하단 영역. 별도 자동 진행 루프와 서브에이전트 레이아웃 작업은 시작하지 않는다.

### 실행한 검사

| 검사 | 결과 |
|---|---|
| `server/gradlew.bat check` | 단위·계약·아키텍처 16개 + 실제 SQLite HTTP 통합 30개 통과. Spotless·Checkstyle·SpotBugs 통과. 기존 T-002 검사 유지 |
| `exportOpenApi` → `npm run api:generate --prefix client` | 서버 계약과 생성 타입 갱신. 요청/응답 이름 충돌을 피하도록 WorkspaceInvitation 스키마를 구분하고 계약 테스트로 보호 |
| `npm ci --prefix client` → `npm run check --prefix client` | 컴포넌트 규칙·FSD·9개 테스트·타입·빌드 통과. 기존 의존성의 감사 경고는 별도 항목이며 보안 갱신 완료로 표시하지 않음 |
| 원자성과 경쟁 | 생성/가입/소유권 이전 중 강제 DB 실패 롤백, 동시 가입·수락·소유권 이전 및 이전 대 탈퇴 경쟁. 최종 owner 한 명, 중복 멤버·고아 가입 없음 |
| 권한·보안 | owner/admin/member/viewer 세션/Bearer, 초대자 권한 상실, 삭제·비멤버 404, must_change 우회 거부, CSRF·Origin, TTL 제한 경계, 토큰 목적 분리 |
| `docker build -t bit:dev .` | SMTP·.env 없이 빌드 및 HEALTHCHECK healthy |
| V1→V2·동일 볼륨 재생성 | T-002 이미지의 V1 볼륨을 새 이미지에 연결. 기존 사용자·비밀번호 해시·세션·키 유지, 실제 기존 세션/Bearer 인증 성공. 공간·멤버·초대·선택 포인터 재생성 후 유지 |
| SQLite 상태 | 마이그레이션 버전 1→2, 기존 IAM ID/해시 행 포함, integrity_check=ok, foreign_key_check 오류 없음. 자격 증명·초대 원문이 컨테이너 로그에 없음 |

### 화면 검증과 제한

격리된 컨테이너의 fixture 계정으로 로그인하고 화면에서 공간 생성→선택→이름 변경을 실행했다. 화면 설정의 밝기·두 레이아웃·새로고침 후 유지, 사이드바 키보드/드래그 조절, 초대 탭과 필터 팝오버·적용 조건 툴바를 확인했다. 최종 모바일/데스크톱 확인 결과는 아래에 보충한다.

신규 비밀번호 입력·제출, UI에서의 실제 소유권 이전·역할 부여·영구 삭제는 이번 브라우저 조작으로 완료했다고 주장하지 않는다. 해당 처리의 실제 HTTP·DB 원자성과 경쟁은 자동 테스트로 검증했다. 실제 모바일 소프트 키보드·클립보드 권한 프롬프트는 별도 수동 확인이다. 테스트용 계정·공간은 기본 개발 DB에 넣지 않았고 기존 DB를 초기화하지 않았다.

### 시각 구조 근거

사용자 제공 4장 화면의 Inset 카드·하단 상태 영역을 기준으로 SandboxHr WorkspaceShell/PageFrame/AgentBar/너비 조절 구현을 읽었다. BIT의 header 슬롯과 PageFrame Portal로 구조를 단순화했고 Astryx SideNav의 resizable을 재사용했다. 관찰한 비교 범위는 셸·헤더·탭·필터·상태 영역이며 HR 업무 화면·콘텐츠·사진 자산 전체를 복제한 것은 아니다.


추가 화면 확인: 1440×960 / 390×844에서 가로 넘침 없음, 초대 대화상자 입력·Escape 취소·원래 버튼으로 초점 복귀, 재진입 시 입력/원문 제거, 초대 생성·복사 완료 안내·숨김, 필터 팝오버와 조건 행을 확인했다. 사이드바는 키보드 250→260px, 드래그 260→300px 및 재진입 후 유지했다. API 가입·수락은 실제 HTTP/SQLite 테스트로 검증하고 브라우저에서는 새 비밀번호를 입력하지 않았다. 복사 완료 안내는 관찰했으나 브라우저 커넥터의 클립보드 읽기와 일치하지 않아 실제 OS 클립보드 내용은 검증 완료로 표시하지 않는다.

참여 링크는 초기 진입뿐 아니라 같은 문서의 popstate/hashchange에서도 Router가 읽기 전에 fragment를 제거한다. 페이지 지역 토큰을 바꾸고 이전 미리보기 응답이 새 링크를 덮어쓰지 않게 한다. 해당 전달·재열기·제거 계약은 클라이언트 테스트에 포함했다.

두 탭에서 제품 개발팀과 운영팀을 각각 열고 선택을 바꿔도 기존 탭의 URL·공간 메뉴·초대 목록이 유지되는 것을 확인했다. 기본 개발 서버도 V2로 기동했으며 기존 DB는 초기화하지 않았다.

유효 초대의 실제 브라우저 미리보기에서 공간·역할·만료와 로그인 이메일 불일치 안내를 확인했다. 새로고침 시 토큰 없는 안내, 같은 참여 페이지에 원래 링크를 다시 열 때 fragment 제거와 새 미리보기 진입도 확인했다.

임시 검증 컨테이너 `bit-t003-verify`와 볼륨 `bit-t003-verify-data`는 제거했다. 최종 뷰포트 설정은 390×844 / 1440×960이며 브라우저 관측 innerWidth는 각각 391/1441이었다. 가로 넘침은 없었고 임시 뷰포트·탭은 정리했다. 기본 개발 서버는 사용자 요청으로 백그라운드에서 다시 기동하고 프론트 프록시의 health=UP까지 확인했다.

### 추가 UI 수정 및 아이콘 교체 (2026-10-22)

사용자 피드백에 따라 상단 헤더 접기·접힌 프로젝트 안내 숨김·HR 기본 아바타와 프로필 박스·공통 창 구분선·BIT SVG 로고/파비콘을 반영했다(D-045). 후속 지시에 따라 메뉴와 동작 아이콘은 Kaneo와 같은 Lucide로 교체하고 Hugeicons 직접 의존성을 제거했다(D-046). 자동 진행·별도 에이전트 작업이나 후속 업무 구현은 시작하지 않았다.

| 원본/기준 | BIT 반영 | 확인 |
|---|---|---|
| HR WorkspaceShell | 상단 헤더의 접기, SideNav 기본 하단 버튼 제거 | 펼침/접힘에서 버튼 한 개, 접힘에서 프로젝트 빈 안내 없음 |
| HR AccountMenu/ProfileMenu | 같은 손그림 SVG 18종, 이름·이메일 박스, 접힌 아바타 팝오버 | 실제 로그인 계정으로 두 상태 확인, 이메일 말줄임, 배경·팝오버 여백/구분선 확인 |
| HR frame 헤더·본문·푸터 | shared CompactDialog | 초대 폼·Agent 안내에서 두 구분선, 취소/Escape 닫기, 데스크톱 원래 트리거로 초점 복귀 |
| 모바일 BottomSheet | 같은 창 내용·고정 액션 영역 | 390×844 설정(관측 폭 391px)에서 초대 폼·프로필 더보기 확인, 가로 넘침 없음. 실제 소프트 키보드 미확인 |
| Kaneo lucide-react | NavIcon의 Lucide 개별 import | 메뉴·접기·닫기·설정 아이콘 실제 화면 확인 |
| BIT 심볼 SVG | 제품 마크·favicon 생성 스크립트 | 생성 명령 성공, 밝은 불투명 파비콘과 테마에 맞는 제품 마크 |

`npm run check --prefix client` 재실행 통과(컴포넌트 규칙·FSD·9개 테스트·타입 검사·프로덕션 빌드). 최종 JS 820.29kB/gzip 243.58kB로 필요한 아이콘만 포함했다. `npm audit --prefix client --omit=dev`의 운영 의존성 취약점은 0개이며 개발 도구의 기존 감사 항목은 별도다. 서버 코드는 이번 UI 수정으로 바꾸지 않았다. 검증 중 새 초대/권한/자격 증명은 생성하지 않았고 임시 뷰포트는 원복한다.

추가 시각 수정: 사용자 요청으로 공통 팝오버·드롭다운·선택 목록·다이얼로그 표면에 사용자 추가 요청에 따라 옅은 기본 경계 색상 토큰(`--color-border`)의 테두리를 적용했다. 실제 필터 팝오버에서 테두리 표시와 Escape 닫기를 확인했고 `npm run check --prefix client`가 통과했다. 테두리는 밝기 모드의 테마 토큰을 따른다.
