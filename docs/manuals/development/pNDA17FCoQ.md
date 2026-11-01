# 문서·매뉴얼·스킬을 함께 관리하기

프로젝트 지식은 사람이 읽는 매뉴얼로 제공하고, 실행되는 계약과 작업 절차의 원본은 각 위치에서 관리합니다. 같은 본문을 여러 곳에 복제하면 변경할 때 어느 쪽을 믿을지 어려워집니다.

## 원본과 게시

D-125부터 docs/manuals가 콘텐츠 원본이며 BIT 매뉴얼은 게시본입니다. bit-development는 로컬 자료를 선택해서 읽습니다. 코드 변경과 관련 원본을 함께 수정하고 공통 better-issue-tracker의 references/manual-publication.md에 따라 게시합니다. 기존 원격 편집/댓글은 원본 개선 맥락으로 보존합니다.

## 스킬과 도구 관리

AGENTS.md는 진입 지침, .agents/skills/bit-development는 저장소 작업 입구와 실행 도구, skills/better-issue-tracker는 공통 배포 스킬 원본입니다. 설치 사본은 직접 고치지 않습니다.

원본을 수정한 뒤 저장소 루트에서 node scripts/sync-skills.mjs 및 node scripts/check-bit-skill.mjs를 실행합니다. 프로젝트 스킬 생성·정리는 공통 스킬의 playbooks/project-skill.md를 따릅니다. 모노레포는 작업별 분기, 멀티레포는 공통 계약 원본과 저장소별 담당 범위를 연결합니다.

## 게시 범위

현재 MCP는 Markdown body를 지원합니다. 중간 표현·Tiptap 어댑터·게시 hash 저장·자동 충돌 병합은 설계이며 구현 완료가 아닙니다. 에디터 프로젝트는 별도 범위입니다. 게시 직전 원격 최신 본문과 version을 확인하고 사용자 편집을 덮어쓰지 않습니다. 미배포 사용자 사용법은 운영에 먼저 게시하지 않습니다.
