# 기술·운영·작업 제약

이 페이지는 설계를 선택할 때 바꿀 수 없는 조건과 현재 운영 가정을 구분합니다. 이전 로컬 실행 안내는 [개발 환경 준비](../development/ujTBLAqlgj.md)로 이동했습니다.

| 제약 | 근거 | 설계에 미치는 영향 |
| --- | --- | --- |
| Git은 참조하며 호스팅하지 않음 | 프로젝트 핵심 원칙 | Git 연동은 외부 공급자 어댑터와 웹훅 |
| 에이전트도 사람의 권한으로 접근 | CurrentUser·개인 API 키 | MCP 전용 무제한 관리 권한을 만들지 않음 |
| React·Astryx / Spring Boot·SQLite | 패키지·빌드 설정 | 기존 UI 부품·토큰과 SQL/트랜잭션 계약 재사용 |
| 선택 기능 없이 기본 앱 실행 | capabilities·어댑터 계약 | 설정 부재와 서비스 전체 장애를 구분 |
| 적용된 마이그레이션 불변 | Flyway 이력 | 수정은 다음 마이그레이션으로 전진 |

## 현재 운영 가정

앱은 단일 컨테이너 인스턴스와 영속 볼륨을 기준으로 운영합니다. SQLite를 공유하는 다중 쓰기 복제 구조를 제공한다고 해석하지 않습니다. 로컬 개발에는 JDK 21과 Node.js가 필요하고 CI Node 기준은 workflow에서 확인합니다. Gradle Wrapper·npm lockfile을 따라야 같은 계약으로 검사할 수 있습니다.

## 예산·성능에 대한 미확정 부분

최대 동시 사용자 수·처리량·응답 시간의 수치 목표를 이번 문서에서 새로 정하지 않습니다. [품질 요구사항](wSwn4EnNhp.md)은 현재 검사와 확인 가능한 시나리오를 연결하며 성능 보증은 별도 측정이 필요합니다. 운영 비밀값은 예시나 문서에 넣지 않습니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/build.gradle](../../../server/build.gradle)
- [client/package.json](../../../client/package.json)
- [.github/workflows/verify.yml](../../../.github/workflows/verify.yml)
- 현재 지침 원본: `AGENTS.md`
