# 07. MCP 도구 (1차)

에이전트가 1순위 사용자다(D-006). 그래서 이 문서가 화면보다 먼저 정해진다.
목표는 `03-user-flows.md`의 흐름 A가 **사람이 맥락을 옮기지 않고** 끝나는 것이다.

> 2026-10-22 작성. Kaneo MCP(`packages/mcp/src/tools/register.ts`, 도구 약 40개)를 참고했다. 이 문서의 방향은 D-022.

## 방향

| 항목 | 정한 것 |
|---|---|
| 서버 형태 | 인스턴스에 내장한 **HTTP MCP 엔드포인트** `/api/mcp` (Streamable HTTP) 하나. stdio 패키지는 만들지 않는다 |
| 인증 | `Authorization: Bearer <API 키>` (D-021). 키 주인의 워크스페이스 역할로 권한 판정, 키의 `agent_name`을 기록에 남김 |
| 호출 경로 | MCP 도구 → 각 모듈의 Facade. REST API를 다시 부르지 않는다 (같은 서버 안) |
| 가리키는 방법 | UUID 대신 **사람이 읽는 참조**를 받는다. `BIT-42`(작업항목), `BIT D-007`·`D-007`(결정), `S-003`(세션). 산출물은 1차에 문서 ID가 없어 `artifact` ID |
| 도구 수 | 24개 (Kaneo 약 40개). 자주 함께 쓰는 정보는 한 번에 돌려주는 "맥락 도구"로 묶는다 |
| 삭제 | 1차 MCP에는 삭제 도구가 없다. 작업항목은 보관(archive), 링크는 해제(unlink)만 |
| 응답 | JSON. 본문(Markdown)은 그대로, 긴 산출물 텍스트는 잘라서 주고 잘렸음을 표시 |

참조 규칙
- `D-007`, `S-003`처럼 프로젝트 키가 없으면 `project` 인자(또는 같은 호출의 작업항목 프로젝트)로 해석한다.
- 프로젝트 키는 현재 키와 별칭을 모두 받는다 (D-011). 응답에는 항상 현재 키로 돌려준다.

---

## 도구 목록

### 시작·탐색 (4)

| 도구 | 입력 | 돌려주는 것 | 흐름 |
|---|---|---|---|
| `whoami` | — | 사용자, 키의 `agent_name`, 속한 워크스페이스·역할 | 공통 |
| `list_projects` | `workspace?` | 프로젝트 목록 (현재 키, 이름, 진행 중 작업항목 수) | 공통 |
| `get_project_overview` | `project` | 최근 결정, 진행 중 작업항목, 최근 바뀐 산출물, 최근 세션, 보드 컬럼 | **E** 오랜만에 복귀 |
| `search` | `query`, `types?`, `project?` | 작업항목·결정·세션·산출물을 섞어 찾은 결과 (참조, 제목, 발췌) | 공통 |

### 작업항목 (5)

| 도구 | 입력 | 돌려주는 것 | 흐름 |
|---|---|---|---|
| `get_work_item_context` | `ref` | 아래 "맥락 묶음" | **A** 핵심 |
| `list_work_items` | `project`, `column?`, `backlog?`, `assignee?`, `label?`, `trigger_type?`, `include_closed?` | 목록 (커서 페이징) | A, B |
| `create_work_item` | `project`, `title`, `description?`, `trigger_type?`, `priority?`, `labels?`, `column?`, `derives_from?` (결정 참조) | 새 키 `BIT-43` | A(작업항목 없이 시작), B, C |
| `update_work_item` | `ref`, 바꿀 값 (`title`, `description`, `priority`, `trigger_type`, `assignee`, `labels`, `start_date`, `due_date`) | 바뀐 작업항목 | A |
| `move_work_item` | `ref`, `column` 또는 `backlog: true` 또는 `archive: true` | 바뀐 위치. 완료 컬럼이면 `closed_at`이 찍힘 | A, B |

**맥락 묶음** (`get_work_item_context`) — "BIT-42 처리해줘" 한 마디로 가져가는 것 (02의 "에이전트 관점")
- 작업항목 본문, 상태, 라벨, 최근 댓글
- 연결된 결정: 무엇을 / 왜 / **기각한 대안**, 상태, 출처 세션 요약
- 근거 산출물: 제목, 폴더 경로, 위치 메모, 텍스트 파생본(또는 Markdown 본문) — 길면 앞부분과 목차
- 관련 커밋·MR (최근 것부터)
- 관련 작업항목 (blocks, subtask_of 등)

### 결정 (4)

| 도구 | 입력 | 돌려주는 것 | 흐름 |
|---|---|---|---|
| `get_decision` | `ref` | 본문, 기각한 대안, 상태, 출처 세션, 파생 작업항목과 "이행 2/3"(D-012), 대체 관계 | D |
| `list_decisions` | `project`, `status?` | 목록 | E |
| `create_decision` | `project`, `title`, `body`, `rejected_alternatives`, `trigger_type?`, `status?` (기본 proposed), `session?` | 새 참조 `D-008` | A, C |
| `update_decision` | `ref`, 바꿀 값, `status?` (accepted / superseded), `superseded_by?` | 바뀐 결정. superseded면 `supersedes` 링크도 만듦 | C |

### 세션 (3)

| 도구 | 입력 | 돌려주는 것 | 흐름 |
|---|---|---|---|
| `record_session` | `project`, `type` (agent_session / meeting), `title`, `summary`, `participants?`, `decisions?` (create_decision 입력의 배열), `work_items?` (관련 작업항목 참조) | 새 `S-004`와 함께 만든 `D-…` 목록 | **A-4** "오늘 정한 거 기록해줘" |
| `get_session` | `ref` | 요약, 참석자, 도출된 결정 | D |
| `list_sessions` | `project`, `type?` | 목록 | E |

`record_session`은 세션과 그 세션에서 나온 결정을 **한 번의 호출**로 만든다. 결정마다 `derives_from` 링크가 자동으로 생긴다.
기록이 여러 번의 도구 호출로 쪼개지면 세션 끝에 에이전트가 일부를 빠뜨리기 쉽기 때문이다.

### 산출물 (4) — 1차는 일반 파일만 (D-019)

| 도구 | 입력 | 돌려주는 것 | 흐름 |
|---|---|---|---|
| `list_artifacts` | `folder?` (경로), `project?` (라벨), `query?` | 폴더·산출물 목록 | 공통 |
| `get_artifact` | `id`, `offset?` | 정보, 정본 종류, 텍스트 파생본 또는 Markdown 본문(길면 나눠서), 연결된 작업항목·결정 | A |
| `register_artifact` | `title`, `folder?` (경로, 없으면 만듦), `projects?`, 그리고 `markdown` 본문 **또는** `git` (`repository`, `path`, `branch`) | 새 `id` | A |
| `update_artifact` | `id`, 바꿀 값 (`markdown`, `title`, `folder`, `projects`, `description`) | 바뀐 산출물. Markdown이면 덮어씀 (일반 파일) | A |

- docx·xlsx 같은 바이너리 업로드는 MCP에 두지 않는다. 사람은 웹으로, 스크립트는 REST 업로드 API로 올린다.
- 관리 문서 도구(확정, 버전 비교, 변경 요약)는 관리 문서와 함께 추가한다 (이후).

### 연결·추적 (3)

| 도구 | 입력 | 돌려주는 것 | 흐름 |
|---|---|---|---|
| `link` | `from`, `relation`, `to`, `anchor?` | 만든 링크 | A, C |
| `unlink` | `from`, `relation`, `to` | — | 공통 |
| `trace` | `ref` (작업항목·결정·세션·산출물·커밋 SHA), `direction?` (up / down / both), `depth?` | 링크 그래프를 따라간 결과와 시간순 타임라인 | **D** "이거 왜 이렇게 돼 있지?" |

`trace`의 `up`은 "왜"(커밋 → 작업항목 → 결정 → 세션) 방향, `down`은 "그래서 무엇이"(결정 → 작업항목 → 커밋·산출물) 방향이다.

### 댓글 (1)

| 도구 | 입력 | 돌려주는 것 |
|---|---|---|
| `add_comment` | `target` (작업항목·결정·세션·산출물 참조), `body` | 만든 댓글 (D-020) |

---

## 흐름별로 쓰는 도구

| 흐름 | 도구 순서 |
|---|---|
| A. 혼자 에이전트와 개발 | `get_work_item_context` → (작업) → `move_work_item` → `record_session` |
| A. 작업항목 없이 시작 | `search` → `create_work_item` → 위와 같음 |
| B. 버그 | `create_work_item`(trigger_type: finding) → `move_work_item` |
| C. 요구 변경 | `record_session`(결정 포함) → `create_work_item`(derives_from) × n → `update_artifact` / `link`(revises) |
| D. 역추적 | `trace`(커밋 SHA 또는 작업항목, up) |
| E. 복귀 | `get_project_overview` → `get_work_item_context` |

커밋 연결은 MCP가 아니라 웹훅이 한다. 에이전트는 커밋 메시지에 작업항목 키를 넣기만 하면 된다.

## Kaneo 도구 중 1차에 넣지 않는 것

| Kaneo 도구 | 이유 |
|---|---|
| `delete_task`, `delete_task_comment`, `delete_label` | MCP에서 삭제하지 않음 (보관·해제만) |
| 라벨 CRUD (`create_label`, `attach_label_to_task` 등) | `create_work_item`/`update_work_item`의 `labels`로 처리. 없는 라벨은 만들지 않고 오류 |
| `duplicate_task` | 드물게 쓰임 |
| 시간 기록, 사용자 정의 필드 도구 | 해당 기능이 1차에 없음 (06-schema) |
| `list_notifications` | 알림은 사람용 |
| `update_task_status` / `update_task_assignee` / `update_task_due_date` 따로따로 | `move_work_item`과 `update_work_item` 하나로 합침 |
| `create_task_relation` 등 관계 도구 | `link` 하나로 합침 (D-014) |
