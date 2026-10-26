# better-issue-tracker 스킬

BIT를 이슈 트래커로 쓰는 프로젝트에서, 에이전트가 MCP로 이슈와 결정기록을 남기며 일하게 하는 [Agent Skill](https://agentskills.io)입니다. Claude Code, Codex 등 `SKILL.md`를 읽는 에이전트에서 씁니다.

## 설치

1. BIT의 MCP 서버를 에이전트에 연결합니다. BIT 화면의 설정 → API 키에서 키를 만들고, 엔드포인트는 `https://<BIT 주소>/api/mcp`(Streamable HTTP, `Authorization: Bearer <키>`)입니다.
2. 이 폴더를 에이전트의 스킬 폴더에 복사합니다.
   - Claude Code: 모든 프로젝트에 쓰려면 `~/.claude/skills/better-issue-tracker/`, 한 프로젝트에만 쓰려면 그 프로젝트의 `.claude/skills/better-issue-tracker/`
   - Codex 등: `~/.agents/skills/better-issue-tracker/` 또는 프로젝트의 `.agents/skills/better-issue-tracker/`
3. 프로젝트 지침(`AGENTS.md` 등)에 어느 워크스페이스·프로젝트에 남길지 한 줄 적어 두면, 에이전트가 매번 묻지 않습니다.

```markdown
- 이슈는 BIT의 `<워크스페이스>` 워크스페이스 · `<프로젝트 키>` 프로젝트에 남긴다. MCP 서버 이름은 `bit`이다.
```

## 고치기

스킬을 쓰다가 에이전트가 이슈를 빠뜨리거나 결정기록을 잘못 나누면, 무엇이 어떻게 틀렸는지와 함께 BIT 저장소에 알려 주세요. 고친 내용은 `notes.md`에 남깁니다.
