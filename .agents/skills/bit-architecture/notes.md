# bit-architecture 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-27 · 운영 문서 조회 연결
- 요청: SDLC·arc42 운영 문서를 스킬이 MCP로 읽게 한다(BIT-62, D-098/BIT-63).
- 수정: 공통 문서 조회 안내로 연결하고 영역별 제목 검색·본문 조회를 수행한다. 상세 지식은 스킬에 복제하지 않는다.
- 확인: 운영 문서 지도와 해당 영역 문서를 list_documents/get_document로 읽고 설치본을 동기화한다.

## 2026-10-27 · 운영 compose 기준 (BIT-56)
- 증상: 공통 배포 지침이 저장소 `deploy/`의 예시만 안내하고 있어 실제 운영 compose 위치를 다시 찾거나 별도 실행 구성을 만들 수 있었다.
- 층: 참고 문서·진입 안내.
- 수정: 사용자가 지정한 `~/apps/bit/compose.yml`을 현재 운영 설정의 기준으로 명시했다. `docs/deployment.md`에 실제 서비스·데이터·프록시 구성과 백업·교체·검증·복구 순서를 모으고 스킬에서 참조한다.
- 확인: 서버의 기존 compose와 문서의 서비스·프로젝트·볼륨·네트워크가 일치하며 구성 검사가 통과했다. 동기화 후 스킬 원본과 Claude 설치본의 내용도 비교했다.

## 2026-10-26 · 이슈 이름과 주소 반영 (D-084)
- 증상: 코드·API·MCP의 작업항목(work item)이 이슈(issue)로, 화면 주소가 `/workspaces/…/projects/…/issues/…`로 바뀌었는데 참고 문서가 옛 이름(`work_item`, `/work-items`, `/w/…/p/…`, `get_work_item_context`)을 예로 들고 있었다
- 층: 참고 문서.
- 수정: `SKILL.md`, `references/deploy.md`의 작업항목·work item·옛 주소를 이슈·issue·새 주소로 바꿨다
- 확인: 바꾼 뒤 이 스킬의 SKILL.md·references에 `work_item`·`work-item`·`/w/$`가 남지 않았다

## 2026-10-22 · 절차
- 증상: T-001의 `GeneratedSecrets` 구현 뒤에도 비밀값 자동 생성·보관 방식이 미결로 남아 있었다.
- 층: 절차(SKILL.md).
- 수정: D-035를 운영 규칙에 반영하고 해당 미결 항목을 제거했다.
- 확인: `GeneratedSecretsTest`로 재시작 시 유지·명시값 우선·생성 끄기를 검증했고 `./gradlew check`가 통과했다. 스킬 동기화 뒤 같은 검사도 다시 통과했다.

## 2026-10-22 · 이관
- 증상: BIT에 아키텍처 스킬이 없어 SandboxHr `hohr-architecture`를 옮겨야 했다 (`docs/conventions.md` 8~9절)
- 수정: 구조·제약·런타임·운영 원칙을 BIT 이름(`bit`, `io.github.goraebap.bit`, `/var/lib/bit`, `bit.db`)과 BIT 모듈로 옮겼다. D-030(선택 기능 어댑터, 켜진 기능 목록 API)을 4절에, Git 참조 원칙(D-003, D-028)을 2절에 넣었다. deploy.md는 이미지 3단계·볼륨 하나·compose·GitHub Actions 검사와 태그 이미지·수동 교체와 되돌리기·Litestream(선택)으로 일반화했다. 빼낸 것: HR 역할·결재/휴가 흐름, office·projects 그룹 규칙(ArchitectureTest의 그룹 규칙 포함), 회사 서버·도메인·GitLab CI·러너·배포자 고정, nginx 사내 IP 허용, R2 회사 버킷, 옛 hoho-hr 이관·전환 상태·이름 전환, Redmine 연동, 로고·브랜딩, Gitifact 명령. 문서에 없는 의존 방향과 미정 항목은 SKILL.md "BIT에서 정할 것"에 두었다
- 확인: 저장소 구현체 이름은 SandboxHr 실제 코드(`Jooq*Repository`, package-private)와 실제 `Dockerfile`(비루트 10001, HEALTHCHECK `/api/v1/health`)을 따랐다. Litestream 확인 쿼리의 표 이름 `work_item`은 `docs/06-schema.md`와 같다
