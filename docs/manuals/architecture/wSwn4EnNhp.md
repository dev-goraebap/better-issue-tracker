# 품질 시나리오와 증거의 범위

품질 목표를 실제 상황·기대 결과·확인 방법으로 연결합니다. 이 표는 현재 계약과 검사의 범위를 설명하며 처리량·응답 시간 SLA를 새로 약속하지 않습니다.

| 상황/자극 | 기대 결과 | 현재 확인 수단 | 남는 한계 |
| --- | --- | --- | --- |
| viewer가 매뉴얼 쓰기를 요청 | 읽기는 가능해도 쓰기 거절 | ManualIntegrationTest 권한 시나리오 | 모든 화면 버튼 배치는 별도 확인 |
| 두 편집자가 같은 책의 이전 버전 저장 | 뒤 요청 거절·앞 내용 보존 | 버전 충돌 통합 테스트·화면 초안 확인 | 서로 다른 페이지도 책 단위 충돌 |
| 모듈이 다른 모듈 내부 구현 참조 | 변경이 검사에서 실패 | ArchitectureTest | SQL 의미·업무 정합성은 별도 검사 |
| 목록에서 조건·범위·커서를 변경 | 건수·선택·다음 페이지 일치 | ManualIntegrationTest·목록 테스트 | 실행 계획·대량 성능 측정 별도 |
| 필수 외부 설정이 없음 | 기본 앱은 기동·선택 기능만 꺼짐 | 격리 실행 health·capabilities | 실제 외부 공급자 연결은 별도 검증 |
| 목록을 키보드로 순서 변경 | 드래그와 같은 저장·읽기 피드백 | row-order 검사와 화면 조작 | 화면 읽기 프로그램별 결과 별도 |
| 운영 이미지 교체 후 재시작 | health와 실제 데이터 접근 정상 | 릴리스/배포 절차의 확인 단계 | 문서 작성 중 운영 교체는 미실행 |

서버 `check`는 단위·통합과 정적/경계 검사를, 클라이언트 `check`는 부품·순서·FSD·테스트·타입/빌드를 묶습니다. 어떤 명령이 어떤 위반을 잡는지와 수동 확인은 [검사 절차](../development/AQygip0Rv4.md)에서 확인합니다. 테스트 통과를 실제 운영 복구 검증으로 확대하지 않습니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/test/java/io/github/goraebap/bit/ArchitectureTest.java](../../../server/src/test/java/io/github/goraebap/bit/ArchitectureTest.java)
- [server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java](../../../server/src/test/java/io/github/goraebap/bit/ManualIntegrationTest.java)
- [server/build.gradle](../../../server/build.gradle)
- [client/package.json](../../../client/package.json)
