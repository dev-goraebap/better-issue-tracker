# 02. 도메인 모델

## 변경의 흐름
문서든 코드든 바뀌는 이유를 따라가면 대부분 다섯 가지 **트리거** 중 하나다.

| 트리거 | 예 |
|---|---|
| 요구 (request) | 고객·사용자·PM의 요구사항 추가/변경 |
| 발견 (finding) | 버그, 장애, 테스트 실패, 사용 중 불편 |
| 외부 변화 (external) | 법규·정책, 연동 시스템 변경, 라이브러리 EOL, 보안 취약점 |
| 개선 (improvement) | 기술부채, 리팩터링, 성능 (스스로 판단) |
| 계획 (planned) | 로드맵에 있던 다음 단계 |

트리거가 곧바로 변경이 되지 않는다. 사이에 반드시 **결정**이 있다.

```
[트리거]  요구 / 발견 / 외부변화 / 개선 / 계획
    ↓
[결정]    무엇을, 왜, 어떤 대안을 버리고   ← 회의, 혼자 고민, 에이전트 세션
    ↓
[업무] 실행 단위. "이 결정을 수행한다"
    ↓
[변경]    문서 개정(사유 = 업무)  →  코드 커밋(업무 번호 포함)
    ↓
[완료]    업무 종료, 결과가 결정에 다시 연결됨
```

트리거 = 입력, 결정 = 판단, 업무 = 실행 단위. Redmine은 이 셋을 일감 하나에 뭉쳐서
"왜?"를 찾으려면 댓글을 뒤져야 한다. BIT는 분리한다.

## 엔티티

실제 테이블은 `06-schema.md`.

상위 계층은 Kaneo를 따른다 (D-009).

```
Instance            설치 1개. 첫 가입자가 인스턴스 관리자
 └─ Workspace      멤버·역할(viewer/member/admin/owner)·초대의 단위
     ├─ 문서함     Folder 트리 + Artifact. 워크스페이스에 하나 (D-015)
     └─ Project    아래 엔티티들이 붙는 단위
```

```
Project
 ├─ ProjectKeyAlias 바뀌기 전 프로젝트 키 (D-011)
 ├─ WorkItem           업무 (Kaneo의 task)              + trigger_type
 ├─ Decision        결정                             독립 엔티티
 ├─ Session         회의 / 에이전트 세션 기록         결정의 출처
 ├─ (산출물은 워크스페이스 문서함 소속, 프로젝트는 라벨로 연결 — D-015)
 ├─ CodeRef         커밋 / 브랜치 / MR 참조 (웹훅으로 수집)
 └─ Baseline        릴리스 기준선 (이후)
Link                엔티티 간 관계 (범용)
```

### Work item
Kaneo task 확장. 추가 필드: `trigger_type`. 결정·산출물·코드·다른 업무와의 관계는 Link로 (D-014).
업무 키는 Kaneo 형식 `{프로젝트 키}-{번호}`(예: `BIT-42`). 번호는 프로젝트별로 원자적으로 증가한다.
커밋 메시지·브랜치·문서 개정 사유에서 참조되는 핵심 키.
프로젝트 키는 바꿀 수 있고, 옛 키는 별칭(ProjectKeyAlias)으로 남아 계속 인식된다 (D-011).

### Decision
- 무엇을 결정했나 (title, body)
- 왜 (트리거, 맥락)
- **기각한 대안과 이유** ← 나중에 가장 값진 정보
- 상태: `제안(proposed) → 확정(accepted) → 대체됨(superseded)`
  - 뒤집을 때 지우지 않고 "D-012로 대체됨"으로 남긴다.
- 출처: Session (회의 또는 에이전트 세션) — Link `derives_from`
- 파생된 업무, 영향받는 산출물
- 이행 진행은 상태가 아니라 계산값: 파생 업무 중 종료된 수 / 전체 수 (D-012). 파생 업무가 없으면 "해당 없음".

기록 기준: "6개월 뒤의 내가 '왜 이렇게 했지?'라고 물을 만한 것"만. 사소한 판단은 업무 댓글로.

### Session
팀 회의록과 혼자 한 에이전트 세션 요약을 **같은 개념**으로 다룬다.

| | 팀 작업 | 혼자 작업 |
|---|---|---|
| 대화가 일어나는 곳 | 회의 | 에이전트 세션 |
| 원본 기록 | 회의록 | 세션 요약 (또는 로그) |
| 남겨야 할 결론 | 결정 | 결정 (동일) |

필드: `type (meeting | agent_session)`, 일시, 참석자/에이전트, 요약 본문, 도출된 결정들.

### Folder / Artifact / ArtifactVersion
- 워크스페이스 문서함 하나에 들어간다 (D-015). 파일 탐색기처럼 폴더를 자유롭게 만든다.
- Folder: 워크스페이스, 상위 폴더, 이름.
- Artifact: 고정 문서 ID (예: `REQ-001`, `DES-003` — 워크스페이스 안에서 고유), 제목, 종류, 폴더,
  프로젝트 라벨(0개 이상). 라벨이 없으면 문서함에서만 보이고, 라벨이 붙으면 그 프로젝트의 산출물 화면에도 보인다.
  정본 종류 `source_type (upload | markdown | git)` (D-016). Git이면 저장소·경로·추적 브랜치.
  파일 종류 `kind (file | managed)` (D-018). 1차는 `file`만. 문서 ID는 `managed`일 때만.
- ArtifactVersion: 버전 번호(v1.0, v1.1, v2.0 — 확정 시 부여, 초안은 번호 없음),
  정본(업로드 파일, 또는 Git 커밋/태그), 파생본(텍스트 변환본·PDF)과 변환 상태,
  상태(`draft | released | superseded`), **개정 사유(업무/결정 링크)**, 작성자, 검토자.
  `draft`는 산출물당 최대 1개이고 다시 올리면 덮어쓴다 (D-013).
  1차(`file`만)에는 산출물당 버전 행이 1개이고 다시 올리면 그 행을 덮어쓴다. 테이블은 처음부터 나눠 둔다 (D-019).
- 상세는 `04-artifact-control.md`.

### CodeRef
Git은 소유하지 않고 참조만. GitLab/Gitea/GitHub 웹훅으로 커밋·MR을 받아
메시지 속 업무 키(`BIT-42`)로 자동 연결.
Kaneo에도 웹훅 연동이 있지만 브랜치·PR 단위만 남고(push는 마지막 커밋 1개), 커밋 메시지는 파싱하지 않으며 프로젝트당 저장소 1개다.
BIT는 **커밋 단위**로 기록하고 커밋 메시지를 파싱한다(흐름 D 역추적의 출발점).

### Link
**소속 관계는 각 테이블의 FK, 왜·근거 관계는 모두 범용 Link 테이블 하나** (D-014).
- FK(소속): Workspace→Instance, Project·Folder·Artifact→Workspace, Folder→상위 Folder, Artifact→Folder,
  Work item·Decision·Session·CodeRef→Project, ArtifactVersion→Artifact
- 산출물 ↔ 프로젝트 라벨은 다대다 연결표(artifact_project). 추적(왜·근거)이 아니라 분류·필터라서 Link에 넣지 않는다.
- Link(왜·근거): (from_type, from_id, to_type, to_id, relation). 예: D-007 `derives_from` S-03, BIT-42 `derives_from` D-007,
  BIT-42 `revises` DES-003(v1.3, "3.2항"), 커밋 abc123 `implements` BIT-42, D-012 `supersedes` D-007
- 산출물을 가리키는 Link는 `to_type=artifact`에 버전 칸 `artifact_version_id`와 위치 메모 `anchor`(예: "3.2항")를 둔다.
  1차에는 둘 다 비어 있고, 관리 문서가 생기면 채운다 (D-019). 그래서 DES-003의 모든 링크를 버전과 상관없이 한 번에 찾을 수 있다.
- Link 대상이 실제로 있는지는 DB가 검사하지 못하므로 애플리케이션(link 모듈)이 생성 시 검사한다.
  대상이 소프트 삭제되면 Link는 남기되 조회에서 숨긴다.
relation 예: `derives_from`, `implements`, `revises`, `based_on`, `supersedes`.
이 그래프가 연결 타임라인과 역추적, MCP 맥락 패키지의 원천.
Kaneo의 `task_relation`(작업↔작업)과 `external_link`(작업↔외부)는 출발점이 작업으로 고정되어 있어 이것으로 대체한다.
Kaneo의 `activity`도 작업에만 붙으므로, 결정·산출물 이력을 담으려면 대상 유형을 일반화해야 한다.

## 에이전트 관점 (MCP 초안)
"업무 BIT-42 처리해줘" 한 마디로 에이전트가 다음을 한 번에 가져갈 수 있어야 한다.
- 업무 본문/댓글
- 연결된 결정 (기각된 대안 포함)
- 근거 산출물의 텍스트 (1차는 현재 내용, 관리 문서가 생기면 최신 확정본 + 이전 버전과의 diff)
- 관련 커밋/MR

도구 목록은 `07-mcp.md` (D-022). 위 묶음은 `get_work_item_context` 하나가 돌려준다.
