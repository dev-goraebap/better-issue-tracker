# T-001. 저장소 골격 만들기 (Codex 작업 지시서)

> 받는 이: Codex. 작성: 2026-10-22, Claude Code와의 기획 세션.
> 먼저 `AGENTS.md`를 읽고, 작업 중에는 `.agents/skills/`의 `bit-*` 스킬을 따른다.
> 이 작업의 결과는 "기능 없이 빌드·검사·실행이 되는 빈 골격"이다. 기능 코드는 다음 작업부터다.

## 목표

`server/`(Spring Boot)와 `client/`(React + Astryx)가 각각 검사를 통과하고, 도커 이미지 하나로 함께 뜨는 상태.

## 참고할 원본

사용자의 평소 프로젝트 SandboxHr(`C:\Users\devgo\Workspace\sandbox\SandboxHr`)를 **읽기만** 한다. 고치지 않는다.
설정 파일은 그곳에서 가져와 BIT 이름으로 바꾼다. HR 전용 내용은 가져오지 않는다(`docs/conventions.md` 9절 표).
`credentials/`, `.env`, `CLAUDE.local.md`는 열지 않는다.

| 만들 것 | SandboxHr에서 참고할 파일 |
|---|---|
| `server/build.gradle`, `settings.gradle`, Gradle Wrapper, `lombok.config` | `server/` 같은 이름 파일 |
| `server/config/checkstyle/`, `server/config/spotbugs/` | 같은 경로 |
| `client/package.json`, `vite.config.ts`, `tsconfig.json`, `steiger.config.ts` | `client/` 같은 이름 파일 |
| `client/scripts/check-components.mjs` | 같은 경로 |
| `Dockerfile`, `.dockerignore`, `dev.sh` | 루트 같은 이름 파일 |
| `deploy/dev/compose.yaml`, `deploy/prod/compose.yaml` | 같은 경로 (Litestream은 prod에 선택으로 남김) |

## 할 일

### 1. server
- Java 21, Gradle Wrapper, Spring Boot 4.1.1. 의존성과 품질 도구 구성은 SandboxHr `build.gradle`과 같게 한다
  (webmvc, security, validation, flyway, jooq, websocket, sqlite-jdbc, springdoc, Spotless, Checkstyle, SpotBugs, ArchUnit, JUnit 5).
  메일(spring-boot-starter-mail)은 넣되 설정이 없으면 꺼지게 한다(D-030). POI·PDFBox·S3 SDK는 이 작업에서 넣지 않는다.
- `group = 'io.github.goraebap'`, 루트 패키지 `io.github.goraebap.bit` (D-025), `spring.application.name=bit`.
- 패키지: `module/`(빈 패키지 `iam, workspace, project, workitem, decision, session, artifact, coderef, link, file, notification, mcp`의 `package-info.java`만)과 `shared/{config,domain,error,persistence,storage,text,web}`.
- `shared/error`: `ErrorCode`, `BusinessException`, `DomainRuleViolation`, RFC 9457 응답 처리기 (`bit-api-contract`).
- `shared/web`: SPA 서빙(`/api/`가 아니면 `index.html`, `/assets/` 1년 캐시) — SandboxHr `ScreenConfig`와 같은 규칙.
- DB: SQLite 파일 `server/data/bit.db`(설정으로 바꿀 수 있게), 연결 속성은 `bit-database` 스킬대로. Flyway `V1__schema.sql`은 **빈 파일이 아니라**
  `docs/06-schema.md`의 1절(iam)만 담는다. 나머지 테이블은 기능 작업마다 V2부터 더한다.
- API: `GET /api/v1/health`(인증 없음), `GET /api/v1/capabilities`(인증 없음) — 계약은 `bit-api-contract` 01 6절 (D-030). 지금은 `objectStorage: true`(로컬 기본, D-029), 나머지 `false`.
- 보안: 기본 거부, 위 두 엔드포인트만 허용. 로그인 구현은 다음 작업.
- 비밀값은 첫 실행 때 생성(SandboxHr `GeneratedSecrets`와 같은 방식).
- `ArchitectureTest`: 모듈 간에는 모듈 루트의 공개 계약만 참조, `infrastructure` 패키지 비공개 규칙 (`bit-backend`).
- `exportOpenApi` 태스크로 `server/openapi.json` 생성.

### 2. client
- `name: bit-client`. React 19, TypeScript, Vite, `@astryxdesign/core`·`theme-stone`·`cli` 0.5.2, TanStack Router·Query, openapi-typescript, steiger, tsx. 버전은 SandboxHr `package.json`과 같게.
  Lexical, Uppy, dnd-kit, xyflow, Phaser 등 HR 화면용 의존성은 넣지 않는다.
- 스크립트: `dev`, `build`, `api:generate`, `lint:fsd`, `lint:components`, `test`, `check`, `astryx`. (`town:map`, `branding`은 넣지 않는다)
- FSD 골격: `app/`, `pages/`, `widgets/app-shell`, `shared/{api,config,ui}` (`bit-frontend`, `feature-sliced-design`).
  `shared/config`에 `PRODUCT_NAME = 'BIT'`, `MOBILE_QUERY = '(width < 64rem)'`.
- 셸: 데스크톱 사이드바(워크스페이스 메뉴 자리: 홈·Inbox·My Tasks·Members·문서함, 아래 프로젝트 목록 자리), 모바일 하단 바 + "더보기" 시트. 메뉴는 빈 페이지로 연결만 한다 (`docs/05-ui.md`, `docs/conventions.md` 6절 표).
- 첫 화면에서 `/api/v1/capabilities`를 읽어 두는 query 하나 (D-030). 화면 표시는 아직 없어도 된다.

### 3. 루트
- `Dockerfile`: 3단계(node:24-alpine 화면 빌드 → temurin 21 jdk `bootJar` → 21 jre 실행), 비루트 사용자, 볼륨 `/var/lib/bit`, HEALTHCHECK `/api/v1/health`.
- `dev.sh [all|server|client]`: SandboxHr와 같은 동작(Docker·`.env` 없이 bootRun dev + vite, `/api` 프록시).
- `.github/workflows/verify.yml`: push·PR에서 `server: ./gradlew check`, `client: npm ci && npm run check` (D-026). 이미지 빌드·배포는 넣지 않는다.
- `server/.env.example`: 지금 읽는 설정만(DB 경로, 포트). 메일·S3·Git 설정 자리는 주석으로만.

## 하지 않는 것
- 로그인, 워크스페이스 등 기능 코드와 V1 이외의 테이블
- MCP 엔드포인트, 문서 변환, PDF, S3 어댑터, Git 연동
- `CLAUDE.md` 만들기 (D-017)

## 완료 기준 (모두 통과해야 끝)
- `cd server && ./gradlew check` 통과 (Spotless·Checkstyle 경고 0·SpotBugs·ArchUnit·테스트)
- `cd client && npm ci && npm run check` 통과
- `sh dev.sh`로 띄우고 `curl localhost:<서버 포트>/api/v1/health`가 200, `/api/v1/capabilities`가 위 JSON
- `docker build .` 성공, 컨테이너 실행 후 HEALTHCHECK가 healthy
- `server/openapi.json`과 `client/src/shared/api/schema.d.ts`가 같은 커밋에 있다
- 만든 코드·설정에 SandboxHr 이름이 남지 않았다: `git grep -i hoho -- server client Dockerfile dev.sh deploy .github` 결과 0건
  (`.agents/skills`의 이관 기록에는 원본 이름이 남아 있어도 된다)

## 끝나면
- 설계에 영향을 준 판단(예: 라이브러리 선택)은 `docs/decisions.md`에 결정으로 추가한다 (AGENTS.md 작업 규칙).
- 스킬과 실제가 달랐던 곳은 `skill-repair` 절차로 해당 `bit-*` 스킬을 고친다.
- 커밋은 사용자가 요청할 때만 한다.
