# 업무 만들기와 상태 옮기기

업무는 늘 상태가 있다(D-111). 에이전트(MCP)나 사람(화면)이 업무를 만들면 상태를 주지 않을 때 첫 '할 일' 칸에 놓이고,
칸을 옮기면 범주가 바뀌며 완료·취소 칸으로 가면 닫힌다.

## Sub-features

- `work-item-create-mcp` MCP `create_work_item`으로 만든다.
- `work-item-move-mcp` MCP `move_work_item`으로 칸 이름(`진행 중`)이나 범주(`doing`)로 옮긴다.
- `work-item-move-ui` 상세 패널의 상태 버튼으로 옮긴다.
- `work-item-close` 완료·취소 칸으로 옮기면 닫힘 시각이 찍힌다.

## How to get to it (user POV)

- 에이전트: MCP 도구 `create_work_item`, `move_work_item`.
- 사람: 프로젝트의 `업무`에서 업무 제목을 눌러 상세 패널을 열고, 속성 줄의 상태 버튼(예: `할 일`)을 눌러 `상태 바꾸기...`
  목록에서 칸을 고른다.

## Driving it with verify.mjs

Preconditions:

- 기본 준비 상태에 프로젝트가 하나 있다. 만들기:
  `verify api <run> POST /api/v1/workspaces/<workspace.id>/projects '{"name":"검증 프로젝트","key":"VER"}' --save project`
  가 201이고 `location`이 프로젝트 주소다. 새 프로젝트의 칸은 백로그·할 일·진행 중·검토 중·완료·취소다.

- **만들기(MCP).** `verify mcp <run> create_work_item '{"workspace":"verify-<run>","project":"VER","title":"검증용 업무"}' --save work-item-create-mcp`. 응답 글에 `VER-1`이 있다.
- **옮기기(MCP).** `verify mcp <run> move_work_item '{"workspace":"verify-<run>","ref":"VER-1","status":"진행 중"}' --save work-item-move-mcp`.
- **DB로 다시 보기.** `verify db <run> "select w.number, c.name, c.category, w.closed_at from work_item w join board_column c using(board_column_id) where w.title='검증용 업무'" --save work-item-move-db`가 `진행 중`·`doing`·닫힘 없음이다.
- **화면으로 다시 보기.** 로그인한 브라우저로 `location`의 프로젝트 주소를 연다. `get_page_text`에 `VER-1`, `검증용 업무`,
  `모두 1개`가 보인다. `verify note <run> work-item-list-ui`로 남긴다.
- **닫기.** 같은 방법으로 `"status":"완료"`(또는 `취소`)로 옮기고 DB의 `closed_at`이 채워졌는지 본다.

## Gotchas

- MCP 응답은 JSON-RPC로 감싸여 `result.content[0].text`에 JSON 글로 들어 있다. `isError`가 true면 도구 오류다.
- `workspace`를 빼면 워크스페이스가 하나뿐이라 통과하지만, 실제 사용자는 여럿일 수 있다. 검증에서는 넣는다.
- 상태를 주지 않고 만든 업무는 '백로그'가 아니라 첫 '할 일' 칸이다. 나중으로 미룰 업무만 `status: backlog`로 만든다.
- 프로젝트 만들기는 MCP 도구가 없어 API 길로 준비한다. 이것을 화면 검증으로 보고하지 않는다.
