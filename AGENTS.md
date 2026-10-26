# BIT (better-issue-tracker)

AI 네이티브 경량 ALM(Application Lifecycle Management). 제품 가칭은 better-issue-tracker, 줄여서 BIT (D-024).
사람과 에이전트가 남긴 **세션 · 결정 · 산출물 · 이슈 · 코드**를 하나의 흐름으로 잇는 셀프호스팅 플랫폼.

> 이 파일은 에이전트가 가장 먼저 읽는 진입점이다. 상세 내용은 `docs/`에 있다.
> Codex와 Claude Code(v2.1.277 이상) 모두 이 파일을 직접 읽는다. 규칙은 이 파일에만 쓴다 (D-017).
> `CLAUDE.md`나 `CLAUDE.local.md`를 만들지 않는다. 하나라도 있으면 Claude Code가 이 파일 대신 그것만 읽는다.

## 왜 만드나 (한 줄)
코드(GitLab), 이유(Redmine), 근거 문서(SharePoint/NAS)가 흩어져 있어서
로컬 에이전트에게 맥락을 전달할 때마다 사람이 "맥락 배달부"가 된다. 이걸 없앤다.

## 현재 상태
- 단계: **T-004 서버·화면·Docker 검증 완료 / T-005 기반 구현** — T-004는 서버75개·클라이언트13개 검사와 대표1440/390px 화면, 이미지 빌드·healthy·V2→V3·동일 볼륨 재생성 후 인증/작업 보존 확인. 수동 미실행 범위는 T-004 지시서에 구분했다. 서버 `33c26f8`, 화면 `17ccc6f`, 입력/버튼 수정 `e3f8973`·`c843e9d`.
- 다음: **T-006 완료 (데모 화면을 실제 앱으로 옮기고 서버에 연결)** — 지시서 `docs/tasks/T-006-demo-to-app.md`(라벨·전체 조회·셸·이슈 화면·나머지 화면·뷰 저장). 다음은 HR 오피스 확장(D-071) 준비 또는 T-005의 남은 REST·화면(결정·세션·댓글·활동)이다.
- 결정된 것: `docs/decisions.md`
- 아직 안 정해진 것: `docs/open-questions.md`

## 문서 지도
| 문서 | 내용 |
|---|---|
| `docs/01-vision.md` | 문제 정의, 제품 분류, 포지셔닝, 범위 |
| `docs/02-domain-model.md` | 엔티티와 관계, 변경 흐름(트리거→결정→이슈→변경) |
| `docs/03-user-flows.md` | 사용자 흐름 A~F |
| `docs/04-artifact-control.md` | 산출물 등록 경로, 버전 상태, 변경 통제 |
| `docs/05-ui.md` | Kaneo 대비 추가 화면/메뉴 |
| `docs/06-schema.md` | 1차 DB 스키마 (`V1__schema.sql`의 기준) |
| `docs/07-mcp.md` | 1차 MCP 도구 24개와 흐름별 사용 순서 |
| `docs/08-design-language.md` | 디자인 언어: 리니어를 직접 재서 정리한 크기·색·부품과 BIT 적용 기준 |
| `docs/tasks/` | 코드 작업 지시서 (Codex에게 넘기는 단위, D-033) |
| `.agents/skills/` | 작업 방식 스킬 원본 (`bit-*` 등). `.claude/skills`는 사본 |
| `skills/` | BIT가 배포하는 스킬 원본 (`better-issue-tracker`). `.agents/skills`·`.claude/skills`의 설치본은 gitignore |
| `docs/conventions.md` | 기술 스택, 코드 구조, 에이전트 스킬 관리 방법 (SandboxHr 기준) |
| `docs/decisions.md` | 지금까지의 결정 기록 (이 프로젝트도 자기 방식대로 기록한다) |
| `docs/open-questions.md` | 미결 사항, 다음 할 일 |

## 핵심 원칙 (작업 시 항상 지킬 것)
1. **Git hosting은 만들지 않는다.** Git은 "소유"가 아니라 "참조"(웹훅으로 커밋·MR 연결).
2. **에이전트가 1순위 사용자.** 기능은 API/MCP 먼저, UI는 그 위에.
3. **가벼움 유지.** Kaneo 수준의 단순함을 지킨다. 문서 편집기·결재·위키·진짜 일정(반복·참석자)은 본체 범위 밖. 호호 HR은 비공개 오피스 확장으로 얹는다 (D-071).
4. **"왜"가 끊기지 않게.** 모든 변경은 이슈에, 의미 있는 판단은 결정에 연결된다.
5. **통제 강도는 프로젝트 설정으로.** 개인 모드(가벼움) / 팀 모드(잠금·승인).
6. **외부 기능이 없어도 실행된다.** 메일·Git 연동·파일 저장소·문서 변환·PDF는 인터페이스 + 어댑터로 분리한다.
   설정이 없으면 그 기능만 꺼지고 앱은 정상 실행된다. 서버는 켜진 기능을 알려 주고, 화면은 그 값을 보고 버튼을 숨긴다 (D-030).

## 베이스
- UI/기능 베이스: Kaneo (오픈소스 경량 이슈툴, MIT)
- 개념·화면 구조: Kaneo에서 차용(인스턴스, 워크스페이스 → 프로젝트 → 작업, 레이아웃). 포크하지 않는다.
- 기술 스택: React + Astryx / Spring Boot + SQLite. 구조·관리 방법론은 사용자의 SandboxHr 프로젝트를 따른다 → `docs/conventions.md`
- 배포: 도커 컨테이너 하나(또는 compose)로 로컬/사내/개인 서버 어디서든 실행

## 에이전트 작업 규칙
- 작업 중 설계에 영향을 주는 판단을 하면 `docs/decisions.md`에 결정을 추가한다
  (무엇을 / 왜 / 기각한 대안). 사소한 판단은 기록하지 않는다.
  기준: "6개월 뒤의 내가 '왜 이렇게 했지?'라고 물을 만한 것".
- 미결 사항이 해결되면 `docs/open-questions.md`에서 지우고 결정으로 옮긴다.
- 플랫폼이 동작하기 시작하면 이 기록들은 BIT 자신으로 이전한다(도그푸딩).
- **이슈는 BIT에 남긴다(도그푸딩, 2026-10-26부터)**: https://bit.goraebap.xyz 의 **고래밥 스튜디오 워크스페이스 · Better issue tracker 프로젝트(키 `BIT`)**. MCP 서버 이름은 `bit`이고, 도구를 부를 때 `workspace`는 `고래밥 스튜디오`로 준다(계정에 워크스페이스가 여럿이라 생략하면 오류가 난다).
  - 일하는 방법은 우리가 배포하는 스킬 `better-issue-tracker`(원본 `skills/better-issue-tracker/`)를 따른다. 코드·문서를 바꾸는 요청을 받으면 **첫 수정 전에** BIT 이슈를 찾거나 만들고, 작업 중 찾은 다른 문제도 따로 이슈로 만든다.
  - 우리는 이 스킬을 만드는 쪽이다. 스킬이나 MCP 안내문(`McpServerConfig`, 도구 설명)대로 했는데 결과가 틀리면 그 자리에서 스킬과 안내문을 고치고 `skills/better-issue-tracker/notes.md`에 남긴다.
  - 결정 기록의 원본은 아직 `docs/decisions.md`다. 여기에 D-번호 결정을 더할 때는 같은 결정을 BIT `결정기록` 이슈로도 만들고(스킬의 4절), 두 곳에 서로의 번호를 적는다. 한쪽으로 옮기는 시점은 따로 정한다.
  - 운영 서버가 0.8.x인 동안은 이슈 도구 이름이 옛 이름(`get_work_item_context`, `create_work_item` 등)이다.
