---
title: 프론트엔드 05. Astryx 디자인 시스템
description: Astryx 컴포넌트·토큰 사용과 CLI 확인 절차, 입력 칸·빈 상태·파일 업로드·제품 이름 규칙. 화면 컴포넌트를 고를 때 읽는다.
---

이 문서는 Astryx 디자인 시스템을 활용한 컴포넌트 구현 표준, CLI 기반 개발 워크플로우, 디자인 토큰 활용, 리치 콘텐츠 및 접근성 지침을 정의한다.

---

## 1. Astryx CLI 및 개발 워크플로우

화면을 구현하기 전에 프로젝트에 설치된 Astryx CLI(`npm run astryx --prefix client -- <명령>` 또는 `client/`에서 `npx astryx <명령>`)를 활용하여 공식 레이아웃, 템플릿 구조 및 컴포넌트 인터페이스(props)를 확인하고 구현을 시작한다. 에이전트 컨텍스트 절약을 위해 조회 명령에는 `--dense` 플래그를 붙인다.

```sh
# 1. 지정한 화면 설명에 적합한 컴포넌트 조합(page + block + component) 및 플레이북 확인 (인자 없이 실행 시 전체 워크플로우 출력)
npm run astryx --prefix client -- build "구현할 화면"

# 2. 표준 템플릿·블록 목록 및 골격 구조 확인
npm run astryx --prefix client -- template --list
npm run astryx --prefix client -- template <템플릿명> --skeleton

# 3. 특정 컴포넌트의 상세 props 인터페이스 및 예제 확인 (--dense로 토큰 절약 출력)
npm run astryx --prefix client -- component <컴포넌트명> --dense
npm run astryx --prefix client -- component --list

# 4. 컴포넌트·훅·문서·템플릿·블록 통합 검색
npm run astryx --prefix client -- search "<키워드>"

# 5. 공식 레퍼런스 문서 확인 (주요 토픽: layout, styling, tokens, forms, overlays, patterns, principles, data-fetching, routing, theming, accessibility, icons, i18n, testing, typescript, working-with-ai)
npm run astryx --prefix client -- docs layout --dense
npm run astryx --prefix client -- docs tokens --dense
```

- **버전 호환성 확인**: 각 명령어는 독립적으로 실행하며, 프로젝트에 설치된 Astryx 패키지 버전에서 해당 명령어와 옵션이 정상 지원되는지 사전에 확인한다.
- **완료 전 자기 점검(SELF-CHECK)**: 코드 작성을 마친 뒤 파일을 다시 읽고, 레이아웃용 원시 `<div>`/`<span>`, 하드코딩된 색상·크기(`#hex`, `16px`), 추측으로 적은 prop이 남아 있지 않은지 확인한다(`npm run lint:components --prefix client` 통과 필수). 컴포넌트나 prop이 불확실하면 추측하지 말고 `npm run astryx --prefix client -- component <Name> --dense` 또는 `search`로 확인한다.

---

## 2. 레이아웃 및 디자인 토큰 체계

### 기본 레이아웃 컴포넌트 우선
- 뷰포트 및 내부 배치는 Astryx가 제공하는 `Layout`, `VStack`, `HStack`과 컴포넌트 자체 내장 props(여백, 정렬 등)를 최우선으로 활용한다.
- 임의의 인라인 스타일이나 커스텀 CSS 작성은 지양하며, 커스텀 스타일이 불가피한 경우 색상, 간격, 테두리 반경(radius) 등 시스템 공통 토큰 변수를 참조한다. 색·크기는 하드코딩하지 않는다.

### 전역 스타일 및 프로바이더 조립
- **전역 스타일**: 브라우저 스타일 초기화(CSS Reset), 웹 폰트, `astryx.css`, 테마 변수는 `app/styles/index.css` 한곳에서 통합 로드한다. 기본 테마는 `@astryxdesign/theme-stone`이다.
- **글꼴**: 본문과 제목은 Pretendard Variable(npm `pretendard`의 동적 서브셋, 한글·영문 모두), 고정폭이 필요한 곳(이슈 키, 커밋 해시, 코드)은 JetBrains Mono Variable(`@fontsource-variable/jetbrains-mono`)을 앱에 실어 기기마다 같은 모양으로 보인다. 테마가 `--font-family-body`·`--font-family-heading`·`--font-family-code`로 이름을 대고, 테마 밖(body)도 같은 글꼴 목록을 쓴다. 시스템 글꼴은 불러오는 동안의 대체로만 둔다.
- **최상위 프로바이더**: 레이어 중첩을 관리하는 `LayerProvider`와 다국어 처리를 위한 `InternationalizationProvider`는 앱 진입점(`app/entry.tsx`)에서 단 1회 조립한다.

---

## 3. 데이터 표현 컴포넌트 표준

데이터의 밀도와 성격에 부합하는 적합한 시각적 컴포넌트를 사용한다.

| 데이터 유형 | 권장 컴포넌트 | 표현 목적 |
| :--- | :--- | :--- |
| **고밀도 테이블형 데이터** | `Table` 또는 `List`/`Item` | 다량의 정형화된 레코드 비교 및 정렬 |
| **독립된 맥락 묶음** | `Card` | 특정 엔티티의 정보 요약 및 작업 그룹화 |
| **도메인 상태 표시** | `StatusDot` 또는 `StatusToken`(shared/ui) | 이슈 상태, 결정 상태(제안/확정/대체됨) 등 상태 코드의 직관적 인지. 상태는 모서리가 완전히 둥근 알약 모양 `StatusToken`으로 보이고, 라벨·이름표·정본 종류(docx / md / Git)·트리거 유형은 `Token`·`Badge`를 쓴다 |
| **단순 건수 및 카운트** | `Badge` | 미확인 알림 수, 탭별 항목 수 등 정량적 수치 표현 |

- **무분별한 래퍼 생성 금지**: 동일한 props를 단순 전달하기만 하는 껍데기 래퍼 컴포넌트를 기계적으로 양산하지 않는다. 반응형 정책이 결합되거나 프로젝트 공통 규칙이 부여된 경우에 한해서만 `shared/ui`로 승격 추출한다.

### 입력 필드

- 글을 적는 칸(`TextInput`·`TextArea`·`NumberInput`·`DateField`)은 모두 `placeholder`로 적을 내용의 예시(`예: 결제 모듈 개편`)나 무엇을 적을지(`바꾸는 이유를 적어 주세요`)를 보인다. 날짜는 `YYYY-MM-DD`다. 값이 비어 있을 수 있는 `Selector`도 `placeholder`로 고르라고 알린다.
- 정해진 몇 가지에서 고르는 칸은 Astryx `Selector`, 이름처럼 긴 목록에서 찾아 고르는 칸은 `Typeahead`(콤보박스), 날짜 하나는 shared/ui의 `DateField`, 기간은 `DateRangeInput`을 쓴다. 네이티브 `select`와 `input type="date"`는 쓰지 않는다.
- `DateField`는 화면 폭으로 모양을 정한다. 데스크톱(64rem 이상)은 날짜를 적는 칸과 달력 팝오버(오늘·지우기), 모바일은 Astryx `DateInput`(`nativePicker="never"`)의 바텀시트 달력이다. Astryx `DateInput`을 직접 쓰지 않는다. 주 입력이 터치인 노트북에서 데스크톱 폭에도 브라우저 날짜 입력이나 바텀시트가 뜨기 때문이다. 달력을 늘 보여야 하는 양식은 `Calendar`를 화면에 둔다.
- 정해진 간격에서 고르는 시각 하나는 shared/ui의 `TimeField`를 쓰고, `DateField`처럼 화면 폭으로 모양을 정한다. 데스크톱은 칸에 적거나(`1430`·`9시 30분`·`오후 2시`) 칸 아래로 펼친 `step`분 간격 목록에서 고르는 콤보박스다. 모바일은 읽기 전용 칸이라 키보드가 올라오지 않고, 누르거나 Enter·Space·화살표로 바텀시트를 연다. 시트는 칸 이름 아래 48px 줄의 시각 목록이고, 고른 시각(없으면 그다음 시각)을 가운데 두고 초점을 준다. 화살표·Home·End로 옮기고 누르거나 Enter로 고르면 닫히며, Escape·밀어 내리기·바깥 누름은 바꾸지 않고 닫는다. 닫히면 초점이 칸으로 돌아간다. `from`(같은 날 종료 시각의 시작)을 주면 두 모양 모두 시작 뒤 시각부터 각 길이(30분, 1시간…)를 함께 보이고 23:59로 끝난다. 분 단위로 자유롭게 적는 시각은 Astryx `TimeInput`이다.
- 모바일(`MOBILE_QUERY`)에서는 글을 적거나 고르는 칸(`TextInput`·`TextArea`·`NumberInput`·`Selector`·`MultiSelector`·`Typeahead`·`DateInput`·`DateRangeInput`·`TimeInput`·`InputGroup`)과 `SegmentedControl`, 양식의 동작 줄(`data-action-row`) 버튼이 손가락으로 누르는 크기다. 높이는 48px(`SegmentedControl` 항목은 트랙 안쪽 44px), 글자는 16px이고, 16px보다 작으면 iOS가 입력할 때 화면을 확대한다. 크기는 페이지마다 `size`로 주지 않고 `app/styles/index.css`가 Astryx 컨트롤의 고정 클래스(`astryx-text-input` 등)에 `--size-element-*`·`--text-*-size`를 다시 정한다. 데스크톱은 Astryx 크기 그대로다. 공통 `Surface`·`SidePanel`의 바닥 줄과 `ListingFooter`는 `data-action-row`를 이미 달고 있고, 페이지가 직접 그리는 저장·취소 줄은 그 줄에 `data-action-row`를 단다. 목록 도구 줄의 버튼도 모바일에서 48px 검색 칸과 같은 높이다.
- 예외는 로그인의 이메일과 인증 코드(메일이 켜졌을 때의 OTP)다. Astryx `TextInput`에는 자동 완성·숫자 키패드 속성이 없어 네이티브 `input`을 쓰며, 이때도 `placeholder`를 둔다.

### 빈 상태·찾을 수 없음·오류 화면

페이지 안의 구역은 큰 제목(`Heading level={2}`) 대신 shared/ui의 `SectionHeader`로 나눈다. 구역 이름은 작고 옅은 이름표(13px, 600, 보조 글자색)이고 선은 긋지 않으며, 구역 사이는 페이지 간격으로 나누고, 구역의 동작은 같은 줄 끝에 둔다. 동작이 있든 없든 높이가 같아 내용이 같은 거리에서 시작한다. 페이지 제목만이 제목급 글자다. 스크린 리더에는 여전히 2단계 제목이다.

보여 줄 것이 없는 화면과 영역은 shared/ui의 `PageState`로 그린다. Astryx `EmptyState` 위에 상황(`kind`)별 모양을 정한 것이며, 제목은 무엇이 없는지 보통 굵기(500)로 쓴다. 모든 빈 상태는 설명에 다음에 무엇이 일어나는지나 할 일을 쓰고, 그 화면에서 할 수 있는 동작(새로 만들기, 등록, 조건 지우기)이 있으면 `actions`에 둔다. 내용은 영역 가운데가 아니라 위쪽에 두어 짧은 안내 아래로 빈칸이 크게 남지 않게 한다. 상황별 그림은 아직 정하지 않았다(SKILL.md "BIT에서 정할 것"). 그림을 붙이더라도 장식(`aria-hidden`)이며 뜻은 제목·설명이 전한다.

다른 내용 없이 상태만 있는 화면에서는 `PageState`가 스스로 카드까지 올라가며 각 상자 아래에 남은 높이를 재어(`useFillRoom`) 그만큼 늘어나고, 묶음을 그 가운데에 둔다. 페이지가 상태를 몇 겹의 상자로 감싸든 페이지마다 높이를 맞추지 않는다. 다른 내용 아래의 `isCompact`는 그 내용 바로 밑에 둔다. 로딩, 기존 내용이 있을 때의 재조회 실패, 401·403, 아직 만들지 않은 기능 안내에는 오류 상태를 쓰지 않는다.

| 상황 | `kind` | 크기 |
| :--- | :--- | :--- |
| 화면의 목록이 비었다 | `empty` | 기본 |
| 검색어·필터에 맞는 것이 없다 | `search` | 기본 |
| 화면 안의 한 영역이 비었다 | `empty` | `isCompact` |
| 없는 주소나 없는 대상이다(`RequestBoundary`가 받은 404와 경로 값 형식 오류 포함, 페이지의 뒤로 링크를 주 버튼으로) | `not-found` | 기본 |
| 조회가 실패했다(`RequestBoundary`, 라우트 오류) | `error` | 기본 |

홈 카드처럼 좁은 칸 안의 빈 결과는 한 줄 안내로 둔다.

---

## 4. 리치 콘텐츠 및 파일 업로드 처리

### 마크다운 렌더링
- **데이터 계약**: 마크다운 데이터는 HTML로 변환하여 보관하지 않고, 원문(Markdown Raw Text) 계약을 유지하여 저장하고 송수신한다.
- **편집기**: 마크다운을 적는 칸(이슈·결정·세션 본문, 댓글)은 `MarkdownEditor`(`shared/ui/markdown-editor`, Tiptap)를 쓴다(D-076). `TextArea`로 적지 않는다. 값은 마크다운 원문이고 `onChange`로 돌려받는다. 페이지에 그대로 놓는 본문은 `variant="bare"`, 상자에 담는 칸(댓글, 양식의 설명)은 `variant="field"`다. Ctrl(⌘)+Enter로 보내는 칸은 `onSubmit`을 준다.
- **뷰어**: 읽기 전용 본문은 같은 스키마의 `MarkdownView`로 그려 편집할 때와 읽을 때 모양이 같다(D-076). 산출물의 변환 텍스트·Git md 정본처럼 BIT가 쓰지 않는 긴 문서도 같은 뷰어를 쓴다.
- **문서 편집기는 범위 밖**: 협업 편집·버전·위키 같은 문서 편집기는 1차 범위 밖이다.

### 파일 업로드 수명주기
- **선택기 UI**: 파일 업로드는 shared/ui의 공통 컴포넌트 `useFileUploader`·`FileUploader`로 한다. 엔진은 Uppy 코어와 S3 플러그인을 화면 없이 쓰고(서버의 사전 서명 PUT → 확정 흐름, `docs/conventions.md` 4절), 첨부창은 Astryx 컴포넌트와 토큰으로 그린다. Uppy Dashboard는 쓰지 않는다.
- **사진 보기**: 사진을 크게 보는 화면은 shared/ui의 `ImageViewer`(yet-another-react-lightbox)로 통일한다.
- **사진이 나타나는 방식**: 화면에 그리는 사진(프로필, 첨부 썸네일)은 업로드 때 잰 대표색(`dominantColor`)으로 자리를 먼저 칠해 두고, 사진이 도착하면 그 위로 서서히 나타나게 한다([화면 이동과 로딩](06-navigation-loading.md) "사진 자리"). 이미 받아 둔 사진(shared/lib/image-traits의 `isImageAtHand`·`noteImageArrived`)은 효과 없이 바로 보인다. 사진이 바뀌면 `<img>`를 주소로 새로 만들어(`key`) 옛 사진이 페이드를 대신하지 않게 하고, 몇 분마다 새로 발급되는 열람 주소는 이미 보인 사진을 다시 흐리지 않는다. 동작 줄이기 설정이면 바로 보인다.
- **임시 자원 관리**: 브라우저 로컬 미리보기 단계와 서버 저장 완료 단계를 엄격히 구분한다. 미리보기를 위해 발급한 `Object URL`(`URL.createObjectURL`)은 메모리 누수를 방지하기 위해 뷰가 언마운트되거나 업로드가 완료되는 즉시 명시적으로 해제(`URL.revokeObjectURL`)한다.
- **라이브러리 검증**: 외부 라이브러리 도입 시 실제 릴리즈 버전, 번들 크기, 보안 취약점 및 오픈소스 라이선스를 사전에 확인한다.

---

## 5. 웹 접근성 및 제품 자산 관리

### 접근성(a11y) 필수 체크리스트
- **아이콘 버튼**: 텍스트 없이 아이콘만 노출되는 액션 버튼은 스크린 리더를 위한 명확한 접근성 이름(`aria-label`)을 선언한다.
- **오버레이 제목**: 다이얼로그와 바텀시트는 고유한 제목 요소(`aria-labelledby`)를 반드시 연결한다.
- **키보드 내비게이션**: Tab 키를 통한 순차 포커스 이동, Escape 키를 통한 닫기, 그리고 오버레이가 닫힌 후 직전 포커스 위치로 안전하게 복귀하는지 검증한다.
- **사용자 환경 적응**: 긴 한국어 문장의 어색한 줄바꿈 방지, 라이트/다크 테마 환경에서의 명도 대비 기준 충족, 모바일 터치 타깃 크기(최소 44x44px)를 철저히 검증한다.

### 제품 자산 관리
- **로고 자산**: 로고나 심볼은 독립 파일 리소스로 분리하여 로드하며, 수백 라인에 달하는 복잡한 인라인 SVG 코드를 DOM 구조에 직접 삽입하지 않는다. 웹의 로고는 독립 SVG 파일을 CSS 마스크로 읽고 `--color-text-primary`를 칠해 앱의 팔레트·모드를 따른다.
- **아이콘과 설치**: 파비콘(`favicon-16.png`, `favicon-32.png`, `icon-192.png`)·iOS 아이콘(`icon-apple-touch.png`)·PWA 아이콘(`icon-512.png`, `icon-maskable-512.png`)과 매니페스트(`manifest.webmanifest`)는 `client/public/`에 둔다. 아이콘에는 투명한 곳을 두지 않는다. 투명하면 어두운 탭·홈 화면에서 글자가 배경에 묻히므로 기본 팔레트 Stone의 밝은 바탕(`#F3F3F5`)에 먹색(`#25252A`) 단색 심볼을 합친 불투명 PNG로 둔다. 심볼 원본과 생성 절차는 아직 정하지 않았다.
- **제품 이름**: 화면의 제품 이름은 `PRODUCT_NAME`(`'BIT'`, `shared/config`) 상수 하나를 쓰고, 문구에 직접 적지 않는다. 정식 제품명이 정해지면 이 값만 바꾼다(D-024).
