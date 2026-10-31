# 도구

| 도구 | 쓰는 때 |
| :--- | :--- |
| `whoami` | 연결, 계정, 워크스페이스 확인 |
| `list_projects` | 프로젝트 키와 보드 칸 이름 확인 |
| `list_members` | 담당자로 지정할 사람 확인 |
| `list_labels` | 쓸 수 있는 라벨 확인 |
| `list_work_item_types` | 업무 유형과 유형별 상위 규칙 확인(유형이 있는 서버) |
| `list_work_items` | 업무 찾기(`query`, `label`, `include_closed`, `assignee`, 유형이 있으면 `type`) |
| `get_work_item_context` | 업무 하나를 설명, 댓글, 활동까지 읽기 |
| `create_work_item` | 업무 만들기. `assignee`·`start_date`·`due_date`·`priority`·`labels`는 [업무 만들기](../playbooks/create.md)의 속성 정하기대로, 유형이 있으면 `type`. 일정은 `kind: "event"`와 `starts_at`·`ends_at`(예: `2026-10-28T10:00+09:00`), 사람이 여럿이면 `people`. 반복은 `repeat: "weekly"`(와 `repeat_on`, `repeat_until`), 일정 알림은 `remind_before`(분) |
| `create_subtask` | 상위 업무(`parent`) 밑에 하위 업무 만들기. 상위의 프로젝트·우선순위를 따르고 미배정·시작 전으로 생긴다. 유형이 있으면 `type` |
| `update_work_item` | 제목, 설명, 라벨, 사람, 날짜·시각, 유형(`type`), 상위(`parent`) 고치기(준 값만 바뀜). 작업과 일정은 서로 바꿀 수 없다(새로 만든다). 값을 지우려면 `none`. 반복 업무의 이후 회차까지 고치려면 `scope: "following"`, 반복을 끝내려면 `repeat: "none"` |
| `move_work_item` | 칸(백로그, 할 일, 진행 중, 완료, 취소 등) 옮기기, 보관. 상태 분류는 backlog·todo·doing·done·canceled이고, 작업은 늘 상태가 있다(일정만 없음) |
| `set_work_item_project` | 업무를 다른 프로젝트로 옮기거나 `none`으로 프로젝트에서 빼기(참조 번호는 그대로) |
| `add_comment` | 진행, 결과, 막힌 점, '결정' 남기기 |
| `list_relations` | 업무의 상위·하위 업무와 연결된 문서, 문서의 참조 읽기 |
| `link_targets` | 기존 업무·문서 잇기(`subtask_of`: 하위 → 상위, `relates_to`: 업무 ↔ 문서, `references`: 문서 → 문서) |
| `unlink_targets` | `list_relations`의 `linkId`로 연결만 끊기(대상은 지우지 않음) |
| `attach_files` / `remove_attachment` | 업로드를 마친 파일을 업무·문서·댓글에 붙이거나 떼기 |
| `set_reaction` / `list_detail_engagement` | 리액션 달기·지우기, 리액션과 첨부 읽기 |
| `list_documents` | 문서 찾기(`query`, `label`, `project`) 또는 폴더 열기(`folder`: "설계/화면") |
| `get_document` | 문서 하나를 본문, 연결된 업무, 댓글까지 읽기 |
| `create_document` | 요구사항·설계·기획·회의록처럼 오래 두고 고쳐 가며 보는 글 남기기(없는 폴더는 만듦) |
| `update_document` | 문서 본문·제목·라벨 고치기, `project`·`folder`로 옮기기 |
| `link_document` | 문서를 그 문서가 다루는 업무와 잇기(`remove: true`면 끊기) |
| `create_page` | 로컬에서 만든 HTML 결과물을 zip 하나로 `purpose: "page"` 업로드한 뒤 문서함의 페이지(버전 1)로 만들기 |
| `update_page` | 페이지에 고친 묶음을 새 버전으로 올리기(제목·라벨·위치는 `update_document`) |

문서 도구가 목록에 없으면 문서 기능이 생기기 전의 옛 서버다. 그때 긴 글은 업무 설명에 쓴다.

도구 이름이 이 표와 다르거나 `Unknown tool` 오류가 나면, 서버가 업데이트됐는데 연결이 옛 도구 목록을 들고 있는 것이다. 사용자에게 MCP 서버를 다시 연결하거나 새 세션을 열어 달라고 한다. 업무 도구 이름을 issue로 바꿨던 일부 옛 서버(0.8 무렵)는 업무 도구 이름이 `get_issue_context`, `list_issues`, `create_issue`, `update_issue`, `move_issue`이다. 연결된 서버의 도구 목록에 있는 이름을 쓴다.
