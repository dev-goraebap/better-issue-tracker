# 맡은 변경의 작업 절차 찾기

이 책은 BIT의 코드를 변경하고 검사·리뷰·배포하는 작업 절차를 안내합니다. 설계 규칙의 이유·실제 코드·반례·검증 기준은 [아키텍처 매뉴얼의 횡단 관심사](../architecture/tIv5Msv7KG.md)에서 관리합니다.

## 맡은 작업으로 찾기

| 작업 | 시작할 절차 |
| --- | --- |
| 처음 실행 | [로컬 실행](ujTBLAqlgj.md) |
| 서버 기능 | [수정 위치](YrHTVBFxOY.md) · [DTO와 형식 검사](r9H9JoBuz4.md) · [도메인 변경](oSyVeWhOlE.md) · [쓰기 흐름](eMIBcD18ZX.md) |
| API·권한·오류 | [REST·MCP 변경](xlXKn4GNiy.md) · [접근 검증](ArYXJ23IQQ.md) · [실패 응답](hBPou6i68E.md) |
| DB·검색·저장 | [목록 변경](MJ3kcUrbmX.md) · [마이그레이션](fRHDxTp1C8.md) · [충돌 확인](bXuMEwplXk.md) · [첨부 경로](V4r21gaIls.md) |
| 화면 | [슬라이스](i75mcSXKgO.md) · [상태 연결](F8ID8dxSdL.md) · [요청 연결](Mz8JeOVDcL.md) · [목록](YjCqoSHJBo.md) · [순서 조작](jRJDZcpEJV.md) |
| 검증·리뷰 | [협업](aTEd5efrEQ.md) · [검사](AQygip0Rv4.md) · [격리 검증](RqGTB7dtd6.md) |
| 릴리스·운영 | [릴리스 준비](U0JhDpQURF.md) · [배포·복구](tpKZ6UIr31.md) · [운영 점검](zMxDaRLgq2.md) |
| 문서·스킬 | [유지관리](pNDA17FCoQ.md) |

## 변경을 시작하기 전에

프로젝트의 `AGENTS.md`와 해당 작업 스킬을 읽고 BIT 업무와 현재 변경을 확인합니다. 선택한 절차의 시작 전 확인에서 관련 횡단 관심사의 설계 기준을 엽니다. 구현·검사 원본은 현재 체크아웃과 대조합니다.

## 완료까지의 흐름

준비 → 관련 설계 기준 확인 → 변경 → 자동 검사와 실제 사용 경로 → 결과와 미검증 범위 기록 순서로 진행합니다. 각 절차에서 작업 위치·셸·성공 신호·중단/회복 조건을 확인합니다. 설계 규칙과 코드 예의 상세 본문은 이 책에 다시 유지하지 않습니다.


## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- 현재 지침 원본: `AGENTS.md`
- [server/build.gradle](../../../server/build.gradle)
- [client/package.json](../../../client/package.json)
