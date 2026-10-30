# 워크플로 칸

프로젝트 관리자는 설정의 워크플로에서 칸(상태)을 더하고 순서를 바꾼다. 칸마다 범주(백로그·할 일·진행 중·완료·취소)가
있고, '완료 상태'인 칸은 완료나 취소이며 취소 칸은 늘 완료 상태다(D-111). 같은 범주의 둘째 칸은 아이콘이 다르다.

## Sub-features

- `columns-list` 칸 목록과 순서, 각 칸의 범주와 완료 상태 표시.
- `columns-add` `상태 추가`로 칸을 더한다.
- `columns-canceled-final` 범주를 취소로 고르면 완료 상태가 켜진 채 잠긴다.
- `columns-step-mark` 같은 범주의 둘째 칸(검토 중, 둘째 취소 칸)은 첫 칸과 아이콘이 다르다.

## How to get to it (user POV)

- 사이드바 아래 `워크스페이스 설정` → 프로젝트 아래 `워크플로`. 주소는
  `/workspaces/<workspace.id>/settings/projects/<projectId>/board`다.

## Driving it with verify.mjs

Preconditions:

- [업무 만들기와 상태 옮기기](./work-item-status.md)의 프로젝트가 있고, 브라우저가 이 run에 로그인했다
  ([첫 계정과 로그인](./sign-in.md)).

- **목록.** 워크플로 주소를 연다. `find "워크플로 상태 순서"`가 목록을 찾고, `get_page_text`에 `상태 6개`와 백로그·할 일·
  진행 중·검토 중·완료·취소가 그 순서로, 완료·취소 옆에 `완료 상태`가 보인다.
- **칸 추가.** `find "상태 추가"` 버튼을 누른다. 창의 `이름` 칸에 `보류`를 넣고, `분류` 선택에서 `취소`를 고른다.
  `완료 상태` 스위치가 켜진 채 바뀌지 않는다. 창의 `상태 추가`를 누른다.
- **결과.** 목록이 `상태 7개`가 되고 `보류` 옆에 `완료 상태`, 범주 `취소`가 보인다. `verify note <run> columns-add-ui`로 남긴다.
- **DB로 다시 보기.** `verify db <run> "select name, category, is_final, position from board_column where deleted_at is null order by position" --save columns-db`의 마지막 행이 `보류`·`canceled`·1이다.
- **아이콘.** 목록에서 `검토 중`의 원이 `진행 중`보다 더 차 있고 `보류`는 `취소`의 ✕와 달리 일시정지 모양이다. 화면 스크린숏으로만 볼 수 있다.

## Gotchas

- 설정 화면은 프로젝트 관리자만 고칠 수 있다. `launch`의 계정은 워크스페이스를 만든 사람이라 관리자다.
- 마지막 '완료' 범주의 완료 상태 칸은 지울 수 없다(프로젝트는 닫는 완료 칸을 하나는 가져야 한다).
- 아이콘 차이는 글로 나오지 않는다. 증거가 필요하면 스크린숏을 대화에 남기고 그렇게 보고한다.
