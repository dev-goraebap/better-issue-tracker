# bit-frontend 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-27 · 운영 문서 조회 연결
- 요청: SDLC·arc42 운영 문서를 스킬이 MCP로 읽게 한다(BIT-62, D-098/BIT-63).
- 수정: 공통 문서 조회 안내로 연결하고 영역별 제목 검색·본문 조회를 수행한다. 상세 지식은 스킬에 복제하지 않는다.
- 확인: 운영 문서 지도와 해당 영역 문서를 list_documents/get_document로 읽고 설치본을 동기화한다.

## 2026-10-26 · 이슈 이름과 주소 반영 (D-084)
- 증상: 코드·API·MCP의 작업항목(work item)이 이슈(issue)로, 화면 주소가 `/workspaces/…/projects/…/issues/…`로 바뀌었는데 참고 문서가 옛 이름(`work_item`, `/work-items`, `/w/…/p/…`, `get_work_item_context`)을 예로 들고 있었다
- 층: 참고 문서.
- 수정: `SKILL.md`, `references/02-code-style.md`, `references/03-data-flow.md`, `references/04-layout.md`, `references/05-design-system.md`의 작업항목·work item·옛 주소를 이슈·issue·새 주소로 바꿨다
- 확인: 바꾼 뒤 이 스킬의 SKILL.md·references에 `work_item`·`work-item`·`/w/$`가 남지 않았다

## 2026-10-22 · T-003 확정 반영
- 증상: 구현 지시서에서 채택한 정책이 기존 참고 문서에는 후속 기준 또는 미결로 남아 있었다.
- 층: 참고 문서.
- 수정: 사용자 추가 레이아웃 요청(D-044)의 셸·슬롯·너비·URL 문맥을 실제 구현에 맞춰 반영했다. T-003 지시서의 승인된 갱신 범위다.
- 확인: 전체 서버·클라이언트 검사, 실제 SQLite 경쟁·롤백, Docker 업그레이드와 브라우저 실행을 지시서 결과와 대조한다.

## 2026-10-22 · 절차
- 증상: T-001에서 워크스페이스 하단 메뉴와 테스트 파일 규칙을 구현했지만 스킬에는 미결 항목으로 남아 있었다.
- 층: 절차(SKILL.md와 관련 references).
- 수정: D-034의 워크스페이스 메뉴 배치와 실제 `tests/*.test.ts` 규칙을 참고 문서에 반영했다. 프로젝트 모바일 메뉴는 미결로 유지했다.
- 확인: `npm run check --prefix client`, 390px·1440px 브라우저 메뉴 이동, 모바일 뒤로가기로 더보기 닫기를 확인했다. 스킬 동기화 뒤 `npm ci`와 같은 검사가 다시 통과했다.

## 2026-10-22 · 이관
- 증상: BIT 저장소 초기화를 앞두고 화면 규칙이 SandboxHr `hohr-frontend`에만 있었다.
- 층: 절차(SKILL.md, references 전체).
- 수정: `hohr-frontend`를 `bit-frontend`로 옮겼다. 이름을 BIT 계열로 바꾸고(`PRODUCT_NAME = 'BIT'`, npm `bit-client`), 페이지 그룹을 BIT의 워크스페이스·프로젝트·설정·진입으로 바꿨다. 로켓 로딩·풍경 일러스트·호호타운·공간 메뉴·회사 브랜딩·React Flow·Lenis·문서 편집기(Tiptap/Lexical) 안내는 뺐고, 화면 이동 로딩은 같은 시간 규칙의 기본 표시로 줄였다. 켜진 기능에 따른 버튼 숨김(D-030)을 더했다. 원본에 답이 없는 것은 SKILL.md의 "BIT에서 정할 것"에 모았다.
- 확인 방법: `client/`가 생기면 `npm run check --prefix client`를 돌리고, 첫 화면을 만들 때 이 스킬대로 배치되는지 본다.
