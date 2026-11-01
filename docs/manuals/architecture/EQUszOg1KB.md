# 데이터·키·외부 파일의 복구 위험

운영 위험은 이미지와 데이터의 수명 차이에서 발생합니다. 이미지가 내려가도 새 스키마나 삭제한 데이터가 자동 복원되지는 않습니다.

DB·로컬 첨부·생성 비밀값은 함께 보존해야 합니다. S3 사용 시 로컬 첨부의 위치만 달라질 뿐 DB·암호화 키 백업은 필요합니다. 실행 중 SQLite DB 파일 하나만 단순 복사하면 WAL의 변경을 빠뜨릴 수 있으므로 검증한 정지/백업 절차를 사용합니다.

## 외부 파일 작업

첨부 저장·삭제와 DB 트랜잭션은 외부 객체 저장소까지 원자적으로 묶이지 않습니다. 저장 실패나 정리 실패가 발생하면 책 본문·첨부 관계·실제 객체의 상태를 각각 확인해야 합니다. 실제 외부 장애에서의 회복이 검증됐다고 문서만으로 주장하지 않습니다.

## 배포를 되돌릴 때의 판단

이전 이미지가 현재 DB를 읽을 수 있는지, 복원본에 해당 시점의 첨부와 키가 있는지, 복원 이후 입력된 자료가 사라지는지 판단합니다. 운영 백업·복구는 별도 승인된 작업에서 수행합니다. 명령·중단 기준은 [운영 점검](../development/zMxDaRLgq2.md)과 [배포·복구](../development/tpKZ6UIr31.md)에 있습니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- 현재 지침 원본: `.agents/skills/bit-development/references/architecture/deploy.md`
- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualService.java)
- [deploy/prod/compose.yaml](../../../deploy/prod/compose.yaml)
