# 기존 목록 부품으로 화면 추가하기

목록 화면을 새로 만들거나 행·검색·끝 동작을 바꿉니다.

## 시작 전 확인

가까운 기존 목록과 PageFrame·ListToolbar·ItemRow 등의 실제 props를 확인합니다. 필요한 역할별 동작과 긴 제목·설명 없음·빈/실패 상태의 시험 데이터를 준비합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 기존 프레임·목록·테마 유지](../architecture/bgdEpYjSxz.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 공용 UI 기준과 실제 프로젝트 목록 조합을 확인합니다.
2. 기존 프레임과 도구·행·하단 부품을 사용해 화면을 구성합니다.
3. 검색·필터·정렬·주 생성 동작·끝 더보기를 해당 동작에 연결합니다.
4. 부품 검사와 관련 테스트·타입/빌드를 실행합니다.
5. 데스크톱·모바일에서 설명 유무·긴 값·더보기·하단 개수와 배경을 확인합니다.
6. 접힌 사이드바와 밝은/어두운·색상 테마에서 크기·대비·잘림을 확인합니다.

## 완료 확인

기존 화면과 구조·조작이 일치하고 행 높이·제목/설명·끝 액션·하단 마감이 의도대로 보이는지 확인합니다. 자동 검사와 실제 화면 확인 결과를 구분합니다.

## 막히면

원하는 배치를 공용 부품으로 표현하지 못하면 별도 구조를 먼저 만들기보다 기존 사용 예와 설치 버전 계약을 확인합니다. 공용 부품 변경이 필요하면 기존 소비 화면 영향도 확인합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [client/src/pages/workspace/projects/ui/ProjectsPage.tsx](../../../client/src/pages/workspace/projects/ui/ProjectsPage.tsx)
- [client/src/pages/workspace/projects/ui/projects.module.css](../../../client/src/pages/workspace/projects/ui/projects.module.css)
- [client/src/pages/project/manuals/ui/ManualList.tsx](../../../client/src/pages/project/manuals/ui/ManualList.tsx)
