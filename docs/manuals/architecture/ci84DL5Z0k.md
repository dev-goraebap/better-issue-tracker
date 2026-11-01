# 두 매뉴얼을 작업과 설계로 찾아 읽기

현재 원본 정책은 D-125입니다. 이 저장소의 docs/manuals 원본을 코드와 함께 관리하고 BIT에는 게시합니다. 과거의 원격 우선 읽기 설명은 이 정책으로 대체됩니다. 상세 게시 계약은 skills/better-issue-tracker/references/manual-publication.md를 따릅니다.


이 책은 BIT의 구조와 설계 기준을 설명합니다. 여러 모듈·화면에 적용되는 규칙은 8장 횡단 관심사에 실제 코드·반례·예외·검증 기준까지 모았습니다. 개발 매뉴얼은 이 기준을 적용해 변경 작업을 수행하는 순서를 안내합니다.

## 목적에 맞춰 읽기

| 할 일 | 작업 절차 | 설계 판단 |
| --- | --- | --- |
| 서버 기능 변경 | [수정 위치 정하기](../development/YrHTVBFxOY.md) | [모듈 경계](tIv5Msv7KG.md) · [트랜잭션](by1uOTKEyK.md) |
| API·MCP·권한 변경 | [계약 변경](../development/xlXKn4GNiy.md) · [접근 검증](../development/ArYXJ23IQQ.md) | [진입점](Qz4Sozn74C.md) · [권한](YwbxTrzXk9.md) |
| DB·검색 변경 | [마이그레이션](../development/fRHDxTp1C8.md) · [목록 변경](../development/MJ3kcUrbmX.md) | [스키마 보존](ghuI6tESTu.md) · [조회](kegByIaS5R.md) |
| 화면 변경 | [슬라이스 작업](../development/i75mcSXKgO.md) · [상태 연결](../development/F8ID8dxSdL.md) | [FSD](LlJflSsoiL.md) · [상태 소유권](BEzXrFTF1X.md) |
| 목록·드래그 | [목록 추가](../development/YjCqoSHJBo.md) · [순서 연결](../development/jRJDZcpEJV.md) | [UI 기준](bgdEpYjSxz.md) · [순서/접근성](G1r5xJ4407.md) |
| 릴리스·운영 | [개발 매뉴얼의 배포 절차](../development/tpKZ6UIr31.md) | [배포 구조](L6HuRcXuVj.md) · [운영 위험](EQUszOg1KB.md) |

## 원본과 갱신

`AGENTS.md`는 프로젝트 진입 지침, 저장소 스킬은 작업 절차, 코드·OpenAPI·Flyway·검사 설정은 실행 계약이며 확정 결정의 원본은 `docs/decisions.md`입니다. 두 매뉴얼은 이를 이해하고 적용하는 설명을 제공합니다. 과거 리소스 문서는 근거로 보존합니다.

설계 기준이나 코드 예·검사 범위가 바뀌면 횡단 관심사를, 실행 단계·명령·실패 회복이 바뀌면 개발 절차를 갱신합니다. 한쪽의 상세 본문을 다른 책에 다시 복사하지 않습니다.

에이전트는 bit-development의 로컬 지도에서 해당 리비전의 원본을 선택해 읽습니다. MCP는 업무·개선 의견과 게시 직전 원격 본문/version 확인에 사용합니다. 원격 페이지를 개발 규칙의 필수 원본으로 다시 만들지 않습니다. 문서의 명령은 운영 작업의 승인이 아닙니다.


## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- 현재 지침 원본: `AGENTS.md`
- 현재 지침 원본: `skills/better-issue-tracker/references/development-manual.md`