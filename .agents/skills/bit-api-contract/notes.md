# bit-api-contract 수정 기록

최신이 위다. 형식은 `skill-repair`를 따른다.

## 2026-10-22 · 이관
- 증상: BIT에 API 계약 스킬이 없었다. `docs/conventions.md` 4절이 SandboxHr `hohr-api-contract`를 상세로 가리키고 있었다
- 수정: `hohr-api-contract`를 옮기고 이름을 `bit-*` 계열로 바꿨다(쿠키 `bit_session`, API 키 접두사 `bit_`). HR 예시와 결재 신청 응답 예외, 사원 지정 조회의 404 규칙, "사내 공식 이메일" 정책을 뺐다. 인증은 D-027(이메일 + 비밀번호 기본, SMTP가 있을 때만 OTP, 없으면 관리자 임시 비밀번호), API 키는 D-021·D-022(키 주인의 워크스페이스 역할, GET 전용 아님), 권한은 `06-schema.md`의 워크스페이스 역할 4개 + 인스턴스 관리자, 파일 저장소는 D-029(로컬 기본, S3 호환 어댑터), 켜진 기능 알림은 D-030으로 바꿨다. 답이 없는 것은 SKILL.md "BIT에서 정할 것"에 모았다
- 확인: 아직 코드가 없어 문서 대조만 했다. `docs/conventions.md` 4·9절, `docs/06-schema.md` 1·2·9절, `docs/07-mcp.md` 인증 항목과 어긋나지 않는다
