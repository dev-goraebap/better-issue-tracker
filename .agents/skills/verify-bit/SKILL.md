---
name: verify-bit
description: BIT를 이 체크아웃 그대로 따로 띄워 사람(화면)·에이전트(MCP)·API가 쓰는 길로 조작하고, 바뀐 동작을 증거(응답·DB·화면 글)로 남긴 뒤 치우는 검증 절차. "실제로 되는지 확인해줘", "화면에서 검증", "MCP로 돌려봐", "검증 스킬", 화면·API·MCP 동작을 바꾼 뒤 완료라고 말하기 전에 쓴다.
---

# BIT 검증

이 체크아웃의 코드로 BIT를 하나 더 띄워, 사용자가 쓰는 길로 기능을 돌리고 증거를 남긴다. 실행·점검·조작·증거·정리는
`scripts/verify.mjs` 하나가 맡는다. 기능별 조작법은 [features/](features/README.md)에 있다.

모든 명령은 저장소 루트에서 `node .agents/skills/verify-bit/scripts/verify.mjs <명령> <run>`이다. 아래에서는 `verify`로 줄인다.
`<run>`은 소문자·숫자·하이픈 이름(`status-board`)이고, 한 run의 모든 것은 `.tmp/verify/<run>/`(git 무시)에 있다.

## 실행

```bash
node .agents/skills/verify-bit/scripts/verify.mjs launch <run>
```

- 하는 일: 빈 `data/`에 서버(`server`의 `bootRun --no-daemon`, dev 프로필)와 화면(`client`의 Vite)을 빈 포트로 띄우고,
  `/setup`과 같은 API로 첫 관리자·워크스페이스(`verify-<run>`)·API 키를 만든다. 계정과 키는 `account.json`에 둔다.
- 준비됨의 기준: 서버 `/api/v1/health`가 UP(Flyway 마이그레이션까지 끝남), 화면 `/`가 200, 화면 포트의 `/api`가 이 서버로
  간다, 첫 계정 만들기가 성공했다. 출력 JSON의 `client`가 조작할 주소다. 처음 실행은 서버 빌드로 1~2분, 그 뒤는 30초쯤 걸린다.
- 화면 주소는 `127.0.0.1:<포트>`다. 브라우저는 쿠키를 포트가 아닌 호스트로 나눠, `localhost`로 열면 다른 로컬 BIT의
  로그인을 덮어쓴다.
- 전제: `client/node_modules`가 있다(없으면 `client`에서 `npm ci`). 실패하면 띄운 것을 스스로 멈추고 `logs/`를 가리킨다.

## 점검(doctor)

```bash
node .agents/skills/verify-bit/scripts/verify.mjs doctor <run>
```

읽기만 한다. 프로세스 둘이 살아 있는지, health, 화면 응답, API 키로 `/api/v1/me/workspaces`가 200인지, launch 때 커밋과
지금 `HEAD`가 같은지 본다. 조작 전에 한 번, 이상하면 언제든 먼저 돌린다. `sameRevision`이 false면 화면은 Vite가 새 코드를
받지만 서버는 띄울 때의 코드다. 서버를 바꿨으면 정리하고 다시 띄운다.

## 조작

- **에이전트 길(MCP).** `verify mcp <run> --list`로 도구를 보고, `verify mcp <run> <도구> '<JSON 인자>' --save <이름>`으로
  부른다. 인자의 `workspace`는 `verify-<run>`이다. 에이전트가 BIT의 첫 사용자라(AGENTS.md 원칙 2) 동작 검증은 이 길을 먼저 쓴다.
- **API 길.** `verify api <run> <METHOD> /api/v1/... '<JSON>' --save <이름>`. API 키(Bearer)라 CSRF·Origin이 필요 없다.
  워크스페이스 id는 `account.json`의 `workspace.id`. 프로젝트처럼 MCP에 없는 준비는 이 길로 한다.
- **화면 길.** 내장 브라우저(`mcp__Claude_Browser__*`)로 출력의 `client` 주소를 연다. `/login`에서 `account.json`의 이메일·
  비밀번호로 로그인한다(이 run만의 시험 계정이다. 비밀번호를 대화에 옮겨 적지 않는다). 찾을 때는 좌표 대신 보이는 이름
  (`find`의 버튼 글, `aria-label`)을 쓴다. 화면을 못 쓰는 에이전트는 MCP·API 길로만 검증하고 화면은 못 봤다고 적는다.
- 기능마다 준비 조건·입구·확인할 끝 상태는 [features/](features/README.md)의 파일을 따른다. 준비가 안 돼 막히면 그 기능의
  `Gotchas`에 이유를 적고 실패로 보고한다. 통과시키려고 절차를 줄이지 않는다.

## 증거

- 남는 곳: `.tmp/verify/<run>/evidence/`. `--save <이름>`이 번호를 붙여 요청·응답을 JSON으로 남긴다. 화면에서 본 것은
  `get_page_text`·`read_page`의 해당 부분을 `verify note <run> <이름>`(표준 입력)으로 남긴다. 스크린숏은 대화에만 남는다.
- 기준: 화면·MCP·API처럼 사용자가 실제로 쓰는 길로 조작한다(테스트 전용 경로·DB 직접 쓰기 금지). 조작과 그 결과를 함께
  남긴다. 저장된 결과는 다른 길로 한 번 더 확인한다: `verify db <run> "select …" --save <이름>`(읽기 전용) 또는 화면에서
  다시 연다.

## 정리

```bash
node .agents/skills/verify-bit/scripts/verify.mjs cleanup <run>
```

launch가 띄운 프로세스만 프로세스 트리째 멈추고(이름으로 죽이지 않는다) `data/`와 `account.json`을 지운다. `evidence/`와
`logs/`는 남긴다. 실패한 시도 뒤에도 매번 돌린다. `verify list`로 남은 run을 본다.

## 하지 않는 것

- 다른 사람이나 다른 세션이 띄운 BIT(`launch.json`의 서버, 운영)를 조작하지 않는다. 이 스크립트가 띄운 run만 쓴다.
- 증거 폴더를 지우거나 비밀번호·API 키를 증거나 대화에 적지 않는다.

## 완료 기준

- 출력에 `doctor`의 `"ok": true`가 있었다.
- 검증한 기능마다 `evidence/`에 조작 결과와, 그것을 다른 길(DB·화면)로 다시 본 파일이 있다.
- `cleanup` 뒤 `verify list`에서 그 run의 `running`이 false이고 `evidence/` 파일이 그대로 있다.

결과가 틀리면 `skill-repair`로 이 스킬을 고친다.
