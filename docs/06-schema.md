# 06. DB 스키마 (1차)

`02-domain-model.md`의 개념을 실제 테이블로 옮긴 것이다. 규칙은 `conventions.md` 5절(SandboxHr DB 규칙)을 따른다.
이 문서가 `V1__schema.sql`을 쓸 때의 기준이다. 표기한 타입은 SandboxHr 스키마와 같은 타입 이름이다.

> 2026-10-22 작성. 이 문서를 쓰면서 정한 것은 맨 아래 "이 문서에서 정한 것"과 D-020, D-021에 있다.

## 공통 규칙 (요약)

| 항목 | 규칙 |
|---|---|
| 테이블 | 단수 snake_case. 인증 계열만 `iam_` 접두사 |
| 기본 키 | `<table>_id uuid` (앱이 UUID v4 생성), 제약 `<table>_pkey` |
| 이름 | FK `<t>_<col>_<ref>_<refcol>_fk`, 고유 `ux_`, 인덱스 `ix_`, CHECK `ck_` |
| 순간 | `timestamptz` — UTC 텍스트, 소수 6자리 고정 |
| 참거짓 | `boolean` — `1`/`0` |
| 감사 열 | 아래 표의 "감사" = `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by` |
| 소프트 삭제 | `deleted_at` 하나. 고유 제약은 `WHERE deleted_at IS NULL` 부분 인덱스 |
| 열거값 | `varchar` + CHECK. 값은 소문자 snake_case |
| 본문 | Markdown 글자는 `text` |

SQLite 고유 인덱스는 NULL을 서로 다른 값으로 본다. NULL이 들어갈 수 있는 열로 고유를 걸 때는 `coalesce(col, '')` 식 인덱스를 쓴다.

## 개요

```mermaid
erDiagram
  iam_user ||--o{ workspace_member : "속함"
  workspace ||--o{ workspace_member : ""
  workspace ||--o{ project : ""
  workspace ||--o{ folder : "문서함"
  workspace ||--o{ artifact : "문서함"
  project ||--o{ project_key : "현재 키 + 별칭"
  project ||--o{ board_column : ""
  project ||--o{ work_item : ""
  project ||--o{ decision : ""
  project ||--o{ session_record : ""
  project ||--o{ git_repository : ""
  git_repository ||--o{ code_ref : ""
  artifact ||--o{ artifact_version : ""
  artifact_version ||--o{ artifact_rendition : "파생본"
  artifact ||--o{ artifact_project : "프로젝트 라벨"
  link }o--o{ work_item : "왜·근거 (다형)"
```

`link`, `activity`, `comment`는 대상 종류가 여럿이라 DB FK가 없다(D-014, D-020). 그림의 마지막 줄은 그 관계를 대표로 하나만 그린 것이다.

---

## 1. iam — 인스턴스와 인증

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `iam_user` | `iam_user_id`, `email varchar(256)`, `name varchar(64)`, `avatar_blob_id uuid?`, `is_instance_admin boolean`, 감사 | `ux_iam_user_email` (deleted_at IS NULL) |
| `iam_session` | `iam_session_id`, `iam_user_id`, `token_hash varchar(128)`, `active_workspace_id uuid?`, `expires_at`, `absolute_expires_at`, `last_seen_at`, `created_at` | `ux_iam_session_token_hash` |
| `iam_api_key` | `iam_api_key_id`, `iam_user_id`, `name varchar(64)`, `agent_name varchar(64)?`, `prefix varchar(16)`, `key_hash varchar(128)`, `last_used_at?`, `expires_at?`, `revoked_at?`, `created_at` | `ux_iam_api_key_key_hash` |
| `iam_password` | `iam_user_id` (PK이자 FK), `password_hash varchar(256)`, `failed_count integer`, `locked_until?`, `changed_at`, `must_change boolean` | — |
| `iam_email_otp` | `iam_email_otp_id`, `email`, `purpose varchar(16)`, `code_hash varchar(128)`, `attempt_count integer`, `expires_at`, `consumed_at?`, `created_at` | `ix_iam_email_otp_email_created_at`, `ck_..._purpose` (sign_in, password_reset) |

- **첫 관리자**: 첫 가입자가 `is_instance_admin = 1` (Kaneo 방식, D-009). 가입 트랜잭션 안에서 "관리자가 없으면 나를 관리자로"를 처리한다.
- **에이전트**: 별도 계정이 아니라 사람의 API 키로 움직인다. 키에 `agent_name`(예: `codex`, `claude-code`)을 적어 두면 기록에 남는다 (D-021).
- **로그인(D-027)**: 이메일 + 비밀번호가 기본이다. 비밀번호는 Spring Security `DelegatingPasswordEncoder` 기본(bcrypt)으로 해시해 `iam_password`에 둔다.
  연속 5회 실패하면 15분 잠근다. 메일 서버(SMTP)를 설정했을 때만 `iam_email_otp`로 OTP 로그인과 비밀번호 재설정 메일을 쓴다(SandboxHr OTP 규칙: 6자리, 5분, 5회).
  메일 서버가 없으면 인스턴스 관리자가 임시 비밀번호를 발급하고 `must_change = 1`로 둔다.

## 2. workspace

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `workspace` | `workspace_id`, `name varchar(64)`, `slug varchar(64)`, 감사 | `ux_workspace_slug` |
| `workspace_member` | `workspace_member_id`, `workspace_id`, `iam_user_id`, `role varchar(16)`, `joined_at` | `ux_workspace_member_workspace_id_iam_user_id`, `ck_workspace_member_role` (owner, admin, member, viewer) |
| `workspace_invitation` | `workspace_invitation_id`, `workspace_id`, `email`, `role`, `token_hash`, `status varchar(16)`, `expires_at`, `invited_by`, `created_at` | `ck_..._status` (pending, accepted, revoked, expired) |
| `label` | `label_id`, `workspace_id`, `name varchar(32)`, `color varchar(7)`, 감사 | `ux_label_workspace_id_name` (deleted_at IS NULL) |

- 역할 4개는 고정값이다. Kaneo의 워크스페이스별 사용자 정의 역할(`workspace_role`)과 멤버별 프로젝트 접근 제한은 1차에 넣지 않는다.
- 라벨은 워크스페이스에 한 벌만 두고 작업항목과는 연결표로 잇는다. Kaneo처럼 작업마다 사본 행을 만들지 않는다 (D-009).

## 3. project

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `project` | `project_id`, `workspace_id`, `name varchar(64)`, `icon varchar(32)?`, `description text?`, `position integer`, `last_work_item_number integer`, `last_decision_number integer`, `last_session_number integer`, `archived_at?`, 감사 | `ix_project_workspace_id` |
| `project_key` | `project_key_id`, `project_id`, `workspace_id`, `key varchar(10)`, `is_current boolean`, `created_at` | `ux_project_key_workspace_id_key` (모든 행), `ux_project_key_project_id_current` (is_current = 1), `ck_project_key_key` (대문자·숫자, 2~10자) |
| `board_column` | `board_column_id`, `project_id`, `name varchar(32)`, `position integer`, `color varchar(7)?`, `is_final boolean`, 감사 | `ix_board_column_project_id_position` |

- **프로젝트 키(D-011)**: 현재 키와 옛 키(별칭)를 한 테이블에 둔다. 워크스페이스 안에서 `key`가 모든 행에 걸쳐 고유하므로, 별칭으로 쓰인 키를 다른 프로젝트가 가져가는 것을 DB가 막는다. 키를 바꾸면 기존 행의 `is_current`를 0으로 내리고 새 행을 넣는다.
- **번호**: 작업항목·결정·세션 번호는 프로젝트별로 1부터 증가한다. 새 번호는 `last_*_number`를 증가시켜 받는다(쓰기 잠금 안에서 처리, SQLite `BEGIN IMMEDIATE`).
- **보드 컬럼**: 프로젝트를 만들 때 할 일 / 진행 중 / 검토 중 / 완료(`is_final`) 4개를 넣는다 (Kaneo 기본값).

## 4. workitem

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `work_item` | `work_item_id`, `project_id`, `number integer`, `title varchar(200)`, `description text?`, `board_column_id uuid?`, `position real`, `priority varchar(8)?`, `trigger_type varchar(16)?`, `assignee_id uuid?`, `start_date date?`, `due_date date?`, `closed_at?`, `archived_at?`, 감사 | `ux_work_item_project_id_number`, `ix_work_item_board_column_id_position`, `ck_..._priority` (low, medium, high, urgent), `ck_..._trigger_type` (request, finding, external, improvement, planned) |
| `work_item_label` | `work_item_label_id`, `work_item_id`, `label_id`, `created_at` | `ux_work_item_label_work_item_id_label_id` |

- **상태는 컬럼 하나로**: `board_column_id`가 NULL이면 백로그다. Kaneo처럼 상태 문자열과 컬럼 ID를 함께 두지 않는다 (D-009).
- **`closed_at`**: `is_final` 컬럼으로 옮길 때 채우고, 다른 컬럼으로 나오면 비운다. 결정의 "이행 2/3" 계산(D-012)이 이 값을 센다.
- **작업항목 키**는 저장하지 않고 `project_key`(현재 키) + `number`로 만든다. 웹훅 파싱은 현재 키와 별칭을 모두 찾는다.
- **작업항목끼리의 관계**(blocks, subtask 등)는 `link`에 둔다 (D-014).
- 1차에 넣지 않는 Kaneo 기능: 시간 기록(`time_entry`), 사용자 정의 필드, 상태 자동 이동 규칙(`workflow_rule`).

## 5. decision / session

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `decision` | `decision_id`, `project_id`, `number integer`, `title varchar(200)`, `body text`, `rejected_alternatives text?`, `status varchar(16)`, `trigger_type varchar(16)?`, `accepted_at?`, `superseded_at?`, 감사 | `ux_decision_project_id_number`, `ck_..._status` (proposed, accepted, superseded) |
| `session_record` | `session_record_id`, `project_id`, `number integer`, `type varchar(16)`, `title varchar(200)`, `occurred_at`, `summary text`, 감사 | `ux_session_record_project_id_number`, `ck_..._type` (meeting, agent_session) |
| `session_participant` | `session_participant_id`, `session_record_id`, `kind varchar(8)`, `iam_user_id uuid?`, `display_name varchar(64)`, `created_at` | `ck_..._kind` (user, agent, guest) |

- `body`에는 "무엇을 / 왜", `rejected_alternatives`에는 "기각한 대안과 이유"를 Markdown으로 쓴다. 대안을 행 단위로 쪼개지 않는다.
- 결정의 출처(세션), 대체(결정 → 결정), 파생 작업항목은 모두 `link`다 (D-014).
- 이행 진행은 저장하지 않고 계산한다 (D-012).
- 테이블 이름이 `session`이 아닌 이유: 로그인 세션(`iam_session`)과 헷갈리지 않게.
- 표시 번호: 프로젝트 안에서 `D-007`, `S-003`. 다른 프로젝트 것을 가리킬 때는 `BIT D-007`처럼 프로젝트 키를 앞에 붙인다.

## 6. artifact — 문서함

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `folder` | `folder_id`, `workspace_id`, `parent_folder_id uuid?`, `name varchar(128)`, 감사 | `ux_folder_workspace_id_parent_name` (coalesce(parent_folder_id,''), name, deleted_at IS NULL) |
| `artifact` | `artifact_id`, `workspace_id`, `folder_id uuid?`, `title varchar(200)`, `description text?`, `kind varchar(8)`, `doc_id varchar(32)?`, `source_type varchar(16)`, `git_repository_id uuid?`, `git_path varchar(512)?`, `git_branch varchar(128)?`, 감사 | `ux_artifact_workspace_id_doc_id` (doc_id IS NOT NULL, deleted_at IS NULL), `ck_..._kind` (file, managed), `ck_..._source_type` (upload, markdown, git), `ck_..._git` (source_type = git이면 git 열 필수) |
| `artifact_project` | `artifact_project_id`, `artifact_id`, `project_id`, `created_at` | `ux_artifact_project_artifact_id_project_id` |
| `artifact_version` | `artifact_version_id`, `artifact_id`, `status varchar(16)`, `version_label varchar(16)?`, `blob_id uuid?`, `git_commit_sha varchar(40)?`, `git_ref varchar(128)?`, `change_summary text?`, `released_at?`, `released_by?`, 감사 | `ux_artifact_version_artifact_id_open` (status IN (current, draft)), `ck_..._status` (current, draft, released, superseded) |
| `artifact_rendition` | `artifact_rendition_id`, `artifact_version_id`, `kind varchar(8)`, `blob_id uuid?`, `status varchar(8)`, `converter varchar(64)?`, `error_message text?`, `created_at`, `updated_at` | `ux_artifact_rendition_version_id_kind`, `ck_..._kind` (text, pdf), `ck_..._status` (pending, done, failed) |

- **1차(D-019)**: `kind`는 항상 `file`, `doc_id`는 비어 있다. 산출물마다 `artifact_version` 행이 하나(`status = current`)이고, 다시 올리면 그 행을 덮어쓴다(이전 blob은 정리 대상).
- **관리 문서(이후)**: `status`가 `draft → released → superseded`로 쓰인다. 열린 행(current 또는 draft)은 산출물당 하나라 D-013(초안 한 칸)을 DB가 지킨다. 열과 인덱스는 1차부터 만들어 두므로 테이블을 쪼개는 마이그레이션이 필요 없다.
- **정본(D-016)**: 업로드·플랫폼 Markdown이면 `blob_id`, Git이면 `git_commit_sha`(+ 확정 시 `git_ref`). 1차의 Git 정본은 추적 브랜치의 최신 커밋을 `current` 행에 갱신한다.
- **파생본**: 텍스트 변환·PDF는 `artifact_rendition`. 변환은 트랜잭션 밖 작업이 만들고 상태만 갱신한다. `converter`에 도구와 버전을 남겨, 도구가 바뀌면 다시 만들 수 있게 한다.
- **개정 사유**는 열이 아니라 `link`(작업항목/결정 `revises` 산출물)다. 변경 요약은 사람이 쓰는 글이라 열로 둔다.
- 폴더 `folder_id`가 NULL이면 문서함 맨 위에 있다.

## 7. coderef — Git 참조

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `git_repository` | `git_repository_id`, `project_id`, `provider varchar(8)`, `url varchar(512)`, `external_id varchar(128)`, `default_branch varchar(128)`, `webhook_secret_hash varchar(128)`, `read_token_encrypted text?`, `read_token_expires_at?`, 감사 | `ux_git_repository_project_id_url`, `ck_..._provider` (github, gitlab, gitea) |
| `code_ref` | `code_ref_id`, `git_repository_id`, `kind varchar(16)`, `external_id varchar(128)`, `title text?`, `author_name varchar(128)?`, `author_email varchar(256)?`, `url varchar(512)`, `state varchar(16)?`, `occurred_at`, `created_at`, `updated_at` | `ux_code_ref_repository_id_kind_external_id`, `ix_code_ref_repository_id_occurred_at`, `ck_..._kind` (commit, merge_request, branch) |

- 프로젝트 하나에 저장소 여러 개를 붙일 수 있다 (Kaneo는 1개).
- **커밋 단위로 기록한다**: push 웹훅의 커밋마다 `code_ref` 행을 만들고, 메시지에서 작업항목 키를 찾아 `link`(`implements`)를 만든다. `external_id`는 커밋이면 SHA, MR이면 번호, 브랜치면 이름.
- **Git 정본 읽기(D-028)**: 연결할 때 읽기 전용 토큰을 받아 `read_token_encrypted`에 암호화해 둔다(키는 첫 실행 때 생성하는 비밀값).
  커밋 웹훅이 오면 그 저장소를 정본으로 쓰는 산출물의 경로가 바뀌었는지 보고, 바뀐 md만 호스팅 API로 받는다. 만료 7일 전부터 화면에 알린다.

## 8. link · activity · comment — 대상이 여럿인 테이블

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `link` | `link_id`, `workspace_id`, `from_type varchar(16)`, `from_id uuid`, `to_type varchar(16)`, `to_id uuid`, `relation varchar(16)`, `artifact_version_id uuid?`, `anchor varchar(128)?`, `created_at`, `created_by`, `created_by_agent varchar(64)?`, `deleted_at?`, `deleted_by?` | `ux_link_edge` (from_type, from_id, to_type, to_id, relation, coalesce(artifact_version_id,''), deleted_at IS NULL), `ix_link_from`, `ix_link_to`, `ck_link_type` (work_item, decision, session_record, artifact, code_ref), `ck_link_relation` |
| `activity` | `activity_id`, `workspace_id`, `project_id uuid?`, `target_type varchar(16)`, `target_id uuid`, `type varchar(32)`, `actor_id uuid?`, `actor_agent varchar(64)?`, `payload jsonb?`, `occurred_at` | `ix_activity_target` (target_type, target_id, occurred_at), `ix_activity_project_id_occurred_at` |
| `comment` | `comment_id`, `target_type varchar(16)`, `target_id uuid`, `body text`, `author_agent varchar(64)?`, 감사 | `ix_comment_target` (target_type, target_id, created_at) |

- **relation 값**: `derives_from`(결정←세션, 작업항목←결정), `implements`(커밋→작업항목), `revises`(작업항목/결정→산출물), `based_on`(작업항목→근거 산출물), `supersedes`(결정→결정), `blocks`, `relates_to`, `subtask_of`(작업항목↔작업항목).
- **방향**: 화살표는 "뒤에 생긴 것 → 앞선 것" 쪽으로 저장한다. 예: `D-007 derives_from S-003`, `abc123 implements BIT-42`.
- **산출물 링크(D-019)**: `to_type = artifact`. 1차에는 `artifact_version_id`·`anchor`가 비어 있고, 관리 문서가 생기면 채운다.
- **대상 존재 검사**는 link 모듈이 만들 때 한다. 대상이 소프트 삭제되면 링크는 남기고 조회에서 숨긴다 (D-014).
- **activity / comment(D-020)**: 작업항목뿐 아니라 결정·세션·산출물에도 붙는다. 연결 타임라인은 `activity`와 `link`를 시간순으로 합쳐 그린다.
- **에이전트 표시(D-021)**: 사람 ID(`created_by`, `actor_id`)와 함께 API 키의 `agent_name`을 `*_agent` 열에 남긴다. 화면에는 "홍길동 (codex)"처럼 보인다.

## 9. file — 파일 저장 (SandboxHr `file` 모듈을 그대로)

`blob`, `attachment`(`owner_type`, `owner_id`, `name`, `position`), `pending_upload`를 SandboxHr `V1__schema.sql`에서 옮긴다.
- 산출물 정본과 파생본은 `artifact_version.blob_id`, `artifact_rendition.blob_id`로 `blob`을 직접 가리킨다.
- 작업항목 설명·댓글에 붙는 이미지 등은 `attachment`로 붙인다.
- 업로드 흐름(사전 서명 PUT → 확정 → 크기·MIME 검증), 고아 blob 정리 배치도 SandboxHr와 같다.

## 10. notification (최소)

| 테이블 | 열 | 제약·인덱스 |
|---|---|---|
| `notification` | `notification_id`, `recipient_id`, `workspace_id`, `type varchar(32)`, `target_type varchar(16)`, `target_id uuid`, `payload jsonb?`, `read_at?`, `created_at` | `ix_notification_recipient_id_read_at_created_at` |

Kaneo 메뉴의 Inbox를 위한 최소 구성이다. 알림 설정 테이블은 1차에 넣지 않는다.

---

## 1차에 만들지 않는 것

| 무엇 | 언제 |
|---|---|
| 소셜 로그인 (GitHub OAuth 등) | 필요해지면 |
| 관리 문서 동작 (열은 있음) | 이후 (D-019) |
| baseline (릴리스 기준선) | 이후 |
| 팀 모드: 편집 잠금, 검토 승인, 멤버별 프로젝트 접근 제한 | 이후 |
| Kaneo의 time_entry, custom_field, workflow_rule, workspace_role, team | 필요해지면 |
| 프로젝트별 문서함 | 이후 (D-015) |

## 이 문서에서 정한 것

관례를 따르거나 앞선 결정에서 바로 나오는 것은 따로 묻지 않고 정했다. 바꾸고 싶으면 이 목록에서 고르면 된다.

| 항목 | 정한 것 | 근거 |
|---|---|---|
| 프로젝트 키와 별칭 | 테이블 하나(`project_key`)에 `is_current`로 구분 | 별칭 포함 고유를 DB가 지킴. D-011의 "별칭 테이블"을 구현한 형태 |
| 백로그 | `board_column_id` NULL | 상태를 한 곳에만 두기 (D-009) |
| 결정·세션 번호 | 프로젝트별 증가, `D-007`/`S-003` 표시 | 작업항목 번호와 같은 방식 |
| 관리 문서용 열 | 1차부터 만들고 비워 둠 | D-019 |
| 열린 버전 한 칸 | 부분 고유 인덱스 | D-013 |
| activity·comment 대상 일반화 | D-020 | |
| 에이전트 표시 | D-021 | |
| 1차 제외 Kaneo 기능 | 위 표 | "가벼움 유지" |
