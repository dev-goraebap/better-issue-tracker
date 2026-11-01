# 로컬에서 실행하고 설정 확인하기

개발용 데이터와 운영 데이터를 분리합니다. 일반 개발은 저장소의 실행 진입점을 사용하고, 에이전트의 기능 검증은 [격리 검증](RqGTB7dtd6.md)으로 별도 인스턴스를 띄웁니다.

## 준비

프로젝트 기준은 JDK 21, Node.js 24, npm, Gradle Wrapper입니다. 기본 개발 명령은 POSIX sh를 사용하므로 Windows에서는 Git Bash가 필요합니다. Gradle Wrapper가 있어도 JDK 자체가 준비되어 있어야 합니다.

저장소 루트, Git Bash 등 POSIX 셸:

```sh
npm ci --prefix client
sh dev.sh
```

기본 화면은 `http://localhost:4402`, 서버는 `http://localhost:8080`입니다. Vite가 `/api`와 `/pages`를 서버로 전달합니다. 종료는 실행 터미널에서 Ctrl+C입니다. 서버와 화면을 나눠 띄우려면 각각 `sh dev.sh server`, `sh dev.sh client`를 사용합니다.

Windows PowerShell에서 서버를 직접 실행할 경우 작업 디렉터리는 `server`입니다.

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

이 명령의 셸과 작업 위치를 다른 예와 섞지 않습니다. 기본 포트가 사용 중이면 기존 프로세스를 임의로 종료하지 말고 격리 실행을 사용하거나 서버 포트와 Vite의 `DEV_API_TARGET`을 함께 바꿉니다.

## 사용 가능한 상태 확인

서버 실행 후 `/api/v1/health`가 `UP`이고 화면이 열리는지 확인합니다. 빈 데이터에서는 `/setup`의 첫 관리자 설정이 필요하며, 이미 설정한 데이터에서는 `/login`을 사용합니다. 프로세스가 존재하거나 HTTP 포트만 열렸다고 사용 준비가 끝난 것은 아닙니다.

## 설정과 데이터 위치

| 항목 | 기본값 또는 원본 |
| --- | --- |
| DB | 서버 작업 디렉터리의 `./data/bit.db`, `DB_PATH`로 변경 |
| 로컬 첨부 | `./data/files`, `STORAGE_LOCAL_ROOT`로 변경 |
| 비밀값 | 환경 변수가 우선. 비어 있으면 DB 옆 생성 비밀값 파일을 유지 |
| 선택 설정 | `server/.env.example`, `application.properties`와 `application-dev.properties` 확인 |
| 켜진 기능 | `/api/v1/capabilities` 응답 확인 |

S3 설정이 없으면 로컬 저장소를 사용합니다. SMTP 등 선택 기능의 비활성을 전체 서비스 장애로 처리하지 않습니다. `capabilities.pdf`와 브라우저 인쇄 기반 PDF 저장은 같은 구현 경로가 아닙니다.

## 막힐 때

의존성 오류는 `npm ci`와 JDK/Wrapper 기준을 먼저 확인합니다. 포트 충돌이면 소유자를 확인하고 내 실행만 정리합니다. 로그인/CSRF 문제는 브라우저 주소·dev 프로필·허용 Origin을 대조합니다. 데이터가 필요 없어 보여도 일반 실행에서 DB를 지워 문제를 숨기지 않습니다.

이전 작성 검증에서는 `dev.sh` 내용을 대조하고, 별도 포트·빈 데이터의 검증 실행기로 서버·화면·초기 계정·API 키가 준비되는 경로를 실행했습니다. 운영 데이터와 외부 저장소 자격 증명은 사용하지 않았습니다.

## 관련 아키텍처

[구조와 설계 이유](../architecture/BeNb9Gkzrh.md)를 함께 확인합니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [dev.sh](../../../dev.sh)
- [client/vite.config.ts](../../../client/vite.config.ts)
- [server/src/main/resources/application.properties](../../../server/src/main/resources/application.properties)
- [server/src/main/resources/application-dev.properties](../../../server/src/main/resources/application-dev.properties)
- [server/gradle/wrapper/gradle-wrapper.properties](../../../server/gradle/wrapper/gradle-wrapper.properties)
