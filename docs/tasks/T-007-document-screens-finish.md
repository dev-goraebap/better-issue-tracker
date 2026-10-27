# T-007. 문서 화면 마무리: 기존 목록·상세와 같은 완성도로 (인계 문서)

> 작성: 2026-10-27, Claude → Codex 인계. BIT 업무: **BIT-41**(진행 중). 결정: D-093(특히 '화면 (BIT-41)' 항목).
> 브랜치 `bit-41-document-screens`, PR [#42](https://github.com/dev-goraebap/better-issue-tracker/pull/42)(아직 병합 전).
> bit-frontend / bit-backend / bit-api-contract 스킬과 `docs/08-design-language.md`를 적용한다.

## 왜 이 문서가 있나

BIT-41의 문서 화면을 기능만 맞춰 PR #42로 올렸는데, 사용자가 **완성도가 기존 화면보다 크게 떨어진다**고 지적했다. 점검해 보니 문서 화면이 다른 목록 화면(모든 프로젝트, 구성원, 업무 목록)과 다른 방식으로 그려져 있었다. 고치는 도중에 멈췄고, 이 문서로 이어서 마무리한다.

목표는 새 디자인이 아니라 **이미 있는 BIT 화면의 형식을 그대로 따르는 것**이다. 기준 화면을 먼저 열어 보고 같은 부품·간격·글자 크기로 맞춘다.

## 사용자가 정한 것 (다시 묻지 말 것)

| 항목 | 결정 |
|---|---|
| 폴더 안의 보기 | **목록 하나**. 시안의 카드 보기는 사용자가 뺐다. 다시 넣지 않는다. |
| 업무 뷰의 카드 보기 | 그대로 둔다(BIT-48은 하지 않고 보관했다). 건드리지 않는다. |
| 문서함 구성 | 프로젝트 폴더(프로젝트 순서, D-080) → 공통 폴더·문서를 **같은 테이블의 행**으로 둔다. 프로젝트 폴더는 지울 수 없고 프로젝트 아이콘·색상과 연결 표시로 구분한다. 별도 카드나 구역을 만들지 않는다. 전체 문서·프로젝트 문서 모두 테이블(모바일 리스트) 하나다. |
| 사이드바 | 프로젝트를 펼치면 '업무'·'문서'. 보고 있는 프로젝트는 펼침, 나머지는 사람이 둔 대로(브라우저 저장). |
| 문서 주소 | `/workspaces/$w/documents/<제목>-<id>`, 새 문서 `/documents/new?project=&folder=`, 편집 `/documents/<ref>/edit` |

시안 캔버스(참고용): https://claude.ai/artifact/4SEbwYMFjoRfwUQCY6VuHU (시안 3 카드 보기는 폐기).

## 지금 상태

### PR #42에 들어간 것 (커밋 `42ee07f`, 검사 통과)

- 서버: 폴더의 `documentCount`·`updatedAt`, 문서 목록의 `workItems`(연결된 업무), `GET /documents/parts?projectId=…`(프로젝트별 문서·폴더 수), 문서 응답의 필수 속성 표시. 통합 테스트 보강.
- 화면:
  - `entities/document`: API, `DocumentLink`·`FolderLink`, 주소 규칙(`documentSlug`, `documentIdOf`, `folderHref`), 검색 파서
  - `widgets/document-folder`: `DocumentFolder`(폴더 화면 본체), `FolderNameDialog`
  - `widgets/document-editor`: `DocumentForm`(새 문서·편집 공용)
  - `pages/workspace/documents`(문서함), `pages/project/documents`(프로젝트 문서), `pages/workspace/document`(읽기), `document-edit`, `document-new`
  - 사이드바 하위 메뉴(`app/layout/SidebarProjects.tsx`), `appPlace`의 `projectSection`, 라우트(`app/router/router.ts`)
  - `widgets/work-item-detail`의 `WorkItemActivity`가 `targetType="document"`도 받게 함(문서 활동·댓글)

### PR #42 뒤에 손대다 멈춘 것 (커밋되지 않았거나 WIP 커밋)

새 부품을 써 두었지만 **아직 화면에 연결하지 않았다**:

- `widgets/document-folder/model/rows.ts`: 목록 행 타입 `FolderRow`(프로젝트 폴더 / 폴더 / 문서)와 `rowsOf()`
- `widgets/document-folder/ui/FolderTable.tsx`: 데스크톱은 `SheetTable`(이름·라벨·연결된 업무·최근 변경·메뉴), 폰은 `ItemList`
- `widgets/document-folder/ui/FolderTrail.tsx`: 머리 아래 줄에 놓을 폴더 위치 경로
- `widgets/document-folder/ui/folder.module.css`: 새 부품용으로 바꿨다. **옛 `DocumentFolder`가 쓰던 `.flush`·`.link`·`.empty` 클래스를 지웠으므로 지금 화면은 조금 깨져 보인다.** 1단계에서 정리된다.

아직 남아 있는 옛 부품(1단계에서 지운다): `widgets/document-folder/ui/FolderRows.tsx`, `pages/workspace/documents/ui/ProjectFolders.tsx`, `pages/workspace/documents/ui/documents.module.css`.

## 점검에서 찾은 문제

기준 화면: `pages/workspace/projects/ui/ProjectsPage.tsx`(모든 프로젝트), `pages/workspace/members/ui/MembersPage.tsx`(구성원), 업무 상세 `widgets/work-item-detail/ui/WorkItemDetail.tsx`, 업무 편집 `pages/project/work-item-edit/ui/EditForm.tsx`.

| # | 화면 | 문제 | 기준 화면은 |
|---|---|---|---|
| 1 | 폴더·문서함 | 표 형식이 아니다(`ItemList` 행만, 열 머리 띠·개수 줄 없음) | `SheetTable` + `foot`에 `ListSummary`('모두 N개') |
| 2 | 폴더·문서함 | 내용이 카드 왼쪽 끝에 붙는다(구역 제목 '프로젝트'·'공통', 위치 경로) | 표의 첫 열과 탭 줄이 `--spacing-6` 안쪽에서 시작 |
| 3 | 폴더 | 위치 경로가 맨 위 경로(셸)와 화면 안에 두 번 | 탭 줄(`PageFrame`의 `tabs` 자리, 44px)에 한 번 |
| 4 | 폴더·문서함 | 머리 오른쪽에 작은 '새 폴더'·'새 문서' 버튼 | `ListToolbar`의 `action`(`isCreate`, '+' 알약). 업무처럼 '만들기 ▾'에 `choices`로 문서·폴더 |
| 5 | 문서함 | 프로젝트 폴더가 따로 그린 카드이고, 공통이 비면 큰 그림(PageState)이 그 아래 뜬다 | 같은 표의 맨 위 행으로. 빈 상태는 표 전체가 비었을 때만 |
| 6 | 문서 읽기 | 아직 기준과 대조하지 않았다 | 업무 상세: `Surface`/`PageFrame`, '설명' `SectionHeader`, 속성 패널(알약 행, 머리 12px), 모바일 알약 줄 |
| 7 | 새 문서·편집 | 아직 대조하지 않았다. 처음 열면 입력이 잘 안 되는 듯했다(제목 칸 클릭 후 타이핑이 들어가지 않음, 브라우저 자동화에서 관찰) | 업무 편집 `EditForm` |
| 8 | 사이드바 | 하위 항목 '문서'가 접근성 트리 검색(`find "문서"`)에 잡히지 않았다. '업무'는 보인다 | 다른 `SideNavItem`처럼 링크 이름이 읽혀야 함 |

참고: 화면을 새로 고칠 때 보이는 '불러오는 중입니다' 덮개는 개발 서버의 첫 모듈 컴파일 때문이다. 앱 안에서 이동할 때는 나오지 않음을 확인했다. 고칠 대상이 아니다.

## 할 일

### 1. 폴더·문서함을 목록 형식으로 (문제 1~5)

- `DocumentFolder`를 다음처럼 바꾼다.
  - `PageFrame chrome="header"`. 폴더 안이면 `tabs`에 `FolderTrail`(루트 라벨: 프로젝트는 '문서', 문서함은 '문서함'). 루트에서는 경로 줄을 두지 않는다. 화면 안의 옛 경로(`styles.trail` nav)는 지운다.
  - `ListToolbar`에 `action={{ label: '만들기', icon: 'plus', isCreate: true, choices: [문서, 폴더] }}`(쓰기 권한이 있을 때만). 업무 목록의 '만들기 ▾'와 같은 모양이다.
  - 내용은 `FolderTable`. `rowsOf(projects, folders, documents)`, `foot`에 `ListSummary`(`unit="개"`).
  - 빈 상태는 프로젝트 행까지 하나도 없을 때만 `PageState`.
- `DocumentsPage`는 `projectsQuery`(전체 페이지 이어 붙이기)와 `partsQuery`로 `{ project, part }[]`를 만들어 `DocumentFolder`에 넘긴다(폴더 안에서는 넘기지 않는다).
- 지울 것: `FolderRows.tsx`, `ProjectFolders.tsx`, `pages/workspace/documents/ui/documents.module.css`.
- `widgets/document-folder/index.ts`의 공개 API를 다시 맞춘다.

### 2. 문서 읽기 화면 대조 (문제 6)

`pages/workspace/document/ui/DocumentPage.tsx`를 업무 상세와 나란히 놓고 같은 크기로 비교한다. 본문 위 섹션 머리, 속성 패널의 행 모양(지금은 `dt` 열이 있는 표 모양이라 업무 상세의 알약 행과 다름), 연결된 업무 칸, 활동 위치, 폰에서 패널이 위로 오는 배치를 맞춘다. 스타일 파일은 `document.module.css`.

### 3. 새 문서·편집 대조 (문제 7)

`widgets/document-editor/ui/DocumentForm.tsx`를 `EditForm`과 비교한다. 제목 자동 포커스와 입력, 본문 높이, 알약 줄(위치·라벨) 자리, 바닥 줄을 맞춘다. 실제로 제목·본문을 쳐서 저장까지 해 본다.

### 4. 사이드바 하위 메뉴 접근성 (문제 8)

`SidebarProjects.tsx`의 하위 `SideNavItem` 두 개가 링크 이름으로 읽히는지 확인하고 고친다. 키보드로 펼치고 접기(⌄)와 하위 항목 이동도 확인한다.

### 5. 마무리

- `docs/decisions.md` D-093의 '담는 글' 항목에 "업무의 카드 보기도 문서로 옮긴다"가 남아 있다. 사용자가 업무 카드는 남기기로 했으므로 '화면 (BIT-41)' 항목과 어긋나지 않게 한 줄 고친다.
- PR #42에 이어서 커밋한다. 커밋 메시지와 PR 제목에 `BIT-41`. **PR 본문에는 BIT-41 말고 다른 업무 키를 적지 않는다**(본문에 언급만 된 업무도 병합 때 '완료'로 옮겨지는 문제, BIT-43).
- BIT-41에 결과를 댓글로 남긴다(MCP `bit`, workspace `고래밥 스튜디오`).

## 확인 방법 (완료 기준)

- `client`: `npm run check` 통과(구성 요소 검사·FSD·테스트·빌드). 서버를 고쳤으면 `server`: `./gradlew.bat check`, HTTP 계약이 바뀌면 `exportOpenApi`와 `npm run api:generate`.
- **화면 비교**: 기준 화면과 같은 창 크기(브라우저 창 약 800px 너비, 1440px, 폰 390px)에서 스크린샷을 나란히 보고 위 표의 1~8이 해소됐는지 본다. 어두운 테마와 밝은 테마 둘 다 본다.
- 흐름: 문서함 → 프로젝트 폴더 → 새 폴더 → 폴더 안 새 문서 작성·저장 → 읽기 → 편집 → 삭제 → 폴더 이름 바꾸기·빈 폴더 지우기. 공통 폴더에서도 한 번.

## 개발 환경 (이 작업에서 쓰던 것)

- 서버: `server`에서 `SERVER_PORT=8097 DB_PATH=./build/dev-db/bit37.db AUTH_COOKIE_SECURE=false AUTH_ALLOWED_ORIGINS=http://localhost:4407 ./gradlew.bat bootRun`. 비밀값은 DB 옆 `secrets.properties`에 생긴다.
- 화면: `.claude/launch.json`의 `client-bit37`(포트 4407, API 대상 8097).
- 로그인: `server/build/dev-db/credentials.txt`(로컬 전용, 커밋하지 않음). 워크스페이스 '개발 확인', 프로젝트 '확인 프로젝트'(CHK)에 폴더 '설계'와 문서 '문서함 화면 설계'(CHK-1과 연결)가 있다.
- 다른 세션이 쓰는 포트(4402·4403·8091·8092)는 피한다. 본 체크아웃(main)의 브랜드 파일(사용자가 커밋하지 않고 둔 것)은 건드리지 않는다.

## 이번에 하지 않는 것 (따로 업무로 있음)

- BIT-46: 끌어 옮기기, 파일 끌어 놓기, 문서 첨부(서버 마이그레이션 필요)
- BIT-47: 문서 화면에서 업무 연결·해제

## Codex 후속 적용 결과 (2026-10-27)

- 문서함과 프로젝트 문서 모두 `DocumentFolder` → `FolderTable`로 통일했다. 프로젝트 폴더 → 공통 폴더 → 문서가 같은 목록에 있고, 프로젝트 폴더는 프로젝트 색의 폴더 아이콘·이름과 연결 표시로 구분한다(색이 없으면 테마의 파란색 토큰). 별도 프로젝트 카드·공통 구역과 옛 행 부품은 제거했다.
- `SheetTable`의 열 머리와 `ListSummary`를 연결했다. 모바일은 같은 데이터의 `ItemList`와 개수 줄이다. 문서함은 프로젝트의 다음 페이지도 이어 읽으며, 공통이 비어도 프로젝트 행이 있으면 빈 그림을 띄우지 않는다.
- 폴더 위치 경로는 헤더 아래 한 줄이며 프로젝트 루트 이름은 '문서'다. 생성은 데스크톱 '만들기 ▾', 모바일 '+'의 문서·폴더 선택 시트로 모았다. 빈 폴더 삭제는 확인 입력과 처리 중 상태를 쓴다.
- 읽기 화면은 본문·연결된 업무·활동 섹션과 속성 패널로 맞췄다. 속성은 이름 열 없이 아이콘·값을 표시하고, 모바일은 제목 아래 알약 줄이다. 편집 본문 최소 높이는 기존 업무 편집과 같은 14rem이며 초안 갱신은 함수형 업데이트다.
- 사이드바 하위 링크의 접근성 문제는 재현되지 않았다. '업무'·'문서'가 링크 이름으로 읽혔고, Enter로 펼치기·접기, Tab으로 하위 문서를 선택한 뒤 Enter로 이동했다. 사이드바 코드는 바꾸지 않았다.
- 검증: `npm run check --prefix client` 통과(컴포넌트·FSD 검사, 기존 테스트 30개, 타입 검사, 빌드). 문서함·프로젝트 문서를 기존 구성원 테이블과 비교했고, 1440·800·390px에서 밝고 어두운 테마를 확인했다. 프로젝트 폴더 안에서 문서 제목·본문 입력 → 저장 → 읽기 → 편집·저장 → 삭제, 모바일 폴더 생성 → 이름 변경 → 삭제, 공통 폴더의 빈 상태 → 모바일 문서 작성·저장 → 삭제를 직접 확인했다. 검증용 문서·폴더는 정리했고 테마·뷰포트도 복원했다.
- 제한: 서버 코드는 바꾸지 않아 서버 검사는 다시 실행하지 않았다. 50개를 넘는 프로젝트 목록·조회 실패 재시도·실기기 소프트웨어 키보드는 이번 브라우저 검증에서 실행하지 않았다. 편집 저장 직후 활동 캐시가 즉시 갱신되지 않는 별도 문제는 BIT-49에 남겼다. 배포·병합은 하지 않았다.

## 추가 요청 반영 (2026-10-27, BIT-49·50·51·53)

- 문서 편집 저장은 문서와 해당 문서 타임라인을 함께 무효화한다. 캐시가 남아 있는 읽기 → 편집 → 제목·본문 수정 → 저장에서 새로고침 없이 수정 활동이 즉시 표시되는 것을 확인했다(BIT-49).
- 폴더 생성·편집에 독립 ColorPalette를 연결했다. 기본색은 다른 색상과 같은 원형 스와치에 대각선 슬래시로 표시하며, 저장·새로고침 유지·변경 취소·기본색 복원·모바일 색상 변경을 확인했다. 기존 아이콘 선택기도 같은 팔레트를 사용하고 색 변경·아이콘 검색·선택이 정상이다. V19가 nullable color를 추가하며 PATCH 생략은 유지, 명시적 null은 기본색 복원이다. API 계약과 클라이언트 타입을 생성했다(BIT-50).
- 워크스페이스 프로젝트 행은 프로젝트의 ProjectMark를 그대로 사용한다. 일반 폴더·문서의 아이콘 자리도 20px로 맞춰 이름 시작점이 동일하다. 데스크톱과 390px 모바일에서 실제 좌표로 확인했다(BIT-41 추가 피드백).
- 데스크톱 생성 버튼은 8px 모서리·강조색 빛 그림자·12px 글자·14px +/펼침 아이콘이다(D-095, BIT-51). 모바일 플로팅 생성 동작은 유지한다.
- 공통 edit는 사용자가 선택한 SquarePen이다. MoreMenu 사용처 8곳을 공용 원형 박스로 통일하고 편집과 동일한 28px/14px(모바일 32px/16px) 크기, 원형 배경·링을 적용했다(D-096, BIT-53). Enter로 열기·Escape로 닫기와 초점 복귀를 확인했다.
- 검증: 서버 check 통과(177개 테스트, 실패·오류 0), 클라이언트 check 통과(30개 테스트·구조·타입·빌드). 기존 개발 DB를 백업하고 V18 → V19로 올려 원래 문서·폴더 유지와 새 색상 저장을 확인했다. 색상 생성·누락 유지·명시적 제거·잘못된 값·버전 충돌의 HTTP 통합 검사를 추가했다. 1440·390px 및 라이트·다크를 확인했으며 검증용 문서·폴더와 뷰 초안은 정리하고 테마·뷰포트를 복원했다. 실기기 키보드는 확인하지 않았다.
