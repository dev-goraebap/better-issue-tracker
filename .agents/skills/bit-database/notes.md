# bit-database 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-26 · ID 형식 반영 (BIT-1, D-083)
- 증상: 모든 ID가 UUID에서 10자 ID로 바뀌었는데(커밋 `eecd083`, 운영 배포) 참고 문서가 여전히 "기본 키는 UUID v4"라고 해서 새 표가 UUID를 만들 수 있었다
- 층: 참고 문서.
- 수정: `01-database.md`의 기본 키 열 규칙을 10자 ID와 새 표의 `varchar(10)`으로, 사람이 읽는 번호와 저장 형식의 UUID를 ID로 고쳤다
- 확인: `.agents/skills`에서 `uuid`를 찾아 V1~V8 열 타입 설명 말고 남은 것이 없음을 봤다. 사용자가 초안을 승인했다(새 표의 ID 열은 `varchar(10)`).

## 2026-10-22 · 이관
- 증상: BIT에 DB 스킬이 없었다. `docs/conventions.md` 5절이 SandboxHr `hohr-database`를 상세로 가리켰고, 이름 규칙은 그 스킬에 없이 SandboxHr 코드에만 있었다
- 수정: `hohr-database`를 옮기고 DB 파일을 `server/data/bit.db`로 바꿨다. SandboxHr 코드에만 있던 이름 규칙(테이블 단수 snake_case, `<table>_id` PK, `<table>_pkey`, FK `<t>_<col>_<ref>_<refcol>_fk`, `ux_`·`ix_`·`ck_`, 감사 열, 열거값)을 `docs/conventions.md` 5절과 `docs/06-schema.md` 공통 규칙에서 가져와 명시했다. 스키마 기준을 `docs/06-schema.md`로 가리켰다. 옛 hoho-hr PostgreSQL 이관(`deploy/legacy-import`, `deploy/pg-to-sqlite`), 마이그레이션 17개를 합친 이력, HR 데이터 이야기는 뺐다. 답이 없는 것은 SKILL.md "BIT에서 정할 것"에 모았다
- 확인: 아직 코드가 없어 문서 대조만 했다. `docs/conventions.md` 1·5절, `docs/06-schema.md` 공통 규칙, `.gitignore`의 `server/data/`와 어긋나지 않는다
