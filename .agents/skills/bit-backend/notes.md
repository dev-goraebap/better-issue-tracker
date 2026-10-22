# bit-backend 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-22 · 이관
- 증상: BIT 서버 규칙이 SandboxHr `hohr-backend`에만 있었다
- 수정: `hohr-backend`를 옮겼다. 패키지는 `io.github.goraebap.bit`, office·projects 그룹과 HR 모듈·결재 SPI·`LEAVE_*` 예시·Redmine을 뺐고, 예시를 workitem·decision·link·iam으로 바꿨다. D-014·D-020·D-021·D-022·D-028·D-030~D-032에서 나온 규칙을 SKILL.md "BIT 고유 규칙"에 더했다. 문서와 코드가 어긋난 곳(conventions.md 10절)은 실제 코드 기준으로 적었다: 구현체 `Jooq*Repository`/`Jooq*Query`(package-private), 통합 테스트는 기능 단위 이름, 하위 패키지 분할 시점은 강제하지 않음
- 확인: SandboxHr `server/src`의 `ErrorCode.raise()`, `NotificationErrorCode`, notification·user 모듈 패키지 구조, `build.gradle`의 `test`/`integrationTest`/`exportOpenApi` 태스크와 대조했다. 정해지지 않은 것은 SKILL.md "BIT에서 정할 것"에 남겼다
