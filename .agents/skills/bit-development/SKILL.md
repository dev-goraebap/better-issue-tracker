---
name: bit-development
description: BIT 저장소(better-issue-tracker)의 코드·문서·설정을 고치는 모든 작업의 입구. 서버(server/, Spring Boot·jOOQ·SQLite, MCP 도구), 화면(client/, React·TanStack·Astryx·FSD), DB 테이블·Flyway 마이그레이션, API·오류·인증·권한·파일 첨부 계약, 모듈 구조·외부 연동·Docker·compose·CI·운영 백업, 버전 태그와 GHCR 이미지 배포, 따로 띄워 화면·API·MCP로 검증하기, 프로젝트 스킬 고치기를 다룬다. "서버 기능 추가", "API 만들어줘", "MCP 도구 구현", "화면 추가", "프론트 고쳐줘", "테이블 추가", "마이그레이션", "로그인·권한", "파일 업로드", "외부 연동 붙여줘", "Dockerfile·compose", "배포해줘", "릴리스", "태그 달아줘", "실제로 되는지 확인해줘", "스킬 고쳐줘"라고 할 때, Java·tsx·css·SQL 파일을 만들거나 고칠 때 쓴다.
---

# BIT 저장소에서 일하기

이 파일은 어떤 작업에 어느 플레이북을 읽는지만 담는다. 아래 표에서 작업에 맞는 행의 플레이북을 **먼저 읽고** 따른다. 플레이북이 가리키는 참고 파일은 그 작업에 필요할 때 읽는다.

## 시작과 완료

- BIT는 모노레포다. `server/`와 `client/` 작업을 이 스킬 하나에서 분기한다. 공통 업무 기록·매뉴얼 유지관리는 `better-issue-tracker`를 따른다.
- [매뉴얼 지도](references/architecture/project-documents.md)에서 작업별 개발 절차와 설계 규칙을 선택해 읽는다. 상세 본문은 저장소의 docs/manuals 원본에서 관리하고 BIT에는 게시한다. 사용자 사용법 변경은 같은 지도의 사용자 페이지도 확인한다.
- 현재 코드·빌드·검사·마이그레이션과 매뉴얼을 대조한다. 연결 실패는 밝히고 저장소 계약으로 확인할 수 있는 범위를 진행한다.
- 실행 스크립트·릴리스 조작 절차는 아래 플레이북을 따른다. 매뉴얼의 명령이 외부 게시·배포 권한을 부여하지 않는다.

## 플레이북

| 작업 | 플레이북 |
| :--- | :--- |
| 서버 기능, Java 파일, 모듈·계층, MCP 도구 구현 | [서버](playbooks/backend.md) |
| 화면, tsx·css 파일, 레이아웃, 컴포넌트, 화면 이동과 로딩 | [화면](playbooks/frontend.md) |
| 테이블·열·인덱스, Flyway 마이그레이션, jOOQ 생성, 로컬 DB | [로컬 DB와 마이그레이션](playbooks/database.md) |
| API 추가·변경, 오류 응답, 로그인·세션·API 키·권한, 파일 첨부 | [API 계약](playbooks/api-contract.md) |
| 새 모듈, 모듈 경계, 외부 연동(메일·Git·S3), 설정 없을 때 꺼지기, Docker·compose·CI, 운영 DB 백업·복구 | [구조와 운영](playbooks/architecture.md) |
| 버전 정하기, 태그, GHCR 이미지, GitHub Release, 운영 서버 배포 | [배포(릴리스)](playbooks/release.md) |
| 바꾼 동작이 실제로 되는지 따로 띄운 BIT에서 사람·API·MCP의 길로 조작해 확인하고 증거 남기기 | [BIT 검증](playbooks/verify.md) |
| 이 스킬을 고치거나 점검하기 | [스킬 수선](playbooks/skill-repair.md) |
| 화면 코드를 FSD의 어느 레이어·슬라이스에 둘지 | [화면](playbooks/frontend.md)과 별도 스킬 `feature-sliced-design`(공식 FSD 스킬) |

여러 영역에 걸치면 해당 플레이북을 모두 읽는다. 자주 겹치는 경우는 이렇다.
- API·DB·외부 연동 작업의 코드는 `server/`에 있으므로 [서버](playbooks/backend.md)도 읽는다. 외부 연동의 어댑터와 '설정이 없으면 꺼짐' 규칙도 서버 플레이북에 있다.
- 서버 계약이 바뀌어 화면이 따라 바뀌면 [화면](playbooks/frontend.md)도 읽는다.
- 동작을 바꿨으면 완료라고 말하기 전에 [BIT 검증](playbooks/verify.md)으로 확인한다.
