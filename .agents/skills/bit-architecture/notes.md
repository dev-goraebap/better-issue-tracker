# bit-architecture 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-22 · 절차
- 증상: T-001의 `GeneratedSecrets` 구현 뒤에도 비밀값 자동 생성·보관 방식이 미결로 남아 있었다.
- 층: 절차(SKILL.md).
- 수정: D-035를 운영 규칙에 반영하고 해당 미결 항목을 제거했다.
- 확인: `GeneratedSecretsTest`로 재시작 시 유지·명시값 우선·생성 끄기를 검증했고 `./gradlew check`가 통과했다. 스킬 동기화 뒤 같은 검사도 다시 통과했다.

## 2026-10-22 · 이관
- 증상: BIT에 아키텍처 스킬이 없어 SandboxHr `hohr-architecture`를 옮겨야 했다 (`docs/conventions.md` 8~9절)
- 수정: 구조·제약·런타임·운영 원칙을 BIT 이름(`bit`, `io.github.goraebap.bit`, `/var/lib/bit`, `bit.db`)과 BIT 모듈로 옮겼다. D-030(선택 기능 어댑터, 켜진 기능 목록 API)을 4절에, Git 참조 원칙(D-003, D-028)을 2절에 넣었다. deploy.md는 이미지 3단계·볼륨 하나·compose·GitHub Actions 검사와 태그 이미지·수동 교체와 되돌리기·Litestream(선택)으로 일반화했다. 빼낸 것: HR 역할·결재/휴가 흐름, office·projects 그룹 규칙(ArchitectureTest의 그룹 규칙 포함), 회사 서버·도메인·GitLab CI·러너·배포자 고정, nginx 사내 IP 허용, R2 회사 버킷, 옛 hoho-hr 이관·전환 상태·이름 전환, Redmine 연동, 로고·브랜딩, Gitifact 명령. 문서에 없는 의존 방향과 미정 항목은 SKILL.md "BIT에서 정할 것"에 두었다
- 확인: 저장소 구현체 이름은 SandboxHr 실제 코드(`Jooq*Repository`, package-private)와 실제 `Dockerfile`(비루트 10001, HEALTHCHECK `/api/v1/health`)을 따랐다. Litestream 확인 쿼리의 표 이름 `work_item`은 `docs/06-schema.md`와 같다
