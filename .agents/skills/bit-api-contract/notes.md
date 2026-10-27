# bit-api-contract 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-27 · 운영 문서 조회 연결
- 요청: SDLC·arc42 운영 문서를 스킬이 MCP로 읽게 한다(BIT-62, D-098/BIT-63).
- 수정: 공통 문서 조회 안내로 연결하고 영역별 제목 검색·본문 조회를 수행한다. 상세 지식은 스킬에 복제하지 않는다.
- 확인: 운영 문서 지도와 해당 영역 문서를 list_documents/get_document로 읽고 설치본을 동기화한다.

## 2026-10-26 · 이슈 이름과 주소 반영 (D-084)
- 증상: 코드·API·MCP의 작업항목(work item)이 이슈(issue)로, 화면 주소가 `/workspaces/…/projects/…/issues/…`로 바뀌었는데 참고 문서가 옛 이름(`work_item`, `/work-items`, `/w/…/p/…`, `get_work_item_context`)을 예로 들고 있었다
- 층: 참고 문서.
- 수정: `SKILL.md`, `references/01-api-contract.md`, `references/02-error-contract.md`, `references/03-authentication.md`, `references/04-attachments.md`의 작업항목·work item·옛 주소를 이슈·issue·새 주소로 바꿨다
- 확인: 바꾼 뒤 이 스킬의 SKILL.md·references에 `work_item`·`work-item`·`/w/$`가 남지 않았다

## 2026-10-26 · ID 형식 반영 (BIT-1, D-083)
- 증상: 모든 ID가 UUID에서 10자 ID로 바뀌었는데(커밋 `eecd083`, 운영 배포) 참고 문서가 여전히 경로 변수·고유 식별자를 UUID로 적고 있었다
- 층: 참고 문서.
- 수정: `01-api-contract.md`의 식별자 표현·목록 필터 예·고유 식별자 예, `03-authentication.md`의 URL 판정, `04-attachments.md`의 `owner_id`를 ID로 고쳤다
- 확인: `.agents/skills`에서 `uuid`를 찾아 남은 것이 없음을 봤다. 사용자가 초안을 승인했다(새 표의 ID 열은 `varchar(10)`).

## 2026-10-22 · T-003 확정 반영
- 증상: 구현 지시서에서 채택한 정책이 기존 참고 문서에는 후속 기준 또는 미결로 남아 있었다.
- 층: 참고 문서.
- 수정: D-040~D-043의 세션/Bearer 경계와 초대 보안 계약을 실제 구현에 맞춰 반영했다. T-003 지시서의 승인된 갱신 범위다.
- 확인: 전체 서버·클라이언트 검사, 실제 SQLite 경쟁·롤백, Docker 업그레이드와 브라우저 실행을 지시서 결과와 대조한다.

## 2026-10-22 · T-002 승인 정책 반영
- 근거: 사용자가 T-002 추천안 확정·구현과 결정 기록 반영을 요청했다. 지시서의 스킬 반영 항목도 이 승인 범위로 적용했다.
- 층: 참고 계약. 미결로 남던 가입·역할·Bearer 범위와 수명 값을 D-036~D-039로 반영했다. HR 원본에만 있던 개발 사용자 선택 로그인·미구현 PreAuthorizeBeforeBinding 가정을 현재 구현에 맞췄다.
- 확인: 실제 SQLite HTTP 통합 테스트, 바인딩 전 인가 테스트, 클라이언트 CSRF 동시성 테스트와 skills 동기화. workspace 역할 구현·검증은 후속 작업으로 명시했다.

## 2026-10-22 · 이관
- 증상: BIT에 API 계약 스킬이 없었다. `docs/conventions.md` 4절이 SandboxHr `hohr-api-contract`를 상세로 가리키고 있었다
- 수정: `hohr-api-contract`를 옮기고 이름을 `bit-*` 계열로 바꿨다(쿠키 `bit_session`, API 키 접두사 `bit_`). HR 예시와 결재 신청 응답 예외, 사원 지정 조회의 404 규칙, "사내 공식 이메일" 정책을 뺐다. 인증은 D-027(이메일 + 비밀번호 기본, SMTP가 있을 때만 OTP, 없으면 관리자 임시 비밀번호), API 키는 D-021·D-022(키 주인의 워크스페이스 역할, GET 전용 아님), 권한은 `06-schema.md`의 워크스페이스 역할 4개 + 인스턴스 관리자, 파일 저장소는 D-029(로컬 기본, S3 호환 어댑터), 켜진 기능 알림은 D-030으로 바꿨다. 답이 없는 것은 SKILL.md "BIT에서 정할 것"에 모았다
- 확인: 아직 코드가 없어 문서 대조만 했다. `docs/conventions.md` 4·9절, `docs/06-schema.md` 1·2·9절, `docs/07-mcp.md` 인증 항목과 어긋나지 않는다
