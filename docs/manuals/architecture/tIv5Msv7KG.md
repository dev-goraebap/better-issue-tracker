# 모듈·계층·의존성 배치

서버에 클래스를 추가하거나 다른 모듈을 호출할 때 적용합니다. 이름보다 실제 의존 방향이 중요합니다.

## 규칙과 이유

모듈 루트는 공개 Facade/Spi/Event와 계약 타입, 내부는 application·domain·infrastructure에 둡니다. Service는 포트를 주입받고 SQL 구현을 참조하지 않습니다. 생성자 주입을 사용하며 의존성 이름은 타입의 lowerCamelCase를 유지합니다. 구현 클래스가 외부 API가 되는 것을 막기 위해 infrastructure는 package-private입니다.

## BIT 실제 코드

현재 코드 발췌: `server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualRepository.java` · 17행부터. 주변 선언·호출부는 원본에서 확인합니다.

```java
class JooqManualRepository implements ManualRepository {
    private final DSLContext dslContext;
    private final JsonMapper jsonMapper;

```

저장소는 domain의 포트를 구현하고 jOOQ·JSON 변환은 이 구현 안에 둡니다. 매뉴얼 Service가 쓰는 것은 `ManualRepository`입니다. 다른 모듈이 필요하면 그 모듈 루트의 공개 Facade를 사용합니다.

## 피해야 할 예

아래는 실패 이유를 보여 주는 설명용 반례이며 현재 BIT 구현의 발췌가 아닙니다. 생략된 선언이 있어 그대로 실행하는 완성 코드가 아닙니다.

```java
// 다른 모듈 내부 구현에 직접 의존하는 반례
private final ProjectService projectService;
private final JooqManualRepository jooqManualRepository;
```

## 예외와 적용 한계

모든 모듈에 Facade를 기계적으로 추가하지 않습니다. 외부 소비자가 없는 내부 계약은 공개하지 않습니다. shared는 공통 기반이며 업무를 밀어 넣어 순환을 숨기는 장소가 아닙니다.

## 검증 기준

자동: `server`에서 `.\gradlew.bat test --tests "*ArchitectureTest"`는 모듈 순환·내부 접근·domain 기술 의존·application의 jOOQ 사용·공개 infrastructure를 검사합니다.

수동: 클래스의 책임과 공개 계약의 최소 범위, 이름이 역할을 드러내는지는 리뷰합니다. ArchUnit 통과만으로 도메인 경계가 올바르다고 확정하지 않습니다.

## 적용 절차

실제 변경은 [개발 매뉴얼의 작업 절차](../development/YrHTVBFxOY.md)로 이어 갑니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualRepository.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/infrastructure/JooqManualRepository.java)
- [.agents/skills/bit-development/references/backend/02-code-style.md](../../../.agents/skills/bit-development/references/backend/02-code-style.md)
- [server/src/test/java/io/github/goraebap/bit/ArchitectureTest.java](../../../server/src/test/java/io/github/goraebap/bit/ArchitectureTest.java)

## 상세 적용 기준: 백엔드 03. 계층과 처리 흐름


이 문서는 모듈 내부의 계층 구조와 각 계층의 책임, 명령(Command)과 조회(Query)의 처리 흐름, 도메인 모델링 규칙 및 모듈 간 계약(Contract) 인터페이스 설계 표준을 정의한다.

---

## 1. 계층별 책임 및 의존성 규칙

백엔드 모듈은 단방향 의존성 흐름을 따르는 4개 계층으로 분리하여 각 계층의 책임을 엄격히 격리한다.

| 계층 | 역할 및 핵심 책임 | 의존 대상 |
| :--- | :--- | :--- |
| **Controller** | HTTP 요청 유효성 검증, 상태 코드 반환, 응답 DTO 변환 | Service, QueryService |
| **Service** | 유스케이스 오케스트레이션, 비즈니스 흐름 제어, 트랜잭션 경계 관리 | Domain, Repository, Query, 외부 기능 포트 |
| **Domain** | 비즈니스 핵심 규칙 및 불변식(Invariant) 강제, 도메인 상태 변경 | 순수 Java (프레임워크 비의존) |
| **Infrastructure** | Repository 및 Query 포트의 기술 구현(jOOQ 등), 외부 기능 어댑터 | Domain/Application 포트 |

MCP 도구는 Controller와 같은 진입점이다. 도구는 각 모듈의 Facade(곧 Service)를 부르며 REST API나 다른 모듈의 Repository·Query를 직접 부르지 않는다(D-022).

---

## 2. 명령(Command)과 조회(Query) 처리 흐름

데이터의 변경을 다루는 쓰기 경로와 화면 조회를 다루는 읽기 경로는 서로 다른 요구사항과 수명주기를 가지므로 완전히 분리하여 처리한다.

### 1) 명령(Command) 처리 흐름: 단일 진입점과 애그리거트
- **흐름**: `Repository에서 애그리거트 복원 → 도메인 비즈니스 메서드 호출 → Repository.save(aggregate) 필수 호출`
- **단일 진입점 (`save`)**: jOOQ는 JPA와 달리 변경 감지(Dirty Checking) 메커니즘이 없다. 모든 상태 변경은 반드시 `save` 메서드를 명시적으로 호출해야 하며, `save`는 신규 삽입(INSERT)과 수정(UPDATE)의 단일 영속화 진입점으로 작동한다.
- **도메인 원본 유지**: 명령 처리 시 화면용 Query DTO를 도메인 상태 판정의 근거로 사용하지 않는다. 항상 영속성 저장소에서 온전한 애그리거트 원본을 복원하여 비즈니스 규칙을 평가해야 한다.
- **기록 주체**: 만들거나 바꾼 행에는 사람 ID와 함께, API 키로 들어온 요청이면 키의 `agent_name`을 `*_agent` 열에 남긴다(D-021).
- **다형 대상**: `link`·`activity`·`comment`를 만들 때는 대상(`work_item`, `decision`, `session_record`, `document`, `code_ref`)의 존재를 소유 모듈의 Facade로 먼저 확인한다. DB가 FK로 검사하지 않기 때문이다(D-014, D-020).

### 저장소 메서드 이름과 여러 건 처리

저장소(`Repository`) 인터페이스는 Spring Data 같은 ORM의 메서드 어휘를 따른다. 구현이 jOOQ여도 서비스 코드는 ORM을 쓸 때처럼 읽히게 하고, SQL을 몇 번 어떻게 보낼지는 구현이 정한다.

| 용도 | 이름 | 예 |
| :--- | :--- | :--- |
| 식별자로 복원 | `findById`, `findAllById` | `workItemRepository.findById(id)` |
| 행을 잠그고 복원 | `find…ForUpdate` | `findByIdForUpdate(id)` |
| 조건으로 조회 | `find…By…` | `findAllByProjectId(projectId)` |
| 존재·개수 | `exists…By…`, `count…By…` | `existsByNameAndIdNot(name, id)`, `countByProjectId(projectId)` |
| 저장 | `save`, `saveAll` | 신규와 변경을 모두 처리한다 |
| 삭제 | `deleteById`, `delete…By…` | `deleteAllByWorkItemId(workItemId)` |
| 여러 행 일괄 수정 | `update…`, `clear…By…` | `updateOrder(orderedIds)`, `clearAssigneeByUserId(userId)` |
| 명시적 잠금 | `lock…` | `lockTree()` |

감사 기록에 남기는 수정자 ID는 마지막 인자로 받는다. 신규 삽입만을 위한 `add`·`insert` 같은 별도 메서드를 두지 않는다.

한 유스케이스에서 여러 애그리거트를 만들거나 바꿀 때는 다음을 따른다.

- 서비스는 도메인 팩토리와 업무 메서드로 엔티티를 모두 만든 뒤 `saveAll`로 한 번에 넘긴다. 반복문 안에서 `save`나 존재 확인을 부르지 않는다.
- 여러 건의 중복·참조 확인은 `findAllById`, `find…By…In`처럼 한 번에 조회하고, 결과는 메모리에서 입력 항목과 대응시킨다.
- 여러 건 저장은 필요한 경우 saveAll/batch를 사용하되 구현별 SQL 호출 수를 확인한다. 현재 모든 저장소가 고정 왕복 수를 보장한다고 해석하지 않는다.

### 2) 조회(Query) 처리 흐름: jOOQ 직접 투영

다른 모듈의 표시 정보는 Facade 배치 조회로 조립하며, 검색·정렬·건수를 결정하는 값은 해당 화면 쿼리에서 SQL로 읽을 수 있다. [모듈 경계를 넘는 조회](kegByIaS5R.md)의 예시와 적용 조건을 따른다. 내부 패키지 직접 참조 금지와 명령 경로의 Facade 사용 규칙은 유지한다.

- **화면 DTO 직접 프로젝션**: Query 포트는 도메인 애그리거트를 거치지 않고, jOOQ를 통해 DB에서 화면에 필요한 DTO(`Views`)로 직접 투영(Direct Projection)한다.
- **DB 엔진 위임**: 조건 필터링, 정렬, 페이징(커서 `seek`)은 반드시 데이터베이스 엔진 내부에서 처리한다. 도메인의 순수 유효성 검증 함수는 필요 시 재사용할 수 있으나, 전체 데이터를 무조건 애플리케이션 메모리로 퍼 올려서 코드 레벨에서 잘라내는 행위는 엄격히 금지한다.
- **어휘의 분리**: 저장소(`Repository`) 반환값은 비즈니스 맥락을 담은 **도메인 어휘**를 사용하고, 조회(`Query`) 포트 반환값은 사용자 인터페이스 중심의 **화면 어휘**를 사용하여 관심사를 명확히 분리한다.
- **소프트 삭제된 다형 대상**: 링크·활동이 가리키는 대상이 소프트 삭제되었으면 행은 남기고 조회에서 숨긴다(D-014).

---

## 3. 도메인 모델링 표준

### 프레임워크 독립성
- `domain` 패키지는 Spring, HTTP 서블릿, jOOQ 등 외부 프레임워크나 라이브러리에 일체 의존하지 않는 순수 Java 코드로 유지한다.

### 엔티티(Entity) 설계 원칙
- **클래스 정의**: 엔티티는 상태 변경이 가능한 일반 `class`로 정의하며, 필드 변경은 엔티티 내부의 의도가 담긴 업무 메서드를 통해서만 수행한다.
- **생성자 은닉**: 엔티티의 생성자는 외부에서 직접 호출할 수 없도록 `private`으로 숨긴다.
  - **신규 생성 (`create`)**: 도메인 사전 검증을 엄격히 수행하는 정적 팩토리 메서드 `create(...)`를 통해서만 생성한다.
  - **저장소 데이터 재구성 (`fromPersistence`)**: DB에서 조회된 데이터를 복원할 때는 사전 검증이 없는 정적 팩토리 메서드 `fromPersistence(...)`를 사용한다 (`@AllArgsConstructor(staticName = "fromPersistence")` 활용 시 생성자는 `private` 처리). 이 메서드는 `infrastructure` 계층의 매퍼에서만 호출하도록 ArchUnit으로 경계를 제한한다.
- **식별자 동등성**: 엔티티의 동일성 비교는 오직 고유 ID 필드로만 판정한다 (`@EqualsAndHashCode(onlyExplicitlyIncluded = true)` 적용).
- **원자적 상태 전이**: 도메인 업무 메서드는 모든 전달 인자의 유효성을 완전히 검증한 이후에만 필드 상태를 수정한다. 검증 실패로 인해 객체 상태가 반쯤 변경된 채 방치되는 이상 상태를 원천 차단한다.
- **복원 메서드 (`restore`)**: `restore` 같은 복구 메서드는 보관 해제 등 실제 비즈니스 도메인 요구사항에 한해서만 사용한다.

### 값 객체(Value Object) 설계 원칙
- 값 객체와 읽기 전용 모델은 불변 `record`로 선언한다.
- 정적 팩토리 `of(...)`는 외부 입력의 유효성을 검증하며, 기본 정규 생성자는 저장소 데이터 재구성에 사용한다. 이들의 호출 경계 역시 ArchUnit으로 통제하여, 비즈니스 규칙이 강화되더라도 과거 데이터를 영속성 저장소에서 읽어오지 못하는 문제가 발생하지 않도록 방지한다.

---

## 트랜잭션 경계

현재 서비스 명령과 외부 호출 경계는 [트랜잭션 기준](by1uOTKEyK.md)을 따릅니다.

## 5. 모듈 간 계약(Contract) 인터페이스

모듈 간의 상호작용은 호출 대상 모듈의 루트 패키지(`module/<모듈명>/`)에 공개된 계약 인터페이스를 통해서만 이루어진다.

### 계약 참조 원칙
- 외부 모듈은 타 모듈의 루트 계약 인터페이스만 참조할 수 있으며, 내부 패키지(`application`, `domain`, `infrastructure`)의 클래스를 직접 참조할 수 없다.
- 모듈 간의 양방향 직접 호출(순환 참조)은 엄격히 금지한다.

### 계약 인터페이스 접미사 규칙
계약의 상호작용 방향과 역할을 파일명 접미사로 명확히 구분한다.

| 접미사 | 상호작용 방향 | 구현 위치 | 역할 및 예시 |
| :--- | :--- | :--- | :--- |
| **`*Facade`** | 모듈이 기능을 제공하고, 다른 모듈이 호출 | 모듈 루트에 계약, application에 구현 | 다른 모듈과 MCP에 노출하는 서비스 진입점 (예: `WorkItemFacade`) |
| **`*Spi`** | 모듈이 인터페이스를 선언하고 타 모듈이 구현 (전략 패턴) | 인터페이스를 구현하는 외부 모듈 | 선언 모듈의 확장점. 아래 모듈이 위 모듈의 값을 알아야 할 때 순환 없이 끼우는 방법 |
| **`*Event`** | 모듈이 발행하고, 다른 모듈이 비동기/동기 구독 | 불변 `record` | 비즈니스 사건 전파 |
| **접미사 없음** | 계약 간에 주고받는 데이터 및 주체 타입 | 선언 모듈의 루트 패키지 | 데이터 전송 모델 (예: `WorkItemSummary`) |

### 계약 구현 및 모듈 캡슐화 규칙
- **구현 위치 검증**: 계약 인터페이스의 올바른 구현 위치는 ArchUnit 테스트를 통해 지속적으로 검증한다.
- **Facade 구현체**:
  - `application`의 Service 클래스가 직접 인터페이스를 구현하며, 클래스명에 Facade 접미사를 붙이지 않는다 (예: `WorkItemService implements WorkItemFacade`).
  - 기능 단위로 단일 Facade를 두는 것을 기본으로 하며, 처음부터 메서드별로 파편화하지 않는다. 단, 호출 모듈별 사용 메서드가 완전히 분리되거나 서로 다른 애그리거트의 규칙을 복합적으로 떠안게 될 경우에 한해 분할한다.
  - 외부 모듈과 MCP에서 들어오는 호출 역시 Controller와 마찬가지로 application 계층을 통과하게 함으로써, 권한 검사, 동시성 충돌 판정, 수정자·에이전트 기록 등의 공통 업무 규칙을 단일 지점에서 강제한다.
- **역할 분리**: 단일 인터페이스 내에 기능 제공(Facade)과 확장점(Spi)이 혼재하는 경우, 명확히 두 개의 계약으로 분리한다.

---

## 6. 외부 기능 포트와 어댑터 (D-030)

메일, Git 호스팅 API, 파일 저장소, 문서 텍스트 변환, PDF 생성처럼 외부나 무거운 라이브러리에 기대는 기능은 다음을 따른다.

- 기능을 쓰는 쪽(`application`, 공용이면 `shared`)이 인터페이스를 선언하고, `infrastructure`가 기술별 어댑터를 구현한다. 호스팅이나 도구가 늘면 어댑터를 더한다(GitHub → GitLab·Gitea, D-028).
- 설정이 없거나 연결되지 않으면 그 어댑터는 "꺼짐"을 보고하고, 서버는 정상 기동한다. 꺼진 기능을 부르면 `BusinessException`(예: `*_NOT_CONFIGURED`)으로 이유를 돌려준다. MCP 도구도 같은 오류를 받는다.
- 켜진 기능 목록은 서버가 API로 알려 주고 화면은 그 값을 보고 버튼을 숨긴다.
- 파생본(텍스트 변환·PDF)을 만드는 어댑터는 결과에 도구와 버전을 남긴다(`converter` 같은 열). 도구가 바뀌면 다시 만들 수 있게 하기 위해서다.
- 연결 장애·응답 이상은 `IllegalStateException`으로 분류하되, 그 기능 하나의 실패로 끝나게 하고 다른 요청을 막지 않는다.

---

## 7. 테스트 원칙 및 아키텍처 결정 배경

### 도메인 테스트 원칙
- 도메인 계층 단위 테스트는 Spring 프레임워크 컨텍스트 없이 순수 Java 환경에서 즉각적으로 실행되어야 한다.
- 만료일, 상태 변경 시각 등 시간 관련 비즈니스 판정 로직은 시스템 클록에 의존하지 않고 주입 가능한 `Clock` 빈을 통해 결정론적으로 고정하여 검증한다.
- 외부 기능은 설정을 비운 상태(꺼짐)와 켠 상태를 모두 테스트한다. 파일 저장소는 로컬과 S3 호환 어댑터를 모두 검증한다(D-029).

### 인터페이스 접미사 명명 배경 (ADR)
외부 모듈 계약 이름은 현재 모듈 루트의 Facade·Spi·Event와 ArchitectureTest가 확인하는 공개 경계를 따른다. 다음은 명명 대안의 비교이며 별도의 BIT 결정 이력으로 해석하지 않는다.

| 검토 접미사 | 기각 사유 |
| :--- | :--- |
| **`*Api`** | 프로젝트 내에서 HTTP REST 엔드포인트(`/api/...`) 또는 프론트엔드 API 클라이언트(`api/` 폴더)를 지칭하는 표준 어휘로 널리 사용되므로, 자바 인터페이스에 사용할 경우 REST API로 오인될 수 있어 기각했다. |
| **`*Ohs`** | 오픈 호스트 서비스(Open Host Service)는 컨텍스트 전반을 아우르는 전략적 아키텍처 용어이므로, 단일 인터페이스 명칭으로는 너무 포괄적이어서 기각했다. |
| **`*Port`** | 헥사고날 아키텍처에서 application 계층이 선언하는 내부 인바운드/아웃바운드 포트(`*Port`)와 용어가 중복 충돌하므로 기각했다. |
| **`*Extension`** | 확장 지점(SPI)이라기보다는 확장의 '구현체'를 의미하는 어감이 강해 기각했다. |

결과적으로 기능 제공은 **`*Facade`**, 확장점은 Spring Modulith의 표준 관례를 수용하여 **`*Spi`**를 공식 명명 규칙으로 확정했다.


## 8. T-003 경계와 원자성 예외 (D-042~D-043)

- `workspace`는 IAM 루트의 `IamFacade`만 호출한다. IAM→workspace 역참조와 shared→업무 모듈 참조는 금지한다. `CurrentUser.agentName`은 인증 필터가 채우고 업무 서비스가 감사 열에 기록한다.
- 공간+owner 생성, 기존 멤버 간 소유권 이전, 초대 가입의 계정+비밀번호+멤버+초대 소비, 제거/탈퇴/삭제의 선택 포인터 정리는 명시적인 원자성 예외다. 나머지 쓰기의 범용 예외로 확대하지 않는다.
- bcrypt·재인증은 NOT_SUPPORTED 조정 서비스에서 처리하고 쓰기 트랜잭션 안에서 주체·해시·초대·현재 권한을 재검사한다. 소유권 이전은 기존 owner를 먼저 admin으로 바꾼 뒤 새 owner를 저장하고 한 명인지 검사한다.
- WorkspaceFacade의 HTTP 사전 검사는 Security 서블릿 필터 뒤·MVC 본문 해석 전에 실행한다. 일반 권한뿐 아니라 관리 대상의 역할도 확인한다. 실제 쓰기 서비스는 트랜잭션 안에서 다시 확인한다.
