# bit-release 수정 기록

## 2026-10-25 · 처음 만듦
- 계기: 사용자가 배포할 때 태그와 도커 이미지 게시를 함께 하는 스킬을 원했다. 이미지는 태그 푸시 → Actions → GHCR로 정했다(D-082).
- 만든 것: SKILL.md, `scripts/set-version.mjs`, `.github/workflows/release.yml`. 화면 사이드바의 버전이 `package.json`을 읽게 바꿨다.
- 확인: 로컬에서 루트 Dockerfile로 이미지를 빌드해 컨테이너 health를 봤다. 실제 태그 푸시와 GHCR 게시는 아직 돌려 보지 않았다.
