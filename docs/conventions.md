# 개발 규칙 (conventions)

BIT의 기술 스택, 코드 구조, 관리 방법론을 정리한다.
**원본은 사용자의 평소 프로젝트 SandboxHr**(`C:\Users\devgo\Workspace\sandbox\SandboxHr`)이고, 이 문서는 그것을 BIT에 맞게 옮긴 요약이다.
세부 규칙은 SandboxHr의 `.agents/skills/hohr-*` 스킬을 읽는다. 저장소를 초기화할 때 그 스킬들을 BIT용으로 이름을 바꿔 가져온다(아래 9절).

개념·화면 구조는 Kaneo(`C:\Users\devgo\Workspace\밴치마크\kaneo`)를, 코드는 SandboxHr를 따른다 (D-009, D-010).

> 2026-10-22 두 저장소를 읽고 작성. SandboxHr 문서와 실제 코드가 어긋난 곳은 **실제 코드를 기준**으로 적었다(10절).

---

## 1. 기술 스택

| 구분 | 선택 | SandboxHr 기준 버전 |
|---|---|---|
| 언어·빌드 | Java 21, Gradle(Wrapper) | Gradle 9.5.1 |
| 서버 | Spring Boot (webmvc, security, validation, flyway, jooq, websocket) | 4.1.1 |
| DB | **SQLite 파일 하나** (WAL, `synchronous=NORMAL`, `busy_timeout=5000`, FK on, `transaction_mode=IMMEDIATE`) | sqlite-jdbc(Boot 관리) |
| 마이그레이션 | Flyway | Boot 관리 |
| 쿼리 | jOOQ (JPA 안 씀), codegen은 마이그레이션 SQL에서 (`DDLDatabase`) | 3.21.6 |
| API 문서 | springdoc-openapi → `server/openapi.json` | 3.1.1 |
| 서버 품질 | Spotless(palantirJavaFormat), Checkstyle(경고 0), SpotBugs, ArchUnit, JUnit 5 | |
| 화면 | React + TypeScript + Vite | React 19.2.8, TS 6.0.2, Vite 8.1.5 |
| 디자인 시스템 | **Astryx** `@astryxdesign/core`, `@astryxdesign/theme-stone`, `@astryxdesign/cli` | 0.5.2 |
| 라우터·서버 상태 | TanStack Router, TanStack Query | 1.170.x, 5.102.x |
| 전역 상태 | 별도 라이브러리 없음 (Query·Router·로컬 state로 나눔) | |
| 계약 타입 | `openapi-typescript` (서버 openapi.json → 화면 타입) | 7.13.0 |
| 화면 품질 | Steiger(FSD 검사), `node --test` + tsx | |
| 실행 환경 | Node 24 | |

Astryx를 고른 이유: 적응형(모바일) UI 대응이 잘 되어 있다. 화면은 데스크톱·모바일을 같은 코드로 대응한다(6절).

## 2. 저장소 구조와 배포

```
BIT/
 ├─ server/            Spring Boot (Gradle)
 ├─ client/            React + Astryx (npm)
 ├─ docs/              기획·결정 문서 (도그푸딩 전까지)
 ├─ deploy/            compose 파일
 ├─ scripts/           sync-skills.mjs 등
 ├─ .agents/skills/    에이전트 스킬 원본
 ├─ Dockerfile         3단계 빌드 (node → jdk → jre)
 └─ dev.sh             로컬 실행
```

- **서빙**: 화면은 CSR SPA. Spring Boot가 빌드된 정적 파일을 API와 함께 서빙한다.
  `/api/`가 아니면 `index.html`, 확장자가 있는 주소는 404. `/assets/`는 1년 불변 캐시, 나머지 `no-cache`.
- **Docker**: 루트 `Dockerfile` 하나. `node:24-alpine`(화면) → `eclipse-temurin:21-jdk-alpine`(`bootJar`) → `21-jre-alpine` 실행.
  비루트 사용자, 데이터 볼륨 하나(DB·파일), HEALTHCHECK `/api/v1/health`. AGENTS.md의 "도커 컨테이너 하나" 원칙과 맞는다.
- **로컬 실행**: `sh dev.sh [all|server|client]`. Docker·`.env` 없이 bootRun(dev 프로필) + vite(`/api` 프록시). 비밀값은 첫 실행 때 자동 생성.
- **백업**: SandboxHr는 prod에서 Litestream 사이드카로 객체 스토리지에 복제한다. BIT도 같은 방식을 쓸 수 있다(선택).
- **CI**: GitHub Actions (D-026). SandboxHr의 verify 단계(서버 `./gradlew check`, 화면 `npm run check`)를 Actions로 옮긴다. 배포 자동화는 나중.

## 3. 백엔드 규칙
상세: SandboxHr `hohr-backend` 스킬 (`references/01-development.md` ~ `04-cross-module-read.md`)

- **모듈형 모놀리스**. 루트 패키지 `io.github.goraebap.bit` 아래 `module/<업무>`와 `shared/{config,domain,error,persistence,storage,text,web}`.
  모듈은 단수 소문자. 의존 방향은 ArchUnit(`ArchitectureTest`)으로 강제한다.
- **모듈 내부**
  - 모듈 루트: 공개 계약만 (`*Facade`, `*Spi`, `*Event`, 접미사 없는 데이터 타입)
  - `application`: Controller, Service, QueryService, Query 포트, `Requests`/`Views` record 묶음, `*ErrorCode`
  - `domain`: 순수 Java 엔티티·VO·Repository 포트
  - `infrastructure`: `Jooq*Repository`, `Jooq*Query`, 외부 어댑터 (package-private)
  - Facade는 Service가 직접 구현한다 (`WorkItemService implements WorkItemFacade`).
- **명령**: 애그리거트 복원 → 업무 메서드 → `Repository.save()`. **조회**: jOOQ로 화면 DTO에 직접 투영, 필터·정렬·페이징은 DB에서.
- **모듈 간 읽기**: 표시용 정보는 페이지 확정 후 Facade로 배치 조회, 검색·정렬에 쓰는 값은 SQL로 직접 읽기. 명령은 반드시 Facade.
- **명명**: 저장소 메서드는 Spring Data 어휘(`findById`, `find…ForUpdate`, `exists…By`). `find*`는 Optional, `get*`은 없으면 예외.
  접근자는 fluent(`lombok.accessors.fluent=true`).
- **코드 스타일**: 생성자 주입만, `@Setter` 금지, 와일드카드 import·catch-all 금지, 현재 시각은 `Clock` 빈으로.
  엔티티는 private 생성자 + `create()`(검증) + `fromPersistence()`(infrastructure만 호출). VO는 record + `of()`.
- **오류**: 업무 실패 `BusinessException`(`ErrorCode.raise()`), 불변식 위반 `DomainRuleViolation`, 시스템 이상 `IllegalStateException`.
- **트랜잭션**: Service public 메서드에만, 조회는 `readOnly`. 1 트랜잭션 1 애그리거트. **트랜잭션 안에서 외부 호출 금지**(SQLite 쓰기 잠금).
  → BIT 영향: docx/xlsx 텍스트 변환, 웹훅 수신 후 처리 같은 무거운 작업은 트랜잭션 밖에서 한다.
- **테스트**: `test`(단위·ArchUnit·HTTP 계약)와 `integrationTest`(태그 `integration`, 컨텍스트마다 새 SQLite 파일). `./gradlew check`가 둘 다 실행.
  버그 수정은 재현 테스트 먼저.

## 4. API 계약
상세: SandboxHr `hohr-api-contract` 스킬

- **URL**: `/api/v1`, 복수형 명사, ID 경로 변수(10자, D-083). 상태 전이는 하위 자원(`/decisions/{id}/acceptances` 같은 식).
- **응답 봉투 없음**: GET 200+본문 / POST 201+`Location`(빈 본문) / PUT·PATCH·DELETE 204.
- **JSON**: null 필드도 키 유지. PATCH는 "생략"과 "null"을 구분. 시각은 UTC ISO(`Z`), 날짜 `YYYY-MM-DD`.
- **목록**: 커서 페이징. 쿼리 `sort`, `direction`, `cursor`, `size` → 응답 `{items, nextCursor}`. 정렬 마지막 기준은 항상 고유 ID(jOOQ `seek`).
- **오류**: RFC 9457 `application/problem+json` + 확장 필드 `code`(`<MODULE>_<REASON>`), `traceId`, `errors[{field,message}]`.
  404/403은 구분해 드러내지 않는다. 검증 문구는 한국어.
- **인증**: DB 세션 + `HttpOnly; SameSite=Lax; Secure` 쿠키, 상태 변경은 CSRF 토큰 + Origin 검사, 기본 거부.
  개인 API 키(Bearer)는 에이전트·MCP용으로 BIT에서 더 넓게 쓴다(SandboxHr는 GET만). 로그인은 이메일 + 비밀번호 기본, SMTP가 있으면 이메일 OTP 추가 (D-027).
- **첨부·산출물 파일**: `file` 모듈이 `blob`, `attachment`(`owner_type`, `owner_id`), `pending_upload`를 소유.
  사전 서명 PUT → 업무 모듈이 권한 확인 후 확정 → 실제 크기·MIME 교차 검증. 로컬은 `LocalObjectStorage`, 고아 파일은 GC 배치.
  → 산출물 원본(docx/xlsx)도 이 모듈 위에 올린다. 저장소는 로컬(데이터 볼륨)이 기본, S3 호환(AWS S3·R2·MinIO)은 설정으로 (D-029).

## 5. DB 규칙
상세: SandboxHr `hohr-database` 스킬. 이름 규칙은 스킬에 없고 코드에서 읽은 것이라 여기 명시한다.

- **이름**: 테이블 단수 snake_case. PK 열 `<table>_id`, PK 제약 `<table>_pkey`.
  FK `<t>_<col>_<ref>_<refcol>_fk`, 고유 인덱스 `ux_`, 일반 인덱스 `ix_`, CHECK `ck_`.
- **ID**: 애플리케이션이 `Ids.newId()`로 만든 10자 글자(`A-Za-z0-9`, 첫 글자 영문)를 텍스트로 저장 (D-083).
  (작업항목 키 `PRJ-42` 같은 사람용 번호는 별도 열 — `02-domain-model.md`)
- **감사 열**: 필요한 테이블에 `created_at/by`, `updated_at/by`, `deleted_at/by`. 시각은 UTC 텍스트, 소수 6자리 고정.
- **소프트 삭제**: `deleted_at` 하나. 고유 제약은 `WHERE deleted_at IS NULL` 부분 인덱스.
- **마이그레이션**: `V<n>__<이름>.sql` 추가만. 적용된 파일 수정·`flyway repair` 금지.
  제약 변경은 SQLite 방식대로 테이블 재생성. jOOQ가 못 읽는 구문은 `-- [jooq ignore start/stop]`로 감싼다.

## 6. 프론트엔드 규칙
상세: SandboxHr `hohr-frontend` 스킬 (`references/01~06`), `feature-sliced-design` 스킬

- **FSD (페이지 우선)**: `app → pages → widgets → features → entities → shared`.
  코드는 먼저 `pages/<slice>/{api,model,ui}`에 두고, 두 화면 이상에서 실제로 쓰일 때만 아래 레이어로 올린다.
  공개 `index.ts`로만 참조, 같은 레이어 교차 import 금지. Steiger `recommended`.
- **명명**: 파일 하나에 컴포넌트 하나, PascalCase 파일명, 페이지 `*Page`, 훅 `use*`, 유틸 kebab-case. 별칭 `@/` = `src`.
- **데이터 흐름**: 서버 상태 Query, URL 상태 Router(`validateSearch`), 입력 초안 로컬 state.
  `queryOptions`·키는 슬라이스 `api` 세그먼트에. 라우트 loader가 첫 화면 조회를 prefetch. 변경 후 키 무효화.
  낙관적 갱신·mutation 재시도 안 씀. 실시간 변경은 SSE.
- **적응형 레이아웃**: 중단점은 `MOBILE_QUERY = '(width < 64rem)'` 하나와 Astryx `useMediaQuery`.
  상호작용 구조가 달라지면 React에서 분기, 치수만 다르면 CSS로.
  셸(`widgets/app-shell`): 데스크톱은 사이드바, 모바일은 하단 바 + "더보기" 시트, 만들기는 `FloatingAction`.
  공통 부품: `PageFrame`, `ListToolbar`, `CompactDialog`/`ConfirmDialog`(모바일은 바텀시트), `RoutedPanel`. 모바일 입력 48px·글자 16px.
- **Astryx 사용**: 먼저 CLI로 확인(`npm run astryx -- search|component|docs …`). 배치는 `Layout`/`VStack`/`HStack`과 토큰, 색·크기 하드코딩 금지.
  빈 상태·오류 `PageState`/`RequestBoundary`, 상태 표시 `StatusToken`, 날짜·시각 `DateField`/`TimeField`.
- **완료 기준**: `npm run check` (컴포넌트 검사 → steiger → test → tsc + vite build).

### Kaneo 화면 구조를 Astryx 셸에 옮기는 방식
Kaneo와 SandboxHr의 전체 레이아웃이 비슷하므로 SandboxHr 셸을 그대로 쓰고 메뉴만 Kaneo 구조로 채운다.

| 영역 | Kaneo | BIT (Astryx 셸) |
|---|---|---|
| 사이드바 위 | 워크스페이스 전환기 | 같음 |
| 워크스페이스 메뉴 | Home, Inbox, My Tasks, Members | 같음 |
| 프로젝트 메뉴 | board(칸반/리스트), backlog, calendar, gantt | 같음 + 결정, 산출물, 세션·회의 (`05-ui.md`) |
| 설정 | account / workspace / project / admin | 같음 |
| 모바일 | 사이드바 → 드로어, 별도 Expo 앱 | 하단 바 + 시트 (네이티브 앱은 만들지 않음) |

## 7. 커밋·검증
- 서버 완료 기준 `./gradlew check`, 화면 완료 기준 `npm run check`.
- 커밋 메시지에 작업항목 키를 넣는다(BIT 자체 도그푸딩 시작 후).

## 8. 에이전트 스킬 관리 방법론
SandboxHr `AGENTS.md`, `skill-repair` 스킬, `scripts/sync-skills.mjs`를 그대로 따른다.
2026-10-22에 옮겼다: `bit-architecture`, `bit-backend`, `bit-frontend`, `bit-api-contract`, `bit-database`, `feature-sliced-design`, `skill-repair` (D-033).
각 `bit-*` SKILL.md 끝의 "BIT에서 정할 것"은 해당 기능을 만들 때 정한다.

- **원본과 사본**: `.agents/skills/`가 원본(다른 에이전트도 읽음), `.claude/skills/`는 사본이며 손으로 고치지 않는다.
  SessionStart 훅이 `scripts/sync-skills.mjs`로 동기화한다. `.claude/*`는 `settings.json`만 커밋, `skills-lock.json`은 gitignore.
- **스킬 하나의 구조**
  - `SKILL.md`: 프론트매터 `name` + 실제 요청 문구가 든 `description`. 본문은 짧은 규칙, "작업 → 참고 파일" 표, 반증 가능한 완료 기준,
    마지막 줄 "결과가 틀리면 `skill-repair`로 이 스킬을 고친다".
  - `references/NN-주제.md`: 목적당 파일 하나, 이름에 날짜·버전 금지, 프론트매터에 title·description(언제 읽나).
  - `scripts/`: 기계적 단계 대신.
  - `notes.md`: 수정 기록, 최신이 위, `## 날짜 · 층` + 증상·수정·확인.
- **skill-repair 절차**: 멈춤 → 층 하나 진단(절차·도구·검증) → 가장 작은 영구 수정 → 초안 승인 → 적용·notes 기록 → 동기화 후 같은 작업 재실행 비교.
- **같은 내용을 두 번 쓰지 않는다**: 제품 동작·설계, 제품 결정의 이유, 작업 규칙의 이유, 일하는 방식(스킬), 고친 이력(notes)은 각각 한 곳에.
  SandboxHr는 앞의 둘을 Gitifact(`.gitifact/`)에 둔다. BIT에서 무엇에 둘지는 미결(`open-questions.md`).

## 9. SandboxHr에서 가져올 때 바꿀 것
| SandboxHr | BIT |
|---|---|
| 스킬 이름 `hohr-*` | `bit-*` (예: `bit-backend`) |
| Java 패키지 `store.hohoco`, 제품명 `HOHR`/`PRODUCT_NAME`, npm `hohoco-client` | 패키지 `io.github.goraebap.bit` (D-025), 제품명 `BIT` (D-024), npm `bit-client` |
| 이미지·볼륨·DB 파일 `hohoco`, 쿠키 `hohohr_session`, API 키 접두사 `hohr_` | `bit` 계열로 |
| 모듈 그룹 `office`·`projects`와 HR 업무 모듈(approval, vacation …) | BIT 모듈 (workspace, project, workitem, decision, session, artifact, coderef, link, file …) |
| 결재 SPI 규칙, `LEAVE_*` 등 오류 코드 예시 | 제외 |
| 회사 서버·도메인·GitLab 러너·배포자 고정·사내망 IP·Redmine/레거시 이관 | 제외 |
| 로켓 로딩·풍경 일러스트·호호타운 등 고유 연출 | 제외 (기본 로딩 표시만) |
| "사내 공식 이메일"·"결재자" 정책 | 제외 |

## 10. SandboxHr에서 문서와 코드가 어긋난 곳 (가져올 때 주의)
- README·`build.gradle` 주석의 PostgreSQL/Docker/MinIO 서술은 낡았다. 실제는 SQLite, Docker 불필요.
- 편집기는 문서상 Tiptap, 실제는 Lexical. (BIT는 문서 편집기가 범위 밖이므로 해당 없음)
- 저장소 구현체 이름은 문서에 `*RepositoryImpl`도 섞여 있지만 실제는 `Jooq*Repository`(package-private).
- FSD 페이지 그룹 이름, ArchitectureTest 그룹 설명이 실제와 다르다.
- 테스트 이름 규칙(`[대상클래스명]Test`)과 달리 실제는 기능 단위(`LeaveApiTest` 등). BIT에서 어느 쪽으로 할지 스킬을 옮길 때 정한다.
- URL 규칙과 달리 단수·키 경로(`/projects/{key}`)가 일부 있다.
- `gitlab-manager` 스킬은 `.claude/skills`에만 있어 원본이 없다. BIT에서는 원본 없는 사본을 두지 않는다.
