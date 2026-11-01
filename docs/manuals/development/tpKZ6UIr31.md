# 운영 배포와 되돌리기

현재 BIT 운영은 서버의 `~/apps/bit/compose.yml`이 실행 설정의 기준입니다. 저장소 deploy 예시나 오래된 수동 스크립트로 운영 구성을 바꾸지 않습니다.

## 실제 대상 확인

| 항목 | 현재 운영 지침 |
| --- | --- |
| 작업 디렉터리 | `~/apps/bit` |
| Compose 프로젝트·서비스 | `bit-prod` / `app` |
| 컨테이너 | `bit` |
| 데이터 | 외부 볼륨 `bit-data` → `/var/lib/bit` |
| 설정 | 같은 디렉터리의 `app.env`, 비밀값 출력 금지 |
| 프록시 | 기존 외부 네트워크·컨테이너 이름 유지 |
| 백업 | 같은 디렉터리 `backups/`, 배포 사본 보존 정책 확인 |

위 값은 `docs/deployment.md`에 기록된 BIT 운영 대상입니다. 다른 제품의 기본값이 아니며 실행 직전에 실제 서버 설정과 대조합니다. 운영 계정·접속 비밀은 이 책에 보관하지 않습니다.

## 교체 순서

1. 승인된 정식 이미지가 운영 호스트에 준비되었는지 확인합니다. 전송했다면 해시와 이미지 revision도 확인합니다.
2. 현재 이미지·compose·데이터 볼륨과 복구 정보를 확인합니다.
3. 앱을 멈추고 DB·WAL·첨부·`secrets.properties`를 포함한 전체 사본을 만듭니다. UID/GID를 보존하고 사본 무결성을 확인합니다.
4. compose의 이미지 버전을 영구 저장하고 설정 해석 결과가 대상 이미지인지 확인합니다.
5. 같은 compose의 app을 교체하고 healthy·공개 health·화면 버전·기존 인증/업무/데이터 보존을 확인합니다.
6. 결과를 기록하고 복구 가능한 직전 이미지·사본·설정을 보존합니다.

예시 읽기 전용 확인 명령은 **운영 호스트의 POSIX 셸**, `~/apps/bit`에서 실행합니다.

```sh
/snap/bin/docker compose -f compose.yml config --quiet
/snap/bin/docker compose -f compose.yml ps
```

전체 명령과 백업 검사는 `docs/deployment.md`를 따릅니다. 비밀값을 포함할 수 있는 compose 전체 출력이나 env 파일을 업무에 붙여 넣지 않습니다. 백업 실패 시 교체를 진행하지 않습니다.

## 실패 시 복구

새 앱을 멈추고 **되돌릴 버전 직전의 전체 볼륨 사본**과 당시 compose·이미지를 함께 복원합니다. 새 스키마 DB에 옛 이미지 태그만 연결하면 호환되지 않을 수 있습니다. 복구 후에도 health·DB 무결성·인증·기존 자료를 다시 확인합니다. health 실패만으로 데이터와 이미지를 자동으로 바꾸는 동작을 추가하지 않습니다.

이 페이지는 현행 지침과 저장소 설정을 대조한 절차입니다. 이번 매뉴얼 작성에서 운영 중지·백업·교체·복원은 실행하지 않았습니다.

## 관련 아키텍처

[구조와 설계 이유](../architecture/L6HuRcXuVj.md)를 함께 확인합니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [docs/deployment.md](../../deployment.md)
- [.agents/skills/bit-development/playbooks/release.md](../../../.agents/skills/bit-development/playbooks/release.md)
- 현재 지침 원본: `.agents/skills/bit-development/references/architecture/deploy.md`

## 저장소 조작 절차

# 배포(릴리스)

배포본은 태그 하나와 그 커밋으로 식별한다. 태그를 푸시하면 GitHub Actions(`.github/workflows/release.yml`)가 루트 `Dockerfile`로 이미지를 만들어 `ghcr.io/dev-goraebap/better-issue-tracker`에 올린다(D-082). 이 플레이북은 태그를 달기까지와 올라간 이미지를 확인하는 일을 한다. 서버에 띄우는 일(이미지 바꾸기·되돌리기)은 [배포](tpKZ6UIr31.md)를 따른다.

운영 서버 배포까지 요청받았으면 정식 이미지 검증 뒤 [운영 서버 배포](../../deployment.md)를 이어 수행한다. **서버의 `~/apps/bit/compose.yml`이 운영 실행 설정의 기준**이다. 같은 디렉터리의 `app.env`·`backups/`를 사용하고, 기존 외부 볼륨·프록시 네트워크를 보존한다. 다른 경로의 compose나 옛 `.local/home-deploy/deploy.sh`로 교체하지 않는다.

## 배포 준비만 요청받았을 때

버전을 확인하고 스킬·문서 정합성, 전체 검사, 버전 파일, 로컬 운영 이미지 빌드와 격리 실행까지 준비한다. 준비는 작업 브랜치에서 할 수 있다. 태그 push·이미지 게시·GitHub Release·운영 교체는 준비 완료와 구분하며, 사용자가 해당 실행을 요청한 뒤 아래 정식 절차를 따른다. 준비 중 승인된 수정·버전 파일은 검증 후 커밋해 검토할 정확한 SHA를 제공한다.

개발 서버에서만 동작하는 기능을 릴리스 완료 항목에 넣지 않는다. 매뉴얼은 BIT-144의 서버 저장·권한·API/MCP로 동작한다. 운영 빌드에서 메뉴·라우트와 실제 저장·다른 세션 조회·이미지 원본·충돌 거절을 검증한다. 브라우저에 남은 옛 미리보기 자료를 자동 게시하지 않는다. 마이그레이션이 있으면 격리한 직전 버전 데이터로 업그레이드·무결성·식별자 보존을 확인하고 운영 데이터는 준비 단계에서 바꾸지 않는다.

## 정할 것

| 항목 | 규칙 | 근거 |
| :--- | :--- | :--- |
| 버전 | 사용자가 준 버전을 쓴다. 안 줬으면 지난 태그와 그 뒤 커밋을 보여 주고 묻는다. 0.x 동안 기능이 들면 둘째 자리(0.8.0 → 0.9.0), 고침만이면 셋째 자리(0.8.0 → 0.8.1) | 되돌리기 어려운 외부 게시라 추측하지 않는다 |
| 태그 이름 | 후보 `v<버전>-rc.<번호>`, 정식 `v<버전>`. 정식은 마지막 후보와 같은 커밋 | `deploy.md` CI 규칙 |
| 태그 옮기기 | 하지 않는다. 후보가 실패하면 고쳐서 `rc.<번호+1>`로 다시 단다 | 이미지 태그가 언제나 커밋 하나를 가리키게 |
| 버전 파일 | 태그를 달 커밋의 `client/package.json`·`package-lock.json`·`server/build.gradle` 버전이 태그와 같아야 한다. 화면 사이드바가 이 값을 보인다 | 태그가 원본, 파일은 따라간다 |

## 절차

1. **확인한다.**
   - `main`이고 `git fetch` 뒤 `origin/main`이 앞서 있지 않다(`git rev-list --count HEAD..origin/main`이 0). 앞서 있으면 멈추고 알린다. 아직 올리지 않은 로컬 커밋은 괜찮다. 3단계에서 함께 올라간다.
   - 같은 태그가 없다: `git tag -l 'v<버전>*'`, `git ls-remote --tags origin`.
   - 버전 파일 세 개에 커밋하지 않은 다른 변경이 있으면 멈추고 묻는다. 버전 커밋에 남의 변경이 섞이면 안 된다(기능 수정과 버전 변경이 같은 파일에 섞일 수 있다).
   - 포함될 커밋: `git log --oneline <지난 태그>..HEAD`(첫 배포면 전체 개수만).
2. **검사한다.** `server`에서 `./gradlew.bat check`(다른 OS는 `./gradlew check`), `client`에서 `npm run check`. 하나라도 실패하면 멈춘다.
3. **버전을 맞춘다.** `node scripts/set-version.mjs <버전>`. 파일이 바뀌었으면 그 세 파일만 스테이징해 `chore: release <버전>`으로 커밋하고 `main`을 푸시한다.
4. **후보 태그를 단다.** `git tag -a v<버전>-rc.<번호> -m "BIT <버전> rc.<번호>"` 후 `git push origin v<버전>-rc.<번호>`.
5. **이미지를 기다린다.** `gh run list --workflow release.yml --limit 1`로 실행을 찾아 `gh run watch <id> --exit-status`. 실패하면 `gh run view <id> --log-failed`로 원인을 읽고 고친 뒤 4로(번호를 올려서).
6. **후보 이미지를 확인한다.**
   - 받기: `docker pull ghcr.io/dev-goraebap/better-issue-tracker:<버전>-rc.<번호>`. 저장소가 비공개라 이미지도 비공개이고, 받으려면 `read:packages` 권한으로 `docker login ghcr.io`가 되어 있어야 한다. 거절되면 사용자에게 로그인을 부탁한다: `gh auth refresh -h github.com -s read:packages`로 권한을 더한 뒤 `gh auth token | docker login ghcr.io -u <GitHub 아이디> --password-stdin`. 토큰을 대화에 적거나 대신 입력하지 않는다.
   - 받기가 403이면 `gh auth status`의 scopes에 `read:packages`가 있는지 본다. `docker login`은 권한을 따지지 않아 권한이 없어도 `Login Succeeded`가 나온다. 없으면 `gh auth refresh`부터, 있는데도 403이면 Docker에 옛 토큰이 남은 것이라 `docker login`을 다시 부탁한다.
   - 띄우기: `docker run -d --name bit-rc -p 18080:8080 -v bit-rc-data:/var/lib/bit <이미지>`.
   - 확인: `curl -fsS http://localhost:18080/api/v1/health`가 200이고, `curl -s http://localhost:18080/`에 화면 HTML이 온다.
   - 치우기: `docker rm -f bit-rc && docker volume rm bit-rc-data`.
7. **정식 태그를 단다.** 사용자가 후보 결과를 보고 정식을 원하면, 후보와 같은 커밋에 `git tag -a v<버전> -m "BIT <버전>" <후보 태그>^{}` 후 푸시하고 5를 다시 기다린다. 정식 이미지는 `<버전>`, `<주.부>`, `latest`로 올라간다.
8. **GitHub Release를 만든다.** `gh release create v<버전> --verify-tag --generate-notes --title "BIT <버전>"`. 후보는 Release를 만들지 않는다.
9. **보고한다.** 태그, 커밋 SHA, 이미지 주소와 태그들, Release 주소, 포함된 커밋 목록(또는 개수), 확인한 것과 못 한 것. 정식이면 실린 BIT 업무나 에픽에 버전을 댓글로 남긴다.
10. **운영 배포가 포함됐으면 이어 수행한다.** `~/apps/bit/compose.yml`을 읽고 이미지 준비 → 중지·전체 볼륨 백업 → compose에 새 이미지 버전 저장·교체 → health·공개 주소·데이터 보존 검증 순서로 진행한다. 구체적인 명령과 복구 순서는 [운영 서버 배포](../../deployment.md)를 따른다. 이미지 게시만으로 운영 배포 완료라고 보고하지 않는다.

## 하지 않는 것

- 배포 업무 만들기. 태그와 Release가 배포의 기록이다(D-114).
- 태그 지우기·옮기기, `--force` 푸시. 잘못 단 태그는 사용자에게 알리고 결정을 받는다.
- 이미지 게시 요청만으로 운영 서버를 교체하지 않는다. 운영 배포까지 요청받았으면 [운영 서버 지침](../../deployment.md)을 이어 수행한다.
- 비밀값을 커밋하거나 대화에 적기. 레지스트리 로그인은 사용자가 한다.

## 완료 기준

- `git ls-remote --tags origin`에 이번 태그가 있다.
- `git show <태그>:client/package.json`과 `git show <태그>:server/build.gradle`의 버전이 태그와 같다.
- 그 태그의 `release.yml` 실행이 성공했다(`gh run view <id>`의 결론이 success).
- 그 태그의 이미지를 받아 띄운 컨테이너의 `/api/v1/health`가 200이었다.
- 정식이면 `gh release view v<버전>`이 나온다.
- 운영 배포를 요청받았으면 `~/apps/bit/compose.yml`에 다음 실행에도 유지될 이미지 버전이 저장됐고, 해당 compose의 `app`이 healthy이며 공개 주소와 기존 데이터 보존을 확인했다.
