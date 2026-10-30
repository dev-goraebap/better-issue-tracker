# verify-bit 수정 기록

## 2026-10-30 · 처음 만듦
- 증상: 화면·MCP 동작을 바꿀 때마다 `launch.json`의 서버를 손으로 띄우고 로컬 데이터 사본으로 확인했다(BIT-134)
- 수정: pstack `create-verification-skill` 절차로 만들었다. `scripts/verify.mjs`가 run별 데이터·포트로 띄우고 첫 계정·API 키를
  API로 만들며, 조작·증거·정리를 맡는다. 만들며 고친 것: Windows에서 `cmd`가 `gradlew.bat`을 못 찾아 전체 경로로 부름,
  Git Bash가 `/api/...` 인자를 Windows 경로로 바꿔 `/api/` 뒤만 씀, 화면을 `localhost`로 열면 다른 로컬 BIT와 로그인 쿠키가
  섞여 `127.0.0.1`로 띄움
- 확인: run `proof`로 launch → doctor → 화면 로그인 → API로 프로젝트 → MCP로 업무 만들기·진행 중으로 옮기기 → DB·화면으로
  다시 보기 → cleanup. 정리 뒤 두 포트가 비고 `evidence/` 파일 5개가 남았다
