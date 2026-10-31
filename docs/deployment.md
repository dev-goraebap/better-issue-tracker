# 운영 서버 배포

이 저장소의 운영 서버는 **`~/apps/bit/compose.yml`을 기준으로 배포한다.** 0.9.0부터 적용한 구성이다(BIT-55, BIT-56). 태그·이미지 게시 절차는 [배포(릴리스)](../.agents/skills/bit-repository-skills/playbooks/release.md), 공통 백업·복구 원칙은 [배포와 운영](../.agents/skills/bit-repository-skills/references/architecture/deploy.md)을 따른다.

## 운영 구성

| 항목 | 값 |
| :--- | :--- |
| 작업 디렉터리 | 서버의 `~/apps/bit` |
| Compose | `compose.yml`, 프로젝트 `bit-prod`, 서비스 `app` |
| 컨테이너 | `bit` |
| 이미지 | `ghcr.io/dev-goraebap/better-issue-tracker:<정식 버전>` |
| 환경 설정 | 같은 디렉터리의 `app.env` (`env_file: ./app.env`, 권한 600) |
| 데이터 | 외부 볼륨 `bit-data` → `/var/lib/bit` |
| 프록시 | 외부 네트워크 `my-network`, nginx가 `bit:8080`으로 연결, 호스트 포트 공개 없음 |
| 실행 제한 | 메모리 1GB, 재시작 `unless-stopped`, 로그 10MB × 3개 |
| 백업 | `~/apps/bit/backups/`, 최근 배포 사본 5개 |
| Docker | `/snap/bin/docker` (비대화 SSH의 PATH에 없을 수 있음) |
| 공개 주소 | `https://bit.goraebap.xyz` |

서버의 기존 compose와 `app.env`를 읽고 필요한 이미지 버전만 바꾼다. 외부 볼륨·네트워크 이름과 컨테이너 이름을 유지한다. `~/PROJECTS/better-issue-tracker`에 별도 운영 compose를 만들거나 `.local/home-deploy/deploy.sh`로 컨테이너를 다시 만들지 않는다. 저장소 `deploy/`의 파일은 다른 환경을 위한 예시다.

## 배포 순서

1. **릴리스와 이미지를 준비한다.** 후보 이미지 검증과 정식 태그의 Actions 성공을 확인한다. 새 정식 이미지를 운영 호스트에 먼저 받는다. 서버에 GHCR 인증이 없으면 로그인된 로컬에서 `docker save -o`로 저장하고 SSH 파일 전송 후 서버에서 `docker load -i`로 가져올 수 있다. 토큰을 서버에 복사하지 않는다. 전송 파일의 SHA-256과 이미지의 `org.opencontainers.image.revision`이 대상 릴리스 커밋과 맞는지 확인한다.
2. **기존 설정과 복구 정보를 확인한다.** `~/apps/bit`에서 다음 검사를 한다. 현재 컨테이너의 이미지 ID·태그, compose, 환경 설정은 권한을 제한한 백업 디렉터리에 보관한다. 설정의 비밀값을 로그나 업무 댓글에 출력하지 않는다.

   ```bash
   cd ~/apps/bit
   D=/snap/bin/docker
   $D compose -f compose.yml config --quiet
   $D inspect bit --format '{{.Config.Image}} {{.Image}}'
   $D volume inspect bit-data
   $D network inspect my-network
   ```

3. **중지하고 전체 데이터를 백업한다.** `$D compose -f compose.yml stop app`으로 기존 앱을 멈춘 뒤 볼륨 전체를 `backups/<UTC 시각>-before-<새 버전>/data/`에 복사한다. DB·WAL·첨부파일·`secrets.properties`를 함께 보존하고 UID/GID도 유지한다. 백업 디렉터리는 권한 700으로 둔다. Litestream을 추가했다면 함께 멈추고 공통 배포 지침을 따른다. 사본의 SQLite `PRAGMA integrity_check`가 `ok`이고 `PRAGMA foreign_key_check` 결과가 비었는지 확인한다. 백업이 실패하면 기존 앱을 다시 시작하고 교체를 중단한다.
4. **버전을 저장하고 compose로 교체한다.** `compose.yml`의 이미지 기본 태그를 새 정식 버전으로 수정한다. 현재 형식 `${BIT_IMAGE:-ghcr.io/dev-goraebap/better-issue-tracker:<버전>}`의 기본값을 바꾸며, 셸의 일회성 `BIT_IMAGE` 지정만으로 배포를 끝내지 않는다. `BIT_IMAGE`를 별도로 설정한 환경에서는 실제 해석된 이미지도 확인한다.

   ```bash
   $D compose -f compose.yml config --quiet
   $D compose -f compose.yml config --images
   # 대상 이미지가 이미 서버에 있어야 한다.
   $D compose -f compose.yml up -d --pull never --wait --wait-timeout 180 app
   $D compose -f compose.yml ps
   ```

5. **검증한다.** 컨테이너 `healthy`, 실제 도메인의 `/api/v1/health` 200 `UP`, `/`의 화면 HTML과 화면 버전을 확인한다. 마이그레이션 성공·DB 무결성·기존 사용자/프로젝트/업무 등의 식별자 보존도 확인한다. 기존 MCP API 키로 인증과 업무 조회를 확인하고, MCP 도구 이름이 바뀐 릴리스면 클라이언트를 재연결해 목록을 갱신한다. 실패하면 로그를 보관하고 아래 복구 순서를 따른다.
6. **기록하고 정리한다.** 릴리스 태그·커밋·이미지·백업 위치·검증 결과를 업무에 남긴다. 복구에 필요한 직전 이미지와 설정을 유지한다. 검증 후 경로와 내용을 확인한 배포 사본만 정리해 최근 5개를 남긴다. 전송용 이미지 파일도 제거한다.

## 되돌리기

1. `~/apps/bit`에서 `/snap/bin/docker compose -f compose.yml stop app`으로 새 앱을 멈춘다. Litestream이 있다면 함께 멈춘다.
2. 선택한 사본이 **되돌릴 버전 직전의 전체 볼륨 사본**인지 확인한다. `bit-data`의 마운트와 사본의 절대 경로를 확인한 뒤 볼륨 내용을 사본으로 복원하고 UID/GID를 유지한다. 새 마이그레이션이 적용된 DB에 옛 이미지만 연결하지 않는다.
3. 백업한 compose의 옛 이미지 태그를 `compose.yml`에 복원하고 설정을 검증한다. 옛 이미지가 서버에 있는지 확인한 뒤 같은 `compose up` 명령으로 시작한다.
4. 컨테이너 health·공개 주소·DB 무결성·기존 데이터와 인증을 다시 확인하고 결과를 업무에 남긴다. health 실패 시 자동으로 데이터나 이미지를 되돌리지 않는다.
