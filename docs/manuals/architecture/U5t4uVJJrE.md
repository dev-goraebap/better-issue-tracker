# 도메인 변경·명명·시간 처리

도메인 객체의 상태나 불변식을 바꾸는 코드를 작성할 때 적용합니다.

## 규칙과 이유

도메인에는 의도를 가진 변경 메서드를 둡니다. 공개 Setter로 상태를 임의 변경하지 않습니다. 유효성 검사는 필요한 경계에 두고, 시간은 Service의 주입 Clock에서 전달하여 테스트 가능한 입력으로 취급합니다. DTO는 Requests/Views의 불변 record를 사용하고 영속성 레코드를 그대로 반환하지 않습니다.

## BIT 실제 코드

현재 코드 발췌: `server/src/main/java/io/github/goraebap/bit/module/manual/domain/Manual.java` · 86행부터. 주변 선언·호출부는 원본에서 확인합니다.

```java
        String nextTitle = ManualContent.text(title, 120);
        String nextIcon = ManualContent.text(icon, 120);
        if (description == null || description.length() > 400 || color == null || !color.matches("#[0-9a-fA-F]{6}"))
            throw new IllegalArgumentException("Invalid manual settings");
        Objects.requireNonNull(content);
        this.title = nextTitle;
        this.description = description;
        this.icon = nextIcon;
        this.color = color;
        this.content = content;
        this.audit = audit.touch(actor, agent, now);
        version++;
    }

```

`revise`는 이름·설정·본문을 검사한 뒤 상태와 감사·version을 함께 바꿉니다. Manual의 필드마다 Setter를 호출하는 방식보다 한 번의 변경 의미가 분명합니다. 이 예의 IllegalArgumentException 처리를 모든 도메인의 기본 예외로 복사하지 말고 해당 진입점의 변환 계약을 확인합니다.

## 피해야 할 예

아래는 실패 이유를 보여 주는 설명용 반례이며 현재 BIT 구현의 발췌가 아닙니다. 생략된 선언이 있어 그대로 실행하는 완성 코드가 아닙니다.

```java
// 검증·감사·version을 우회하는 반례
manual.setTitle(request.title());
manual.setVersion(manual.version() + 1);
Instant changedAt = Instant.now();
```

## 예외와 적용 한계

값 객체는 검증/정규화가 필요한 값에 도입합니다. 문자열마다 포장 클래스를 만들지 않습니다. 외부 요청 변환용 record와 domain 객체의 역할을 구분합니다. 도메인이 DB를 직접 읽어야 하는 규칙은 Service가 필요한 사실을 준비해 전달하도록 검토합니다.

## 검증 기준

자동: ArchitectureTest는 domain의 Spring/jOOQ/application 의존을 거절하고 Spotless/Checkstyle는 포맷·명명 일부를 검사합니다.

수동/시나리오: 최소·최대·누락 입력, 상태 변경 시 audit/version, 고정 시간에서의 결과를 확인합니다. Clock 사용과 도메인 의미 전체는 정적 검사만으로 보장되지 않습니다.

## 적용 절차

실제 변경은 [개발 매뉴얼의 작업 절차](../development/oSyVeWhOlE.md)로 이어 갑니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/domain/Manual.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/domain/Manual.java)
- [.agents/skills/bit-development/references/backend/02-code-style.md](../../../.agents/skills/bit-development/references/backend/02-code-style.md)
- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualRequests.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualRequests.java)
