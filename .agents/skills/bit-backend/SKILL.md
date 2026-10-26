---
name: bit-backend
description: BIT 서버(server/, Spring Boot·jOOQ·SQLite) 모듈 구조·계층 규칙, MCP·외부 기능 어댑터·다형 대상 처리와 개발·코드 스타일·모듈 간 조회. "서버 기능 추가", "API 구현", "모듈 만들어줘", "MCP 도구 구현", "백엔드 고쳐줘", Java 파일을 만들거나 고칠 때, 서버 설계를 바꿀 때 쓴다.
---

서버는 `io.github.goraebap.bit` 아래 `module/<업무>`와 `shared/{config,domain,error,persistence,storage,text,web}`으로 나눈 모듈형 모놀리스다. 모듈은 단수 소문자로 `module/` 바로 아래에 둔다(iam·workspace·project·issue·decision·session·artifact·coderef·link·file·notification). 모듈 사이 순환 참조는 금지하며 의존 방향은 ArchUnit(`ArchitectureTest`)으로 강제한다. 로그인한 사용자 `CurrentUser`는 모든 모듈이 쓰므로 `shared/web`에 둔다. 모듈은 루트의 공개 계약(`*Facade`, `*Spi`, `*Event`)으로만 서로 부르고, 계층·트랜잭션·저장소 규칙은 [계층과 처리 흐름](references/03-layers.md)을 따른다.

## BIT 고유 규칙

- **MCP 도구는 각 모듈이 등록한다(D-022, D-081)**: `/api/mcp`는 세션 없는 Streamable HTTP이고, 도구는 각 모듈의 application 계층에서 `McpToolProvider`(mcp 모듈의 공개 계약)를 구현해 등록한다. 도구는 자기 모듈의 Service를 부르고 REST API를 다시 부르지 않으며, 다른 모듈 것은 공개 Facade로만 부른다. 권한 판정과 기록 규칙은 Service에 있어야 MCP와 HTTP가 같은 규칙을 탄다. 이슈는 `ORM-14`, 칸·사람·라벨은 이름으로 받는다. 1차 MCP에는 삭제 도구가 없다(보관·해제만).
- **에이전트 표시(D-021)**: API 키로 들어온 요청은 키 주인을 `created_by`/`actor_id`에, 키의 `agent_name`을 같은 행의 `*_agent` 열(`created_by_agent`, `actor_agent`, `author_agent`)에 남긴다. 에이전트용 계정이나 별도 권한 모델을 만들지 않는다.
- **다형 대상은 애플리케이션이 검사한다(D-014, D-020)**: `link`, `activity`, `comment`의 `*_type`/`*_id`에는 DB FK가 없다. 만들 때 대상의 존재와 접근 권한을 소유 모듈의 Facade로 확인한다. 대상이 소프트 삭제되면 링크는 남기고 조회에서 숨긴다. 소속 관계(프로젝트의 이슈 등)는 FK로 두고 Link에 넣지 않는다.
- **외부 기능은 인터페이스 + 어댑터(D-030)**: 메일, Git 호스팅 API, 파일 저장소, 문서 텍스트 변환, PDF 생성은 인터페이스 뒤에 두고 기술 구현은 `infrastructure`(공용 저장소는 `shared/storage`)의 어댑터로 만든다. 설정이 없거나 연결되지 않으면 그 기능만 꺼지고 서버는 뜬다. 서버는 켜진 기능 목록을 API로 알려 주고, 꺼진 기능을 부르면 `*_NOT_CONFIGURED` 같은 업무 오류로 이유를 돌려준다. 파일 저장소는 로컬 어댑터가 기본으로 켜져 있다(D-029).
- **무거운 작업은 트랜잭션 밖(D-028, D-031, D-032)**: 문서 텍스트 변환(POI·PDFBox), Markdown → PDF 생성, Git 호스팅 API에서 md 받기, 웹훅 수신 후 처리는 트랜잭션 안에서 하지 않는다. 트랜잭션은 `artifact_rendition`의 `pending` 행처럼 상태만 기록하고, 작업이 끝나면 별도 트랜잭션에서 `done`/`failed`와 `converter`를 갱신한다.

## 참고 파일

| 작업 | 파일 |
| :--- | :--- |
| 서버를 빌드·실행하거나 검사를 돌릴 때 | [개발 환경](references/01-development.md) |
| 서버 코드를 쓸 때 | [코드 스타일](references/02-code-style.md) |
| 기능을 구현하거나 모듈 계약을 만들 때 | [계층과 처리 흐름](references/03-layers.md) |
| 다른 모듈의 값을 목록·검색에 쓸 때 | [모듈 경계를 넘는 조회](references/04-cross-module-read.md) |

## BIT에서 정할 것

SandboxHr 규칙과 BIT 문서만으로 정해지지 않은 것이다. 정하면 이 목록에서 지우고 해당 참고 파일에 규칙으로 옮긴다(설계 판단이면 `docs/decisions.md`에도).

- 다형 대상 존재 검사의 의존 방향: link가 각 모듈 Facade를 부를지, link가 `*Spi`를 선언하고 각 모듈이 구현할지(맥락 묶음 때문에 issue → link 참조가 생겨 순환이 생길 수 있다)
- `activity`·`comment`를 소유할 모듈(link 모듈에 함께 둘지, 각각 둘지)
- 트랜잭션 밖 작업을 띄우는 방식(커밋 후 이벤트, 스케줄러가 `pending` 행을 집기, 별도 실행기)과 실패 재시도
- `record_session`(세션 + 결정 n개 + 링크)을 한 트랜잭션으로 묶는 다중 애그리거트 예외로 인정할지
- 외부 기능 설정값이 형식부터 잘못된 경우: SandboxHr처럼 기동을 멈출지, D-030대로 그 기능만 끌지
- 화면 실시간 신호(SandboxHr `RealtimeFacade.signal`)에 해당하는 모듈을 둘지

## 완료 기준

- `server`에서 `./gradlew check`(Windows는 `./gradlew.bat check`)가 통과한다(Spotless·Checkstyle·SpotBugs·ArchUnit·단위·통합 테스트)
- HTTP 계약이 바뀌었으면 `./gradlew exportOpenApi`로 만든 `server/openapi.json`과 `client/src/shared/api/schema.d.ts`가 같은 커밋에 있다
- 이미 있던 `V*__*.sql` 마이그레이션 파일을 고치지 않았다(`git diff --stat`에 새 파일만 있다)
- 외부 기능을 건드렸으면 그 설정을 비운 채로 서버가 뜨고, 그 기능을 부르면 업무 오류가 난다

결과가 틀리면 `skill-repair`로 이 스킬을 고친다.
