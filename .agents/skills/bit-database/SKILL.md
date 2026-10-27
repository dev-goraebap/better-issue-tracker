---
name: bit-database
description: BIT 로컬 DB(SQLite)·테이블 이름 규칙·Flyway 마이그레이션·jOOQ 생성. "테이블 추가", "컬럼 바꿔줘", "인덱스 추가", "마이그레이션", "V1 스키마 작성", "로컬 DB 다시 만들기", "jOOQ 다시 생성"을 다룰 때 쓴다.
---

작업 전에 [운영 프로젝트 문서 읽기](../bit-architecture/references/project-documents.md)에 따라 해당 영역의 문서를 MCP로 읽는다. 스킬의 절차와 현재 코드 계약을 함께 적용한다.

# 로컬 DB와 마이그레이션

BIT의 테이블과 열의 기준은 `docs/06-schema.md`다. 이 스킬은 그 스키마를 SQL로 옮기고 바꾸는 규칙을 다룬다.

| 작업 | 파일 |
| :--- | :--- |
| 테이블·열·제약을 만들거나 바꾸거나 로컬 DB를 다시 만들 때 | [로컬 DB와 마이그레이션](references/01-database.md) |
| 운영 DB 백업·복구, 배포 때의 마이그레이션 | `bit-architecture` 스킬 7절 |

## BIT에서 정할 것

이 스킬을 옮길 때 원본(SandboxHr)과 BIT 문서 어디에도 답이 없던 것이다. 정해지면 참고 파일로 옮기고 이 목록에서 지운다.

- 로컬 DB를 다시 만든 뒤 넣을 개발용 데이터를 만드는 방법(SandboxHr는 옛 DB 복사 도구를 썼고 BIT에는 옛 DB가 없다)

## 완료 기준

- 스키마 변경은 새 `V<n>__<이름>.sql` 파일이고, 이미 있던 마이그레이션 파일은 그대로다
- 새 테이블·제약·인덱스 이름이 참고 파일의 이름 규칙을 따르고, `docs/06-schema.md`와 어긋나면 그 문서도 같은 커밋에서 고쳤다
- jOOQ 생성 뒤 `server`에서 `./gradlew check`가 통과한다

결과가 틀리면 `skill-repair`로 이 스킬을 고친다.
