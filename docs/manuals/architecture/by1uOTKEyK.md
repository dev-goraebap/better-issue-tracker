# 서비스 명령과 트랜잭션 경계

여러 조회·검사·저장을 하나의 유스케이스로 묶을 때 적용합니다.

## 규칙과 이유

Controller/MCP가 아니라 Service가 쓰기 경계를 소유합니다. 기존 상태와 권한을 현재 트랜잭션에서 확인하고 도메인을 변경해 저장합니다. SQLite 쓰기 중 외부 API·메일·무거운 변환을 기다리지 않습니다. 조회의 readOnly 선언과 실제 DB 격리 의미는 구분합니다.

## BIT 실제 코드

현재 코드 발췌: `server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java` · 105행부터. 주변 선언·호출부는 원본에서 확인합니다.

```java
    public String save(CurrentUser actor, String workspaceId, ManualRequests.Save request, boolean creating) {
        access(actor, workspaceId, request.projectId(), true);
        Manual previous = creating ? null : require(actor, workspaceId, request.id(), true);
        if (creating && manualRepository.existsById(request.id())
                || !creating && (request.expectedVersion() == null || previous.version() != request.expectedVersion()))
            throw ManualErrorCode.MANUAL_VERSION_CONFLICT.raise();
        if (previous != null && !Objects.equals(previous.projectId(), request.projectId()))
            throw ManualErrorCode.MANUAL_INVALID_CONTENT.raise();
        var content = content(actor, workspaceId, request.content(), previous == null ? null : previous.content());
        var available =
```

바로 위 메서드 선언에는 `@Transactional`이 있습니다. 매뉴얼 쓰기는 현재 권한과 기존 책·버전을 읽고 검사합니다. 저장 모델을 부분 수정하면서 이 순서를 진입점마다 복제하지 않습니다.

## 피해야 할 예

아래는 실패 이유를 보여 주는 설명용 반례이며 현재 BIT 구현의 발췌가 아닙니다. 생략된 선언이 있어 그대로 실행하는 완성 코드가 아닙니다.

```java
@Transactional
void saveAndConvert() {
    repository.save(changed);
    remoteConverter.convertLargeFile(); // 긴 외부 작업을 쓰기 안에서 대기
}
```

## 예외와 적용 한계

공간+owner·초대 가입 등 기존의 다중 애그리거트 원자성 예외는 별도 규칙입니다. 이를 모든 기능의 광범위한 트랜잭션 근거로 사용하지 않습니다. 현행 파일 attach/discard가 서비스에서 수행된다는 관찰을 외부 저장소와 DB의 원자성 보증으로 설명하지 않습니다.

## 검증 기준

자동: 해당 유스케이스 통합 테스트와 `check`를 실행합니다. 실패 후 책·버전·첨부 관계가 어떤 상태인지 검사합니다.

수동: 외부 호출과 잠금 지속 구간, 실패 시 DB와 외부 객체의 보정 필요를 추적합니다. 트랜잭션 애노테이션 존재만 검사하는 테스트는 충분하지 않습니다.

## 적용 절차

실제 변경은 [개발 매뉴얼의 작업 절차](../development/eMIBcD18ZX.md)로 이어 갑니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java)
- [.agents/skills/bit-development/references/backend/03-layers.md](../../../.agents/skills/bit-development/references/backend/03-layers.md)
- [server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java](../../../server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java)
