---
name: better-issue-tracker
description: BIT(better-issue-tracker)를 업무 트래커로 쓰는 프로젝트에서 MCP 도구로 업무를 남기며 일하는 방법. 연결된 MCP 서버에 get_work_item_context·create_work_item·add_comment 같은 도구가 있고, 코드나 문서를 바꾸는 요청을 받았을 때, 작업 중 버그나 다른 문제를 찾았을 때, 앞으로 따를 방식을 정했을 때, "업무 만들어줘", "BIT에 남겨줘", "결정 남겨줘", "ORM-14 처리해줘", "하위 업무로 나눠줘", "에픽 만들어줘", "업무 정리해줘"라고 할 때, BIT 자체의 버그를 만났거나 "BIT에 제보해줘", "BIT 개선 제안 올려줘"라고 할 때 쓴다.
---

# BIT로 일하기

BIT는 업무와 문서를 한곳에 두는 셀프호스팅 업무 트래커다. 에이전트는 MCP 도구로 업무를 찾고 만들고, 진행과 결과를 댓글로 남긴다. 사람은 같은 업무를 화면에서 읽는다. 다음 세션의 에이전트도 그 업무를 읽고 이어서 일한다.

이 스킬의 목표는 두 가지다. **사람이 BIT를 보고 남은 일을 알 수 있고, 한 일과 정한 것은 그 일의 업무에 남는다.** 업무는 요청마다 쌓는 일지가 아니라 계획 단위다. 대화에만 있고 업무에 없는 작업은 세션이 끝나면 사라진다.

이 파일은 언제 무엇을 하는지와 어느 파일을 읽는지만 담는다. 절차는 `playbooks/`에, 도구와 글의 틀은 `references/`에 있다. 아래 표의 상황이 되면 **그 행의 파일을 먼저 읽고** 따른다. 기억이나 짐작으로 대신하지 않는다. 단계가 여럿인 플레이북은 그 단계를 할 일 목록에 옮겨 하나씩 끝낸다.

## 반드시 지킬 것

| 상황 | 할 일 | 읽을 파일 |
| :--- | :--- | :--- |
| 세션에서 BIT를 처음 쓸 때 | 연결과 워크스페이스·프로젝트를 정하고, 내 '할 일'·'진행 중' 업무를 정리한다 | [playbooks/start.md](playbooks/start.md) |
| 코드·문서·설정을 바꾸는 요청 | **첫 수정 전에** 요청이 속한 업무를 찾는다. 같은 기능의 후속 수정이면 그 업무에 댓글로 남기고, 새 기능이나 버그일 때만 만든다 | [playbooks/create.md](playbooks/create.md) |
| 사용자가 참조를 줌(`ORM-14`) | 그 업무를 `get_work_item_context`로 읽고 시작한다 | [playbooks/work.md](playbooks/work.md) |
| 작업 중 이번 요청과 다른 문제를 찾음 | 이번에 고치면 이 업무 댓글에 쓰고, 지금 고치지 않을 것만 백로그 업무로 만든다 | [playbooks/create.md](playbooks/create.md) |
| 한 기능이 여러 PR이나 여러 날에 걸침, 에픽·스토리·하위 업무 | 에픽 하나 아래 PR 크기의 하위 업무로 나누고 유형 규칙을 따른다 | [playbooks/split.md](playbooks/split.md) |
| 업무를 시작·진행·마무리함 | 진행 중으로 옮기고, 댓글로 진행과 결과(커밋·검증)를 남기고, 맞는 칸으로 닫는다 | [playbooks/work.md](playbooks/work.md) |
| 앞으로 따를 선택을 하거나 전에 정한 것을 바꿈 | 그 업무에 '결정' 댓글을 하나 남긴다. 따로 업무나 문서를 만들지 않는다 | [playbooks/work.md](playbooks/work.md) |
| 저장소와 연결된 프로젝트에서 브랜치·커밋·PR을 만들거나 배포함 | 이름에 업무 키를 넣고, PR로 가는 작업은 병합에 맡긴다. 배포는 업무로 만들지 않는다 | [playbooks/repository.md](playbooks/repository.md) |
| 오래 두고 고칠 글(요구사항, 설계, 회의록, 제품·사용자 설명서, 인수인계)을 쓰거나 고침 | 독자를 정하고 팩트 시트부터 모은 뒤, 확인한 사실만 쓰고 '문서 기준'을 남긴다 | [playbooks/document.md](playbooks/document.md) |
| BIT 자체가 기대와 다르게 동작하거나 제보를 부탁받음 | 초안을 쓰고 사용자 승인 뒤에만 올린다 | [playbooks/report.md](playbooks/report.md) |
| 도구 이름·인자가 헷갈리거나 `Unknown tool` 오류 | 도구 표를 본다 | [references/tools.md](references/tools.md) |
| 업무 본문·댓글을 씀 | 쓰는 말과 틀을 따른다 | [references/writing.md](references/writing.md) |

어느 상황에서도 지키는 것:
- 대화의 요청 하나마다 업무를 만들지 않는다. 따로 추적하고 다시 열어 볼 기능이나 버그 하나가 업무 하나다.
- 업무 번호(`ORM-14`)는 업무를 만들어 받은 뒤에 쓴다. 다음 번호를 짐작해 커밋·브랜치·태그에 먼저 쓰지 않는다.
- 하지 않은 일을 한 것처럼 쓰지 않는다. 확인하지 못한 것은 확인하지 못했다고 쓴다.
- 비밀번호, API 키, 토큰, 개인정보는 업무에 쓰지 않는다.
- 계정에 워크스페이스가 여럿이면 모든 도구 호출에 `workspace`를 준다.
- 질문, 설명, 코드 읽기만 하는 요청에는 업무를 만들지 않는다. 사용자가 원하면 만든다.

## 플레이북

| 파일 | 다루는 것 |
| :--- | :--- |
| [start.md](playbooks/start.md) | 연결 확인, 워크스페이스·프로젝트 정하기, 프로젝트 문서 읽기, 내 업무 정리 |
| [create.md](playbooks/create.md) | 업무 단위, 언제 찾고 만드는가, 작업 중 찾은 문제, 제목·설명, 속성 정하기와 묻는 법 |
| [split.md](playbooks/split.md) | 에픽과 하위 업무, 업무 유형과 상위 규칙, 거절됐을 때 |
| [work.md](playbooks/work.md) | 시작, 앞선 결정 읽기, 진행·결과 댓글, '결정' 댓글, 닫기(완료·취소) |
| [document.md](playbooks/document.md) | 업무와 문서 중 어디에 쓸지, 독자와 팩트 시트, 문서 기준, 낡은 문서 찾기 |
| [repository.md](playbooks/repository.md) | 저장소 연결 확인, 이름 규칙, 칸 연동, 이슈 동기화, 배포 |
| [report.md](playbooks/report.md) | BIT 공개 저장소에 버그·개선 제안 올리기 |

## 참고

| 파일 | 담은 것 |
| :--- | :--- |
| [tools.md](references/tools.md) | 도구별 쓰는 때와 인자, 옛 도구 이름 |
| [writing.md](references/writing.md) | 쓰는 말, 결과 댓글의 예 |
| [document-types.md](references/document-types.md) | 제품설명서·사용자설명서·인수인계의 독자, 답할 질문, 구성 |
