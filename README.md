# BIT

사람과 에이전트의 세션·결정·산출물·업무·코드를 연결하는 경량 ALM입니다.
T-002 인증을 구현했습니다. 첫 관리자 가입, 이메일·비밀번호 로그인, 비밀번호 변경과 API 키 관리를 사용할 수 있습니다. 워크스페이스·업무 기능은 후속 작업입니다.

## 로컬 실행

JDK 21, Node.js 24, npm, POSIX sh(Windows에서는 Git Bash)가 필요합니다. Docker나 `.env` 없이 실행됩니다.

```sh
npm ci --prefix client
sh dev.sh
```

- 화면: `http://localhost:4402`
- 서버: `http://localhost:8080`
- 각각 실행: `sh dev.sh server`, `sh dev.sh client`
- 종료: 실행 터미널에서 Ctrl+C

Vite가 `/api`를 서버로 전달합니다. 서버 포트를 바꾸면 `SERVER_PORT`와 `DEV_API_TARGET`을 함께 지정합니다.

```sh
SERVER_PORT=8081 DEV_API_TARGET=http://localhost:8081 sh dev.sh
```

서버 설정은 `server/.env.example`을 참고합니다. 기본 SQLite DB는 `server/data/bit.db`이며 처음 켤 때 Flyway가 인증 테이블 5개를 만듭니다.
인증 비밀값과 Git 토큰 암호화 키는 DB 옆 `secrets.properties`에 생성·유지됩니다. 환경 변수 `AUTH_SECRET`, `GIT_ENCRYPTION_KEY`가 있으면 그 값을 우선합니다.
DB와 비밀값 파일을 함께 백업하고 저장소에는 넣지 않습니다.

```sh
curl http://localhost:8080/api/v1/health
# {"status":"UP"}
curl http://localhost:8080/api/v1/capabilities
# {"mail":false,"gitIntegration":false,"objectStorage":true,"documentConversion":false,"pdf":false}
```

첫 실행은 `/setup`에서 관리자 계정을 만들고 `/login`에서 로그인합니다. 사용자 행이 하나라도 있으면 초기 가입은 영구히 닫힙니다. 이후 가입은 후속 워크스페이스 초대 기능에서 제공합니다.

비밀번호는 15~64 Unicode 문자, UTF-8 최대 72바이트입니다. 연속 5회 실패하면 15분 잠깁니다. 세션은 유휴 7일·절대 30일이며, 비밀번호 변경은 다른 세션과 모든 API 키를 폐기하고 현재 세션을 교체합니다. 전체 로그아웃은 API 키를 폐기하지 않습니다.

API 키 원문은 발급 직후 한 번만 표시됩니다. 기본 만료는 30일입니다. Bearer로 `/api/v1/me`를 조회할 수 있고, 키·비밀번호·세션·관리자 API는 브라우저 세션만 허용합니다. 업무 권한과 초대는 후속 작업입니다. SMTP·OTP는 아직 제공하지 않습니다. 유일한 관리자의 비밀번호를 잊었을 때의 별도 복구 CLI는 제공하지 않으므로 계정과 백업을 안전하게 보관하세요.

## 검사와 API 계약 갱신

```sh
cd server
./gradlew check
./gradlew exportOpenApi
cd ../client
npm ci
npm run api:generate
npm run check
```

Windows PowerShell에서는 `server/`에서 `.\gradlew.bat check`를 사용합니다.
`check`는 포맷·Checkstyle·SpotBugs·ArchUnit·HTTP 계약·별도 SQLite 파일 통합 테스트를 실행합니다.
클라이언트 검사는 컴포넌트 규칙·FSD·HTTP 테스트·타입·프로덕션 빌드를 포함합니다.
`server/openapi.json`과 생성한 `client/src/shared/api/schema.d.ts`는 함께 갱신합니다.

## 컨테이너

```sh
docker build -t bit:dev .
docker compose -f deploy/dev/compose.yaml up -d
docker compose -f deploy/dev/compose.yaml ps
```

화면과 API는 컨테이너의 8080 포트에서 함께 제공됩니다. DB·비밀값은 `/var/lib/bit` 볼륨에 보관하며 UID 10001로 실행됩니다.
`BIT_PORT`(기본 8080), `BIT_BIND_ADDRESS`(기본 127.0.0.1)로 공개 주소를 선택합니다.
운영용 compose는 `deploy/prod/compose.yaml`이며 `BIT_IMAGE`로 빌드한 이미지 태그를 지정합니다.
운영은 HTTPS와 `AUTH_ALLOWED_ORIGINS`(예: `https://bit.example.com`, 여러 개면 쉼표 구분)를 설정합니다. `AUTH_COOKIE_SECURE`는 기본 true이며 로컬 HTTP 개발 compose만 false입니다. 포트나 호스트를 바꾸면 허용 출처도 일치시켜야 합니다. Origin이 없는 세션 쓰기도 거부하며, 인증된 Bearer 요청은 Origin/CSRF 없이 사용할 수 있습니다.

운영의 Litestream은 기본으로 꺼진 `backup` 프로필입니다. 복제 URL과 접근 키를 환경 변수로 설정한 뒤 켭니다.
DB 연속 복제는 `secrets.properties`와 향후 로컬 첨부파일의 백업을 대신하지 않습니다.

```sh
BIT_IMAGE=bit:dev AUTH_ALLOWED_ORIGINS=https://bit.example.com docker compose -f deploy/prod/compose.yaml up -d
# 복제 설정을 마친 뒤에만:
# docker compose -f deploy/prod/compose.yaml --profile backup up -d
```

검증 결과와 후속 범위는 `docs/tasks/T-001-bootstrap.md`, `docs/tasks/T-002-authentication.md`를 참고합니다.

## 제보와 제안

버그나 개선 제안은 [이슈](https://github.com/dev-goraebap/better-issue-tracker/issues/new/choose)로 올려 주세요. 화면, 서버·API, MCP 도구, `better-issue-tracker` 스킬, 설치·배포 모두 받습니다.

## 라이선스

[MIT](LICENSE)
