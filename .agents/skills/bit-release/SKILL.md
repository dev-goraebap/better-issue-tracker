---
name: bit-release
description: BIT 배포(릴리스) 절차. 버전을 정하고 검사한 뒤 버전 파일을 맞추고, 후보 태그(v0.8.0-rc.1)로 GHCR 이미지를 만들어 확인하고, 같은 커밋에 정식 태그(v0.8.0)와 GitHub Release를 올린다. "배포해줘", "릴리스", "v0.8.0 내줘", "태그 달아줘", "RC 만들어줘", "이미지 올려줘", "새 버전 내자"라고 할 때 쓴다.
---

배포본은 태그 하나와 그 커밋으로 식별한다. 태그를 푸시하면 GitHub Actions(`.github/workflows/release.yml`)가 루트 `Dockerfile`로 이미지를 만들어 `ghcr.io/dev-goraebap/better-issue-tracker`에 올린다(D-082). 이 스킬은 태그를 달기까지와 올라간 이미지를 확인하는 일을 한다. 서버에 띄우는 일(이미지 바꾸기·되돌리기)은 `bit-architecture`의 [배포](../bit-architecture/references/deploy.md)를 따른다.

## 정할 것

| 항목 | 규칙 | 근거 |
| :--- | :--- | :--- |
| 버전 | 사용자가 준 버전을 쓴다. 안 줬으면 지난 태그와 그 뒤 커밋을 보여 주고 묻는다. 0.x 동안 기능이 들면 둘째 자리(0.8.0 → 0.9.0), 고침만이면 셋째 자리(0.8.0 → 0.8.1) | 되돌리기 어려운 외부 게시라 추측하지 않는다 |
| 태그 이름 | 후보 `v<버전>-rc.<번호>`, 정식 `v<버전>`. 정식은 마지막 후보와 같은 커밋 | `deploy.md` CI 규칙 |
| 태그 옮기기 | 하지 않는다. 후보가 실패하면 고쳐서 `rc.<번호+1>`로 다시 단다 | 이미지 태그가 언제나 커밋 하나를 가리키게 |
| 버전 파일 | 태그를 달 커밋의 `client/package.json`·`package-lock.json`·`server/build.gradle` 버전이 태그와 같아야 한다. 화면 사이드바가 이 값을 보인다 | 태그가 원본, 파일은 따라간다 |

## 절차

1. **확인한다.**
   - `main`이고 `git fetch` 뒤 `origin/main`과 같다. 다르면 멈추고 알린다.
   - 같은 태그가 없다: `git tag -l 'v<버전>*'`, `git ls-remote --tags origin`.
   - 버전 파일 세 개에 커밋하지 않은 다른 변경이 있으면 멈추고 묻는다. 버전 커밋에 남의 변경이 섞이면 안 된다(사용자의 미커밋 브랜드 파일·`sharp` 변경이 이 경우였다).
   - 포함될 커밋: `git log --oneline <지난 태그>..HEAD`(첫 배포면 전체 개수만).
2. **검사한다.** `server`에서 `./gradlew.bat check`(다른 OS는 `./gradlew check`), `client`에서 `npm run check`. 하나라도 실패하면 멈춘다.
3. **버전을 맞춘다.** `node scripts/set-version.mjs <버전>`. 파일이 바뀌었으면 그 세 파일만 스테이징해 `chore: release <버전>`으로 커밋하고 `main`을 푸시한다.
4. **후보 태그를 단다.** `git tag -a v<버전>-rc.<번호> -m "BIT <버전> rc.<번호>"` 후 `git push origin v<버전>-rc.<번호>`.
5. **이미지를 기다린다.** `gh run list --workflow release.yml --limit 1`로 실행을 찾아 `gh run watch <id> --exit-status`. 실패하면 `gh run view <id> --log-failed`로 원인을 읽고 고친 뒤 4로(번호를 올려서).
6. **후보 이미지를 확인한다.**
   - 받기: `docker pull ghcr.io/dev-goraebap/better-issue-tracker:<버전>-rc.<번호>`. 저장소가 비공개라 이미지도 비공개이고, 받으려면 `read:packages` 권한으로 `docker login ghcr.io`가 되어 있어야 한다. 거절되면 사용자에게 로그인을 부탁한다: `gh auth refresh -h github.com -s read:packages`로 권한을 더한 뒤 `gh auth token | docker login ghcr.io -u <GitHub 아이디> --password-stdin`. 토큰을 대화에 적거나 대신 입력하지 않는다.
   - 띄우기: `docker run -d --name bit-rc -p 18080:8080 -v bit-rc-data:/var/lib/bit <이미지>`.
   - 확인: `curl -fsS http://localhost:18080/api/v1/health`가 200이고, `curl -s http://localhost:18080/`에 화면 HTML이 온다.
   - 치우기: `docker rm -f bit-rc && docker volume rm bit-rc-data`.
7. **정식 태그를 단다.** 사용자가 후보 결과를 보고 정식을 원하면, 후보와 같은 커밋에 `git tag -a v<버전> -m "BIT <버전>" <후보 태그>^{}` 후 푸시하고 5를 다시 기다린다. 정식 이미지는 `<버전>`, `<주.부>`, `latest`로 올라간다.
8. **GitHub Release를 만든다.** `gh release create v<버전> --verify-tag --generate-notes --title "BIT <버전>"`. 후보는 Release를 만들지 않는다.
9. **보고한다.** 태그, 커밋 SHA, 이미지 주소와 태그들, Release 주소, 포함된 커밋 목록(또는 개수), 확인한 것과 못 한 것.

## 하지 않는 것

- 태그 지우기·옮기기, `--force` 푸시. 잘못 단 태그는 사용자에게 알리고 결정을 받는다.
- 서버에 새 이미지 띄우기. 운영 서버 교체는 `deploy.md`의 "이미지 바꾸기"를 사용자가 요청할 때 따로 한다.
- 비밀값을 커밋하거나 대화에 적기. 레지스트리 로그인은 사용자가 한다.

## 완료 기준

- `git ls-remote --tags origin`에 이번 태그가 있다.
- `git show <태그>:client/package.json`과 `git show <태그>:server/build.gradle`의 버전이 태그와 같다.
- 그 태그의 `release.yml` 실행이 성공했다(`gh run view <id>`의 결론이 success).
- 그 태그의 이미지를 받아 띄운 컨테이너의 `/api/v1/health`가 200이었다.
- 정식이면 `gh release view v<버전>`이 나온다.

결과가 틀리면 `skill-repair`로 이 스킬을 고친다.
