# better-issue-tracker 스킬

BIT를 업무 트래커로 쓰는 프로젝트에서, 에이전트가 MCP로 업무를 남기며 일하게 하는 [Agent Skill](https://agentskills.io)입니다. Claude Code, Codex 등 `SKILL.md`를 읽는 에이전트에서 씁니다.

## 설치

1. BIT의 MCP 서버를 에이전트에 연결합니다. BIT 화면의 설정 → API 키에서 키를 만들고, 엔드포인트는 `https://<BIT 주소>/api/mcp`(Streamable HTTP, `Authorization: Bearer <키>`)입니다.
2. 이 폴더를 통째로(`playbooks/`, `references/` 포함) 에이전트의 스킬 폴더에 복사합니다.
   - Claude Code: 모든 프로젝트에 쓰려면 `~/.claude/skills/better-issue-tracker/`, 한 프로젝트에만 쓰려면 그 프로젝트의 `.claude/skills/better-issue-tracker/`
   - Codex 등: `~/.agents/skills/better-issue-tracker/` 또는 프로젝트의 `.agents/skills/better-issue-tracker/`
3. 프로젝트 지침(`AGENTS.md` 등)에 어느 워크스페이스·프로젝트에 남길지 한 줄 적어 두면, 에이전트가 매번 묻지 않습니다.

```markdown
- 업무는 BIT의 `<워크스페이스>` 워크스페이스 · `<프로젝트 키>` 프로젝트에 남긴다. MCP 서버 이름은 `bit`이다.
```

## 문제 해결

- **도구가 없다거나 `Unknown tool` 오류가 난다:** BIT 서버를 업데이트해 도구 이름이 바뀌었는데, 에이전트의 MCP 연결이 옛 도구 목록을 들고 있는 경우입니다. MCP 서버를 다시 연결하거나 새 세션을 여세요.
- **저장소 연동:** 프로젝트를 GitHub, GitLab, Gitea 저장소와 연결했다면 스킬 `playbooks/repository.md`의 이름 규칙(브랜치 `orm-14-…`, 커밋·PR에 `ORM-14`)을 따르게 됩니다. 연결 여부를 프로젝트 지침에 적어 두면 에이전트가 PR로 가는 작업의 칸을 병합에 맡깁니다.

## 제보와 제안

BIT(화면, 서버·API, MCP 도구, 이 스킬, 설치·배포)의 버그나 개선 제안은 [이슈](https://github.com/dev-goraebap/better-issue-tracker/issues/new/choose)로 올려 주세요. 에이전트에게 "BIT에 제보해줘"라고 하면 스킬 `playbooks/report.md`대로 초안을 보여 주고, 승인하면 올립니다. 스킬의 변경 내역은 저장소의 커밋 기록에서 볼 수 있습니다.
