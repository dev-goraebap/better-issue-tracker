---
name: bit-frontend
description: BIT 화면(client/, React·TanStack Router/Query·Astryx·페이지 우선 FSD) 개발 환경·코드 스타일·데이터 흐름·레이아웃·디자인 시스템·화면 이동과 로딩. "화면 추가", "페이지 만들어줘", "보드 화면", "결정 목록 화면", "문서함 화면", "컴포넌트", "모바일 화면", "프론트 고쳐줘", tsx·css 파일을 만들거나 고칠 때, 화면 설계를 바꿀 때 쓴다.
---

클라이언트는 `client/`의 React CSR 앱이다. URL은 TanStack Router, 서버 상태는 TanStack Query, 입력 초안은 로컬 상태가 소유하고, 코드는 페이지 우선 FSD로 배치한다. 화면은 서버가 켜져 있다고 알린 기능만 보인다(D-030).

이 스킬은 SandboxHr `hohr-frontend`에서 옮겼다. 본문에 나오는 공용 부품(`PageFrame`, `ListToolbar`, `RequestBoundary` 등)은 SandboxHr `client/src`에 있는 이름이며, BIT에서 처음 만들 때 같은 이름과 역할로 가져온다.

## 참고 파일

| 작업 | 파일 |
| :--- | :--- |
| 클라이언트를 빌드·실행하거나 검사를 돌릴 때 | [개발 환경](references/01-development.md) |
| 컴포넌트·파일을 만들거나 배치할 때 | [코드 스타일](references/02-code-style.md) |
| 데이터를 읽고 쓰는 화면을 만들 때, 켜진 기능에 따라 버튼을 숨길 때 | [데이터 흐름](references/03-data-flow.md) |
| 화면 배치를 만들거나 바꿀 때 | [적응형 레이아웃](references/04-layout.md) |
| 화면 컴포넌트를 고를 때 | [Astryx 디자인 시스템](references/05-design-system.md) |
| 라우트·페이지를 만들거나 로딩 표시를 바꿀 때 | [화면 이동과 로딩](references/06-navigation-loading.md) |

## BIT에서 정할 것

아래는 원본에 BIT용 답이 없어 비워 둔 것이다. 정하면 해당 참고 파일에 규칙으로 옮기고 이 목록에서 지운다.

- 결정·세션 본문처럼 마크다운을 적는 칸의 입력 부품: `TextArea`로 둘지, 공용 마크다운 입력을 만들지(05)
- 모바일 하단 바에 올릴 워크스페이스·프로젝트 메뉴와 '더보기'로 보낼 메뉴(04)
- 설정 공간(account / workspace / project / admin)의 모바일 내비게이션: 원본 관리자 공간처럼 하단 바 없이 서랍으로 둘지(04)
- 작업항목 상세의 맥락 패널(`05-ui.md` 5절)을 데스크톱·모바일에서 어떻게 놓을지(04)
- `PageState`의 상황별 그림: 원본의 풍경 일러스트는 가져오지 않았다(05)
- 제품 심볼 원본과 아이콘 생성 절차(05)
- 테스트 파일 이름 규칙(`conventions.md` 10절)

## 완료 기준

- `npm run check --prefix client`가 통과한다(컴포넌트 린트·steiger·테스트·타입 검사·빌드)
- 서버 계약을 새로 쓰면 `npm run api:generate --prefix client`로 만든 `client/src/shared/api/schema.d.ts`가 같은 커밋에 있다

결과가 틀리면 `skill-repair`로 이 스킬을 고친다.
