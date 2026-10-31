---
title: 백엔드 01. 개발 환경
description: 서버 기술 스택 버전, 로컬 실행, 외부 기능 설정, 빌드·검증 파이프라인. 서버를 빌드하거나 검사를 실행할 때 읽는다.
---

이 문서는 백엔드 애플리케이션의 개발 환경 구성, 기술 스택 버전 기준, 로컬 실행 및 빌드·검증 파이프라인에 관한 표준 지침을 정의한다. 버전은 SandboxHr 기준이며 저장소를 초기화할 때 고정한다.

---

## 1. 기술 스택 및 버전 기준

컴파일 및 런타임 환경의 일관성을 유지하기 위해 도구 체인과 핵심 라이브러리 버전을 프로젝트 레벨에서 엄격히 관리한다.

| 분류 | 기술 / 라이브러리 | 기준 버전 | 관리 방식 및 비고 |
| :--- | :--- | :--- | :--- |
| **Language** | Java | 21 이상 | Gradle Toolchain 및 데몬 JVM 동시 관리 |
| **Build Tool** | Gradle | 9.5.1 | Gradle Wrapper 사용 필수 |
| **Framework** | Spring Boot | 4.1.1 | `build.gradle`에서 버전 고정 (webmvc, security, validation, flyway, jooq) |
| **Database** | SQLite (`org.xerial:sqlite-jdbc`) | Spring Boot 관리 버전 | 파일 하나. WAL, `synchronous=NORMAL`, `busy_timeout=5000`, 외래 키 켜기, 모든 트랜잭션 `BEGIN IMMEDIATE`(`application.properties`의 Hikari 연결 속성) |
| **Database Access** | jOOQ | 3.21.6 | Flyway SQL 파싱 기반 소스 생성(`DDLDatabase`), 실행 방언 `SQLITE` |
| **API Docs** | springdoc | 3.1.1 | Spring Boot 4 호환 계열([호환 기준](https://springdoc.org/faq.html)) |
| **Migration** | Flyway | Spring Boot 관리 버전 | 마이그레이션 스크립트 기반 관리 |
| **Object Storage** | AWS SDK for Java (S3) | 2.46.7 | S3 호환 어댑터 하나로 AWS S3·R2·MinIO(D-029). 기본은 `LocalObjectStorage`(데이터 볼륨) |
| **문서 텍스트 변환** | Apache POI (poi-ooxml), PDFBox | POI 5.4.1, PDFBox는 초기화 때 고정 | docx·xlsx·pptx·PDF → Markdown(D-031) |
| **PDF 생성** | CommonMark 계열 + openhtmltopdf 계열 | 초기화 때 고정 | Markdown → HTML → PDF, 한글 글꼴 임베드(D-032) |

- **도메인 범위**: 공유 오류 처리, `traceId`, 시스템 `Clock`, 모듈 간 의존성 검사를 공통 기반으로 둔다. MCP 서버는 이 서버 안의 `/api/mcp`(Streamable HTTP)이며 별도 패키지를 두지 않는다(D-022). 에이전트는 사람의 개인 API 키(Bearer)로 MCP와 REST를 쓴다(D-021, [인증과 권한](../api/03-authentication.md)).

---

## 2. 로컬 실행 및 외부 기능 설정

### 로컬 실행
- 로컬 실행에는 Java 21과 Node.js만 필요하다. Docker와 `.env`는 필요 없다. 기여자가 받은 그대로 `sh dev.sh`로 띄울 수 있어야 한다.
- DB 파일과 로컬 파일 저장소 폴더는 `server/data/` 아래(`bit` 계열 이름)에 두며 Git에서 제외한다. 배포 시에는 데이터 볼륨 하나에 둘 다 둔다.
- 세션 서명 키와 Git 읽기 토큰 암호화 키 같은 비밀값은 비어 있으면 처음 켤 때 서버가 만들어 DB 옆 파일에 둔다(SandboxHr `GeneratedSecrets` 방식). 환경 변수로 준 값이 늘 우선한다.
- 기본값을 바꿀 때만 `.env`를 둔다. 항목은 `.env.example`이 보이며 `.env`는 Git에서 추적하지 않는다.

### 외부 기능 설정 (D-030)
- 외부 서비스 자격 증명(SMTP, S3 호환 저장소 키 등)은 환경 변수로만 받는다. Git 저장소 읽기 토큰은 저장소를 연결할 때 받아 DB에 암호화해 둔다(D-028).
- 설정이 없거나 연결되지 않으면 그 기능만 끄고 서버는 정상 기동한다. 예: SMTP가 없으면 이메일 OTP와 비밀번호 재설정 메일이 꺼지고 이메일 + 비밀번호 로그인만 남는다(D-027).
- 파일 저장소는 S3 설정이 없으면 로컬 어댑터로 켜진다(D-029). 문서 변환·PDF 어댑터는 서버 안 라이브러리라 기본으로 켜진다.
- 세션 유효 시간 등 보안에 민감하지 않은 일반 운영 정책에 한해서만 안전한 기본값 설정을 허용한다.

---

## 3. 데이터베이스 환경 및 jOOQ 소스 생성

### 데이터베이스 일관성 및 격리
- 개발, 테스트, 운영 데이터베이스의 메이저 버전을 반드시 일치시킨다.
- 개발 DB 재생성 작업은 기존 데이터 폐기를 수반하므로 일반 애플리케이션 기동 절차와 엄격히 분리한다.
- 테스트 환경은 개발용 데이터베이스 파일을 절대 공유하거나 재사용하지 않는다.

### jOOQ 소스 생성 및 검증
- Flyway SQL 마이그레이션 파일을 파싱하여, 실행 중인 DB 인스턴스 없이도 `build` 디렉터리 하위에 jOOQ 소스 코드를 생성한다(`jooqCodegen`).
- SQL 파싱 성공이 실제 SQLite 런타임의 성공을 보장하지는 않으므로, 통합 테스트가 실제 SQLite 파일에 마이그레이션을 적용해 검증한다.

---

## 4. 정적 분석 및 품질 검증 도구

코드 품질과 아키텍처 규칙을 강제하기 위해 Gradle 빌드 수명주기에 정적 검사 도구를 통합한다.

| 도구 | Gradle 태스크 | 검증 역할 및 규칙 |
| :--- | :--- | :--- |
| **Spotless** | `spotlessCheck` | `palantirJavaFormat`을 적용하여 코드 포맷 일관성 강제 |
| **Checkstyle** | `checkstyleMain` | 명명 규칙, 불필요한 import, 금지된 코딩 패턴 검사(경고 0) |
| **SpotBugs** | `spotbugsMain` | 잠재적 런타임 결함 및 버그 취약점 탐지 |
| **ArchUnit** | `test` 태스크 내 포함 | 계층 간 접근 제어, 패키지 의존성 및 모듈 간 호출 규칙 검사 |

- **생성 코드 제외**: jOOQ 등 빌드 시점에 자동 생성되는 소스 코드는 모든 정적 검사 대상에서 제외한다.

---

## 5. 빌드 파이프라인 및 테스트 전략

### Gradle 검사 파이프라인 흐름
빌드 파이프라인은 다음 순서로 순차 실행된다.
```
jooqCodegen → compileJava → spotlessCheck → checkstyleMain → spotbugsMain → test
```

### 테스트 태스크 구분
- **`test`**: `@Tag("integration")`이 없는 테스트. 단위 테스트, ArchUnit 아키텍처 검증, DB 연결이 없는 순수 HTTP 계약 테스트를 신속하게 수행한다.
- **`integrationTest`**: `@Tag("integration")` 테스트. 테스트 컨텍스트마다 `build/test-db/` 아래의 새 SQLite 파일로 데이터 영속성과 전체 흐름을 통합 검증한다. 테스트 사이는 `TestDatabase.clear`가 모든 테이블을 비운다. 파일은 `build/test-files/` 아래 로컬 폴더 저장소에 둔다.
- **`check`**: `test`와 `integrationTest`를 모두 포함하여 전체 품질을 검증한다. CI(GitHub Actions, D-026)도 이 태스크를 돌린다.
- **Docker**: 서버 검사는 Docker 없이 전부 돈다.

### OpenAPI 계약 동기화
- **계약 내보내기**: `exportOpenApi` 태스크는 조회 포트를 대체한 Spring HTTP 컨텍스트를 기동하여 최신 `openapi.json` 스펙을 별도 생성한다. 일반 테스트 실행 시에는 계약 파일을 임의로 수정하지 않는다.
- **동기화 원칙**: 백엔드 OpenAPI 스펙 변경 시 스냅샷, 클라이언트 자동 생성 타입, API 클라이언트를 동일 커밋에서 함께 갱신해야 한다.

---

## 6. 개발 실행 절차 및 전제 조건

- 상세 실행 명령어와 단계별 가이드는 프로젝트 루트의 README를 따른다.
- 개발 환경에는 JDK 21이 사전에 설치되어 있어야 한다. Gradle 데몬의 JVM 버전 선언만으로 JDK 자동 다운로드가 항상 보장되지는 않으므로 로컬 JDK 설치 상태를 먼저 확인한다.
