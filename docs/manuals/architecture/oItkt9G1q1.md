# 제품·구현·검증 용어

같은 단어를 메뉴·DB·개발 절차에서 다른 뜻으로 쓰지 않도록 정리합니다.

| 용어 | BIT에서의 의미 | 혼동하지 않을 것 |
| --- | --- | --- |
| 워크스페이스 | 역할·멤버·공통 자료와 프로젝트의 범위 | 인스턴스 전체 관리자 |
| 프로젝트 | 공간 안의 목표별 업무 범위 | 참여자만 읽는 별도 ACL |
| 이슈/업무 | 상태·유형·관계를 가진 해야 할 일 | Git 공급자 이슈와 항상 동일한 객체 |
| 스케줄 | workitem event의 시각·참석자·반복 | 별도 schedule 모듈 |
| 매뉴얼 | 섹션·페이지·의견을 담는 책 | 리소스 폴더·HTML 페이지 |
| 리소스 | 문서·폴더·HTML 등 참고 자료 | 모든 개발 규칙의 정본 |
| 내부 ID | 코드/API가 사용하는 식별자 | BIT-148 같은 사람이 읽는 참조 |
| Facade | 다른 모듈에 공개한 계약 | HTTP Controller |
| Repository | 애그리거트 영속화 포트 | 모든 목록에 사용하는 투영 쿼리 |
| version | 오래된 쓰기를 거절하는 대상의 버전 | 앱 릴리스 버전 |
| capability | 서버가 알려 주는 기능 활성 정보 | 미구현 기능의 존재 보장 |
| doctor | 격리 실행의 준비 상태 점검 | 기능 전체의 검증 |
| 증거 | 사용 경로의 조작과 결과 기록 | 검사 통과만으로 추정한 운영 성공 |

제품 사용 흐름은 사용자 매뉴얼, 구조 판단은 이 책, 작업 수행 절차는 [개발 매뉴얼](../development/zAhysBXYMY.md)에서 확인합니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/domain/Manual.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/domain/Manual.java)
- [server/src/main/java/io/github/goraebap/bit/module/workitem/application/WorkItemRequests.java](../../../server/src/main/java/io/github/goraebap/bit/module/workitem/application/WorkItemRequests.java)
- [.agents/skills/bit-development/playbooks/verify.md](../../../.agents/skills/bit-development/playbooks/verify.md)
