# 현재 한계와 변경 시 점검할 위험

구조의 한계를 숨기지 않고 변경 시 영향을 판단할 수 있게 정리합니다. 아래 항목은 모두 이번에 고친 결함이라는 뜻이 아닙니다.

| 위험/한계 | 영향 | 현재 대응과 추가 판단 |
| --- | --- | --- |
| SQLite 단일 쓰기와 긴 트랜잭션 | 쓰기 경합·대기 증가 | 외부 작업 분리·짧은 쓰기, 부하 수치 측정 별도 |
| 책 전체 JSON과 책 단위 버전 | 큰 책 전송·독립 페이지 충돌 | 목록 요약·MCP 페이지 응답, 페이지별 저장은 별도 설계 |
| 본문 검색·목차 전용·변경분 MCP 없음 | 처음 읽을 ID 탐색 비용 | 진입 페이지와 확인한 ID로 선택 읽기 |
| 과거 문서와 현재 코드 차이 | 오래된 메뉴·실행 절차 적용 | 페이지별 기준·원본 대조, 옛 자료 보존 |
| UI 자동 검사 한계 | 여백·잘림·스크롤·대비 누락 | 대표 폭과 긴 데이터의 실제 화면 검사 |
| 개발 절차와 배포본 혼동 | 없는 기능을 운영 안내 | 사용자·개발 문서의 기준 리비전 구분 |

성능·큰 책 편집·실제 보조기기 결과처럼 이번 문서 작업에서 새로 측정하지 않은 항목은 측정 완료로 표시하지 않습니다. 발견한 별도 제품 버그는 업무로 추적하고 이 장을 작업 일지로 사용하지 않습니다. 격리 인스턴스의 실행·증거·정리는 [검증 절차](../development/RqGTB7dtd6.md)에 있습니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/resources/application.properties](../../../server/src/main/resources/application.properties)
- [server/src/main/java/io/github/goraebap/bit/module/manual/domain/ManualContent.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/domain/ManualContent.java)
- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java)
