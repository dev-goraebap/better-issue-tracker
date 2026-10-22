# bit-frontend 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-22 · 이관
- 증상: BIT 저장소 초기화를 앞두고 화면 규칙이 SandboxHr `hohr-frontend`에만 있었다.
- 층: 절차(SKILL.md, references 전체).
- 수정: `hohr-frontend`를 `bit-frontend`로 옮겼다. 이름을 BIT 계열로 바꾸고(`PRODUCT_NAME = 'BIT'`, npm `bit-client`), 페이지 그룹을 BIT의 워크스페이스·프로젝트·설정·진입으로 바꿨다. 로켓 로딩·풍경 일러스트·호호타운·공간 메뉴·회사 브랜딩·React Flow·Lenis·문서 편집기(Tiptap/Lexical) 안내는 뺐고, 화면 이동 로딩은 같은 시간 규칙의 기본 표시로 줄였다. 켜진 기능에 따른 버튼 숨김(D-030)을 더했다. 원본에 답이 없는 것은 SKILL.md의 "BIT에서 정할 것"에 모았다.
- 확인 방법: `client/`가 생기면 `npm run check --prefix client`를 돌리고, 첫 화면을 만들 때 이 스킬대로 배치되는지 본다.
