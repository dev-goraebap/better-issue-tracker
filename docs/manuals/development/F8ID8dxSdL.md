# 필터·URL·입력 초안 연결하기

화면의 조회 조건·선택·폼 초안을 라우트와 서버 조회에 연결합니다.

## 시작 전 확인

뒤로가기/공유가 필요한 값, 서버가 소유한 값, 저장 전 초안을 구분합니다. 현재 parser·query key·폼 수명을 찾습니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — URL·서버 상태·입력 초안 분리](../architecture/BEzXrFTF1X.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 상태 소유권과 실제 projectsQuery를 읽습니다.
2. 허용할 검색값과 기본값을 parser에 반영하고 라우트·조회 키·요청을 함께 수정합니다.
3. 대상 전환과 편집 시작에 맞춰 초안 초기화·보존을 연결합니다.
4. 필터 변경·뒤로/앞으로·새로고침·다른 공간 전환을 확인합니다.
5. 입력 중 재조회와 저장 실패를 일으켜 초안 보존을 확인합니다.
6. 관련 라우트/HTTP 테스트와 타입/빌드를 확인합니다.

## 완료 확인

URL·조회 조건·표시 결과가 일치하고 다른 범위의 캐시나 재조회가 현재 초안을 덮지 않는지 확인합니다.

## 막히면

화면과 주소가 달라지면 효과 함수로 값을 맞추기 전에 소유 상태와 parser/키의 계약을 대조합니다. 실패한 재조회와 최초 읽기 실패를 구분해 확인합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [client/src/entities/project/api/project.ts](../../../client/src/entities/project/api/project.ts)
- [client/src/shared/lib/route-search/index.ts](../../../client/src/shared/lib/route-search/index.ts)
- [client/src/pages/workspace/projects/model/search.ts](../../../client/src/pages/workspace/projects/model/search.ts)
- [client/src/pages/project/manuals/ui/ManualWorkspace.tsx](../../../client/src/pages/project/manuals/ui/ManualWorkspace.tsx)
