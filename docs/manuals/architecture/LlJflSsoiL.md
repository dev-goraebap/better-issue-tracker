# 페이지 우선 FSD와 공개 API

화면 파일을 추가·이동하거나 공유 코드를 추출할 때 적용합니다.

## 규칙과 이유

신규 동작은 소비하는 페이지의 api/model/ui에 먼저 둡니다. 독립된 여러 화면이 실제로 재사용할 때 feature/entity 추출을 검토합니다. 슬라이스 밖에서는 index.ts 공개 API를 사용하고 같은 레이어의 다른 슬라이스 내부를 직접 참조하지 않습니다. 컴포넌트는 파일로 분리합니다.

## BIT 실제 코드

현재 코드 발췌: `client/src/pages/workspace/projects/api/load.ts` · 6행부터. 주변 선언·호출부는 원본에서 확인합니다.

```tsx
export const loadProjects = (client: QueryClient, workspaceId: string, search: ProjectsSearch) =>
  client.prefetchInfiniteQuery(projectsQuery(workspaceId, search.status ?? 'active', search.q ?? ''));
```

프로젝트 목록의 로더 조합은 페이지 api에 있고 재사용되는 프로젝트 조회는 entity 공개 API로 읽습니다. 라우트에서 이 로더를 쓴다는 사실만으로 페이지 코드를 entity로 옮기지 않습니다.

## 피해야 할 예

아래는 실패 이유를 보여 주는 설명용 반례이며 현재 BIT 구현의 발췌가 아닙니다. 생략된 선언이 있어 그대로 실행하는 완성 코드가 아닙니다.

```tsx
// 다른 페이지 내부나 entity 깊은 경로를 직접 읽는 반례
import { loadProjects } from "@/pages/workspace/projects/api/load";
import { projectQuery } from "@/entities/project/api/project";
```

## 예외와 적용 한계

첫 줄의 import가 해당 슬라이스 외부에 있을 때의 반례입니다. 슬라이스 내부 상대 import는 가능합니다. entity 간 제한된 @x 계약은 공식 FSD 규칙과 실제 사용처를 따르며 이를 모든 교차 import 허용으로 확대하지 않습니다.

## 검증 기준

자동: 루트에서 `npm run lint:fsd --prefix client`, `npm run lint:components --prefix client`로 의존 방향·공개 API·부품/파일 규칙을 확인합니다.

수동: 재사용 근거가 실제 두 화면인지, 하나의 변경이 불필요하게 shared로 번지지 않는지 확인합니다. 파일 길이만으로 새 공유 계층을 만들지 않습니다.

## 적용 절차

실제 변경은 [개발 매뉴얼의 작업 절차](../development/i75mcSXKgO.md)로 이어 갑니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [client/src/pages/workspace/projects/api/load.ts](../../../client/src/pages/workspace/projects/api/load.ts)
- [client/src/entities/project/index.ts](../../../client/src/entities/project/index.ts)
- [.agents/skills/bit-development/references/frontend/02-code-style.md](../../../.agents/skills/bit-development/references/frontend/02-code-style.md)
