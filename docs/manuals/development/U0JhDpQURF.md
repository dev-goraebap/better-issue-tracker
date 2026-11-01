# 버전·태그·이미지 게시 준비하기

릴리스는 검증한 커밋을 버전과 이미지로 식별하는 작업입니다. 이미지 게시와 운영 서버 교체를 나누어 확인합니다. 이 페이지는 절차 설명이며 실행 권한을 대신하지 않습니다.

## 버전과 준비

사용자가 정한 버전을 사용합니다. 정하지 않았다면 지난 태그 이후 변경을 보고 버전을 확인합니다. 현재 0.x 규칙은 새 기능에 둘째 자리, 고침만 있으면 셋째 자리를 올립니다. 버전 파일은 `client/package.json`, `client/package-lock.json`, `server/build.gradle`입니다.

1. 작업 트리와 main/origin/main, 포함할 업무와 커밋을 확인합니다.
2. 서버·클라이언트·스킬 검사와 실제 기능 검증을 마칩니다.
3. 승인된 버전을 `node scripts/set-version.mjs <버전>`으로 맞추고 변경 파일을 검토합니다.
4. 운영 이미지의 로컬/격리 확인과 마이그레이션 검증을 준비합니다.

`<버전>`은 확인한 실제 값으로 바꿉니다. 문서의 예를 그대로 실행해 새 릴리스를 만들지 않습니다. 다른 사람의 버전 파일 변경을 섞어 커밋하지 않습니다.

## 후보와 정식

후보 태그는 `v<버전>-rc.<번호>`, 정식은 `v<버전>`입니다. 정식은 검증한 마지막 후보와 같은 커밋을 가리킵니다. 실패한 태그를 옮기거나 재사용하지 않고 수정 후 다음 후보를 만듭니다.

`.github/workflows/release.yml`은 `v*` 태그 push로 GHCR 이미지를 빌드·게시합니다. main 병합 자체는 운영 배포가 아닙니다. 이미지 안에서 모든 검사를 다시 수행한다고 가정하지 말고 Verify 결과와 게시 결과를 각각 확인합니다.

후보 이미지의 health와 화면을 격리 실행에서 확인한 뒤 승인된 정식 태그·Release를 게시합니다. 정확한 명령과 확인 항목은 저장소의 릴리스 플레이북을 실행 직전에 읽습니다. 레지스트리 자격 증명은 사용자 환경의 안전한 인증 경로를 사용합니다.

## 결과와 다음 단계

태그·SHA·이미지 식별자·Actions 결과·Release URL·검증 범위를 포함 업무에 남깁니다. ‘이미지 게시 완료’와 ‘운영 교체 완료’를 구분합니다. 운영까지 요청받았다면 [배포와 복구](tpKZ6UIr31.md)로 이어 갑니다.

이 개발 매뉴얼 작성에서는 현재 워크플로와 릴리스 지침을 대조했습니다. 새 태그 push·이미지 게시·운영 교체는 실행하지 않았습니다.

## 관련 아키텍처

[구조와 설계 이유](../architecture/uDoCFGJeZL.md)를 함께 확인합니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [.agents/skills/bit-development/playbooks/release.md](../../../.agents/skills/bit-development/playbooks/release.md)
- [.github/workflows/release.yml](../../../.github/workflows/release.yml)
- [scripts/set-version.mjs](../../../scripts/set-version.mjs)
- [Dockerfile](../../../Dockerfile)
