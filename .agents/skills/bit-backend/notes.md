# bit-backend 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-27 · 운영 문서 조회 연결
- 요청: SDLC·arc42 운영 문서를 스킬이 MCP로 읽게 한다(BIT-62, D-098/BIT-63).
- 수정: 공통 문서 조회 안내로 연결하고 영역별 제목 검색·본문 조회를 수행한다. 상세 지식은 스킬에 복제하지 않는다.
- 확인: 운영 문서 지도와 해당 영역 문서를 list_documents/get_document로 읽고 설치본을 동기화한다.

## 2026-10-26 · 이슈 이름과 주소 반영 (D-084)
- 증상: 코드·API·MCP의 작업항목(work item)이 이슈(issue)로, 화면 주소가 `/workspaces/…/projects/…/issues/…`로 바뀌었는데 참고 문서가 옛 이름(`work_item`, `/work-items`, `/w/…/p/…`, `get_work_item_context`)을 예로 들고 있었다
- 층: 참고 문서.
- 수정: `SKILL.md`, `references/02-code-style.md`, `references/03-layers.md`, `references/04-cross-module-read.md`의 작업항목·work item·옛 주소를 이슈·issue·새 주소로 바꿨다
- 확인: 바꾼 뒤 이 스킬의 SKILL.md·references에 `work_item`·`work-item`·`/w/$`가 남지 않았다

## 2026-10-22 · T-003 확정 반영
- 증상: 구현 지시서에서 채택한 정책이 기존 참고 문서에는 후속 기준 또는 미결로 남아 있었다.
- 층: 참고 문서.
- 수정: D-042~D-043의 모듈 경계·원자성 예외와 CurrentUser.agentName 경로를 실제 구현에 맞춰 반영했다. T-003 지시서의 승인된 갱신 범위다.
- 확인: 전체 서버·클라이언트 검사, 실제 SQLite 경쟁·롤백, Docker 업그레이드와 브라우저 실행을 지시서 결과와 대조한다.

## 2026-10-22 · 이관
- 증상: BIT 서버 규칙이 SandboxHr `hohr-backend`에만 있었다
- 수정: `hohr-backend`를 옮겼다. 패키지는 `io.github.goraebap.bit`, office·projects 그룹과 HR 모듈·결재 SPI·`LEAVE_*` 예시·Redmine을 뺐고, 예시를 workitem·decision·link·iam으로 바꿨다. D-014·D-020·D-021·D-022·D-028·D-030~D-032에서 나온 규칙을 SKILL.md "BIT 고유 규칙"에 더했다. 문서와 코드가 어긋난 곳(conventions.md 10절)은 실제 코드 기준으로 적었다: 구현체 `Jooq*Repository`/`Jooq*Query`(package-private), 통합 테스트는 기능 단위 이름, 하위 패키지 분할 시점은 강제하지 않음
- 확인: SandboxHr `server/src`의 `ErrorCode.raise()`, `NotificationErrorCode`, notification·user 모듈 패키지 구조, `build.gradle`의 `test`/`integrationTest`/`exportOpenApi` 태스크와 대조했다. 정해지지 않은 것은 SKILL.md "BIT에서 정할 것"에 남겼다
