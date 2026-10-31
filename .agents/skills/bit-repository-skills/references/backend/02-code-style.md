---
title: 백엔드 02. 코드 스타일
description: 서버 모듈의 명명, 패키지·클래스 배치, 예외 처리와 테스트 작성 규칙. 서버 코드를 쓸 때 읽는다.
---

이 문서는 백엔드 모듈의 명명 규칙, 패키지 및 클래스 배치, 구현 세부 지침, 예외 처리와 테스트 작성 표준을 정의한다. SandboxHr 문서와 실제 코드가 어긋난 곳은 실제 코드를 기준으로 적었다.

---

## 1. 명명 규칙 및 패키지 구조

### 모듈 및 계층 명명
- 모듈 이름은 **단수형 소문자**를 사용한다 (예: `workitem`, `decision`, `document`, `link`, `coderef`, `iam`).
- 모듈 루트에는 공개 계약(`*Facade`, `*Spi`, `*Event`, 접미사 없는 데이터 타입)만 둔다.
- 모듈 내부 계층은 `application`, `domain`, `infrastructure` 3개 계층으로 분리한다.

### 컴포넌트 역할별 접미사
역할과 책임을 클래스 이름의 접미사로 명확히 드러낸다.

| 역할 | 명명 규칙 | 위치 | 설명 및 예시 |
| :--- | :--- | :--- | :--- |
| **API 진입점** | `*Controller` | `application` | HTTP 요청 검증 및 응답 변환 |
| **유스케이스** | `*Service` | `application` | 비즈니스 흐름 제어 및 트랜잭션 관리. Facade를 직접 구현 (`WorkItemService implements WorkItemFacade`) |
| **조회 전용 서비스** | `*QueryService` | `application` | 화면 조회를 전담하는 서비스 |
| **조회 포트** | `*Query` | `application` | 화면 투영 전용 인터페이스 (예: `WorkItemQuery`) |
| **도메인 저장소 포트** | `*Repository` | `domain` | 애그리거트 영속화 인터페이스 (예: `WorkItemRepository`) |
| **저장소·조회 구현체** | `Jooq*Repository`, `Jooq*Query` | `infrastructure` | 기술 접두사를 붙인 구현체 (예: `JooqWorkItemRepository`). `*RepositoryImpl`, `QueryRepository` 혼합 명칭은 쓰지 않는다 |
| **외부 기능 포트·어댑터** | 역할 이름 인터페이스 / `[기술접두사]*` 구현 | `application` / `infrastructure` | 예: 변환 인터페이스와 `Poi…` 어댑터. 여러 모듈이 쓰는 저장소는 `shared/storage`의 `ObjectStorage` |
| **요청/응답 DTO** | `*Requests`, `*Views` | `application` | 불변 `record`로 선언하며 final 묶음 클래스 내 중첩 |
| **오류 코드** | `*ErrorCode` | `application` | `ErrorCode`를 구현한 열거형. 값은 `<MODULE>_<REASON>` (예: `WORKITEM_NOT_FOUND`) |

### 메서드 및 변수 명명 규칙
- **조회 메서드**:
  - `find*`: 대상이 존재하지 않을 수 있어 `Optional`을 반환하는 경우에 사용한다.
  - `get*`: 대상이 반드시 존재해야 하며, 부재 시 예외를 던지는 경우에 사용한다.
- **접근자 메서드**: `get` 접두사를 생략한 fluent 형식(`title()`, `status()`)을 기본으로 사용한다(`lombok.accessors.fluent=true`).
- **의존성 주입 명명**:
  - 주입받는 필드, 생성자 매개변수, `@Bean` 메서드 파라미터는 선언 타입명을 그대로 **lowerCamelCase**로 작성한다.
    - 예시: `WorkItemRepository workItemRepository`, `DecisionQuery decisionQuery`, `LinkService linkService`, `DSLContext dslContext`
    - 금지: `Repository`, `Service`, `Query` 접미사를 생략하거나 `items`, `links`, `sessions` 등 복수형 변수명으로 대체하지 않는다.
  - 동일한 타입의 의존성이 여러 개인 경우 명확한 역할 접두사를 추가하여 구분한다.
  - 지연 주입 래퍼(`ObjectProvider<T>`)는 대상 타입과 래퍼 역할을 함께 명시한다 (예: `ObjectProvider<JavaMailSender> javaMailSenderProvider`).
- **설정값 주입**: `@Value`로 주입받는 설정 변수는 `from`, `displayName`처럼 설정의 비즈니스 의미를 나타내는 이름을 부여한다.

### 패키지 배치 및 분할 원칙
- **초기 상태**: 모든 컴포넌트는 해당 계층의 루트 패키지에 평평하게 배치한다.
- **분할**: 계층이 커지면 `domain`은 애그리거트별, `application`은 외부 API 리소스별 하위 패키지로 나눌 수 있다. 나누는 시점은 건수로 강제하지 않는다(SandboxHr 실제 코드도 모듈마다 다르다).
- **`infrastructure`**: 업무 피처별로 분할하지 않고 평평하게 둔다.
- **공용 코드 위치**: 특정 계층 내부에서 공유되는 파일은 해당 계층의 루트에 둔다. 계층 내부에 임의로 `common`이나 `application/shared` 같은 불분명한 공용 패키지를 생성하지 않는다.

---

## 2. 구현 및 코딩 원칙

### 클래스 구성 및 의존성 주입
- **Service 작성 순서**:
  ```
  상수 → 의존성 필드 → 생성자 → 조회 메서드 → 명령 메서드 → private 보조 메서드
  ```
- **생성자 주입**: 필드 주입을 금지하고 반드시 생성자 주입을 사용한다.
- **QueryService 분리**: 한 Service 내에서 조회 전용 포트 의존성이 2개 이상 필요해지면 책임을 분리하여 별도의 `*QueryService`로 추출하는 것을 검토한다.
- **값 객체(Value Object)**: 유효성 검증이나 데이터 정규화 로직이 반드시 필요한 값에 한해서만 값 객체(`record`)를 도입한다 (예: 프로젝트 키 — 대문자·숫자 2~10자).

### 코딩 표준 및 금지 사항
- **Lombok `@Setter` 사용 금지**: 도메인 객체의 캡슐화를 위해 `@Setter`를 절대 사용하지 않는다. 도메인 상태 변경은 반드시 의도가 드러난 비즈니스 메서드를 통해서만 수행한다.
- **정적 검사 준수**: 와일드카드 import(`import foo.*`), 미사용 import를 금지한다.
- **안전한 예외 처리**: 빈 catch 블록이나 최상위 `Exception`을 포괄하여 삼키는(catch-all) 패턴을 엄격히 금지한다.
- **유효성 검증 연계**: DTO의 유효성 검증 제약 조건(애노테이션 값 등)은 도메인 값 객체의 상수를 참조하여 일관성을 유지한다.
- **시간 제어**: 현재 시각은 시스템 정적 호출(`Instant.now()`)을 지양하고, 테스트 시점 제어가 가능하도록 주입받은 `Clock` 빈에서 생성하여 전달한다.

### 영속성 계층 격리
- **기술 격리**: SQL 문자열 및 jOOQ 전용 타입(`DSLContext`, `Record`, `TableField` 등)은 반드시 `infrastructure` 계층 내부에서만 존재해야 한다.
- **가시성 제어**: 저장소·조회 구현체(`Jooq*Repository`, `Jooq*Query`)와 외부 어댑터는 package-private으로 선언하여 외부 계층의 직접 접근을 차단한다.
- **매핑 책임**: DB 레코드와 도메인/DTO 간의 변환은 구현체 내부의 private 매핑 메서드가 전담한다. 별도의 독립 `Mapper` 패키지를 난립시키지 않는다.
- **마이그레이션 불변성**: 공유 환경(테스트/운영)에 이미 적용된 Flyway SQL 스크립트는 절대 임의로 수정하지 않는다. 첫 배포 이전 수정이 필요한 경우 [로컬 DB와 마이그레이션](../../playbooks/database.md)을 준수한다.

---

## 3. 예외 분류, 로깅 및 테스트 표준

### 예외 분류 체계
예외의 성격과 발생 원인에 따라 세 가지 표준 예외로 명확히 구분하여 처리한다.

| 예외 클래스 | 발생 상황 | 로깅 및 처리 기준 |
| :--- | :--- | :--- |
| **`BusinessException`** | 사용자의 입력 오류, 권한 부족, 대상 없음, 꺼진 기능 호출 등 정상적인 업무 실패. `WorkItemErrorCode.WORKITEM_NOT_FOUND.raise()`처럼 오류 코드에서 만든다 | 정상적인 업무 거절이므로 `ERROR` 로그를 남기지 않음 (`INFO` 또는 `WARN` 기록) |
| **`DomainRuleViolation`** | 도메인 엔티티 내부의 불변식(Invariant)이 깨진 경우 | 도메인 무결성 위반으로 간주하여 추적 |
| **`IllegalStateException`** | 데이터 불일치, 외부 연동 장애, 시스템 설정 오류 등 내부 상태 이상 | 시스템 오류로 간주하여 상세 원인 추적 및 `ERROR` 로깅 |

### 로깅 및 보안 표준
- 로그 출력 및 외부 API 응답 본문에 보안 토큰(API 키, Git 읽기 토큰, 웹훅 비밀값), 개인정보(PII), 원시 SQL 쿼리, 상세 스택 트레이스가 그대로 노출되지 않도록 마스킹 및 필터링을 필수 적용한다.

### 테스트 작성 및 품질 관리
- **테스트 명명과 위치** (SandboxHr 실제 코드 기준):
  - 통합 테스트는 테스트 루트 패키지에 기능 단위 이름 `[기능]Test`로 두고 `@Tag("integration")`을 붙인다 (예: `WorkItemApiTest`, `ArchitectureTest`는 태그 없음).
  - 단위 테스트는 대상 클래스와 같은 패키지에 `[대상클래스명]Test`로 둔다 (예: `module/workitem/domain/WorkItemTest`).
- **수용 조건 검증**: 비즈니스 수용 조건(Acceptance Criteria) ID는 개별 단위 테스트가 아닌 실제 HTTP 통합 테스트 및 E2E 종단 검증에 연결한다. 단순 단위 테스트 통과만으로 전체 수용 조건을 충족한 것으로 표기하지 않는다.
- **결함 수정 절차**: 버그나 결함을 수정할 때는 먼저 실패하는 재현 테스트 코드를 작성하여 커밋한 후 수정을 진행한다.
- **품질 검사 준수**: 정적 검사 경고나 결함 탐지를 억제(`@SuppressWarnings` 등)해야 하는 경우 반드시 합당한 사유를 주석으로 기록한다. 표준 지침 개정 없이 임의로 검사 규칙을 완화해서는 안 된다.
