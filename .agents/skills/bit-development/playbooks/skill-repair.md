# 프로젝트 스킬 정리

공통 `better-issue-tracker`의 `playbooks/project-skill.md`에 따라 기존 원본·호출자·매뉴얼을 먼저 확인합니다. BIT의 상세 규칙은 [매뉴얼 지도](../references/architecture/project-documents.md)의 문서·스킬 행에서 읽습니다.

BIT 원본은 `.agents/skills/bit-development/`, 배포 원본은 `skills/better-issue-tracker/`입니다. 실행 스크립트와 기존 사용자 편집을 보존합니다. 사용자에게 이미 승인받은 변경 범위는 다시 승인받지 않습니다.

변경 후 저장소 루트에서 `node scripts/sync-skills.mjs`, `node scripts/check-bit-skill.mjs`를 실행하고 설치 사본을 대조합니다. 관련 상대 링크와 [검증 도구](verify.md)의 경로도 확인합니다. 결과와 미확인 범위는 해당 BIT 업무에 남깁니다.
