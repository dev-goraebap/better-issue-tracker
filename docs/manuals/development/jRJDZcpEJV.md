# 목록의 순서 변경 연결하기

목록·섹션·메뉴에 저장 순서 변경을 연결합니다.

## 시작 전 확인

전체 순서의 범위와 권한을 확인합니다. 필터/검색·다음 페이지·표시 정렬이 적용된 상태에서 조작을 허용할지 현재 계약을 확인합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 드래그 정렬·키보드·실패 회복](../architecture/G1r5xJ4407.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 순서·접근성 기준과 프로젝트 목록 예를 읽습니다.
2. 공용 useRowReorder에 행 ID·이름·저장·실패 처리를 연결합니다.
3. 손잡이·키보드 안내·상태 읽기와 실제 저장 결과 재조회를 연결합니다.
4. 순서 검사와 관련 테스트를 실행합니다.

저장소 루트:

```powershell
npm run lint:reorder --prefix client
npm test --prefix client
```

5. 드래그·Alt+방향키·Esc·연속 이동·저장 거절·가장자리 스크롤·reduced motion을 확인합니다.
6. 재진입해 저장된 순서와 소속을 확인합니다.

## 완료 확인

드래그와 키보드 결과가 같고 실패 시 저장된 상태로 회복되는지 확인합니다. 매뉴얼 구조라면 섹션 소속과 페이지 순서의 일치도 확인합니다.

## 막히면

일부 행만 보이는 상태에서 전체 순서를 저장하지 않습니다. 거절 후 UI만 새 순서에 남아 있다면 공용 실패 처리와 재조회 결과를 대조합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [client/src/pages/workspace/projects/ui/ProjectsPage.tsx](../../../client/src/pages/workspace/projects/ui/ProjectsPage.tsx)
- [client/src/shared/lib/row-reorder/useRowReorder.ts](../../../client/src/shared/lib/row-reorder/useRowReorder.ts)
- [client/src/pages/project/manuals/ui/ManualStructure.tsx](../../../client/src/pages/project/manuals/ui/ManualStructure.tsx)
