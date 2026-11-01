# 도메인 상태 변경 추가하기

엔티티의 새 행동이나 불변식을 추가하고 이를 호출하는 유스케이스를 연결합니다.

## 시작 전 확인

바꾸려는 상태와 기존 상태 전이·감사·버전·시간 입력을 확인합니다. 입력 DTO의 검증과 도메인 규칙을 비교합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — 도메인 변경·명명·시간 처리](../architecture/U5t4uVJJrE.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 실제 Manual.revise 예에서 상태 변경의 책임을 확인합니다.
2. 필요한 도메인 행동과 유효/무효 입력을 정하고 변경합니다.
3. Service에서 필요한 사실·주체·시간을 준비해 호출하도록 연결합니다.
4. 정상 변경, 경계 입력, 허용되지 않은 상태와 고정 시간 결과를 검사합니다.
5. 해당 서비스의 통합 흐름과 모듈 경계 검사를 확인합니다.

## 완료 확인

의도한 상태가 저장 후 다시 읽히고 audit/version·시간이 설명한 대로 유지되는지 확인합니다. 실제 실행한 테스트 이름과 결과를 업무에 남깁니다.

## 막히면

현재 구현과 정해진 규칙이 다르면 기존 패턴을 새 규칙처럼 복사하지 않습니다. 변경 목적에 필요한 범위를 구분하고 원본 지침·결정과 대조합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/domain/Manual.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/domain/Manual.java)
- [.agents/skills/bit-development/references/backend/02-code-style.md](../../../.agents/skills/bit-development/references/backend/02-code-style.md)
- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualRequests.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualRequests.java)
