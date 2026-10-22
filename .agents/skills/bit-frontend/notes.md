# bit-frontend 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

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
