# 첫 계정과 로그인

빈 BIT에서 첫 관리자를 만들고, 그 계정의 이메일·비밀번호로 로그인하면 자기 워크스페이스의 홈이 열린다.

## Sub-features

- `sign-in-bootstrap` 빈 데이터에서 첫 관리자를 만든다(그 뒤로는 첫 가입이 닫힌다).
- `sign-in-password` 이메일·비밀번호로 로그인한다.
- `sign-in-home` 로그인하면 워크스페이스 홈으로 간다.

## How to get to it (user POV)

- 빈 BIT를 처음 열면 `/setup`에서 관리자를 만든다(`launch`가 같은 API로 이미 해 둔다).
- `/login`에서 `이메일`·`비밀번호`를 넣고 `로그인`을 누른다.

## Driving it with verify.mjs

Preconditions:

- 기본 준비 상태. 브라우저는 이 run의 `client`에 로그인한 적이 없다.

- **첫 계정.** `launch` 출력에 `account`가 있다. `verify db <run> "select email from iam_user" --save sign-in-bootstrap`이 한 행이다.
- **로그인 화면.** 내장 브라우저로 `client` 주소를 연다. `/login`으로 가고, `find "email"`이 placeholder `예: you@example.com`
  입력칸을, `find "비밀번호"`가 placeholder `비밀번호를 입력하세요` 입력칸을 찾는다.
- **로그인.** 두 칸에 `account.json`의 값을 `form_input`으로 넣고 `로그인` 버튼을 누른다. 주소가 `/workspaces/<id>`가 된다.
- **증거.** `get_page_text`에 `검증 워크스페이스`, `검증 관리자`, `verify-<run>@example.test`, `아직 업무가 없습니다`가
  보인다. 그 부분을 `verify note <run> sign-in-home`으로 남긴다.

## Gotchas

- `localhost:<포트>`로 열면 다른 로컬 BIT와 로그인 쿠키를 나눠 써서 서로 로그아웃시킨다. `client`의 `127.0.0.1` 주소로 연다.
- 첫 가입은 사용자가 한 명이라도 있으면 영구히 닫힌다. 다시 해 보려면 run을 정리하고 새로 띄운다.
- 창이 숨겨진 내장 브라우저는 `read_page`가 빈 결과를 낸다. 그때는 `find`·`get_page_text`를 쓴다.
