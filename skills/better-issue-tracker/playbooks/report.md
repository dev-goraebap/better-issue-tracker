# BIT에 제보하기

BIT는 공개 저장소 [dev-goraebap/better-issue-tracker](https://github.com/dev-goraebap/better-issue-tracker)에서 버그와 개선 제안을 받는다. 화면, 서버·API, MCP 도구, 이 스킬, 설치·배포 모두 대상이다. 사용자 프로젝트의 업무는 BIT 업무로 남기고([업무 만들기](create.md)), BIT 자체의 문제만 여기에 올린다.

| 때 | 예 |
| :--- | :--- |
| BIT가 기대와 다르게 동작한다 | 도구가 500을 돌려준다, 도구 설명대로 불렀는데 거절된다, 화면과 MCP가 다른 값을 보인다 |
| 이 스킬대로 했는데 결과가 틀린다 | 스킬이 가리킨 도구나 인자가 없다, 스킬을 따랐더니 업무가 빠지거나 잘못 나뉜다 |
| 사용자가 제보나 제안을 부탁한다 | "BIT에 제보해줘", "이거 BIT 개선 제안으로 올려줘" |

1. **이미 있는지 찾는다.** `gh issue list --repo dev-goraebap/better-issue-tracker --search "<핵심 낱말>" --state all`. 같은 것이 있으면 새로 만들지 않고 사용자에게 그 이슈를 알린다.
2. **초안을 쓴다.** 저장소의 이슈 양식을 따른다. 버그는 어디에서·BIT 버전(화면 왼쪽 아래)·에이전트·한 일·기대한 결과·실제 결과, 개선은 어디에서·지금 불편한 점·제안을 적는다.
3. **빼고 쓴다.** 공개 저장소다. API 키·토큰·비밀번호, 사람 이름·이메일, 사용자 프로젝트의 업무 제목·본문, 사내 서버 주소는 적지 않는다. 재현에 필요하면 바꿔 쓴 예로 적는다.
4. **사용자에게 보이고 승인받는다.** 초안 전체를 보여 주고, 올려도 되는지 묻는다. 승인 없이는 올리지 않는다.
5. **올린다.** `gh issue create --repo dev-goraebap/better-issue-tracker --label bug`(개선은 `enhancement`) `--title "<제목>" --body-file <초안 파일>`. `gh`가 없거나 로그인되어 있지 않으면 https://github.com/dev-goraebap/better-issue-tracker/issues/new/choose 와 초안을 사용자에게 건넨다.
6. **남긴다.** 이 일을 하던 BIT 업무가 있으면 이슈 주소를 댓글로 남긴다.
