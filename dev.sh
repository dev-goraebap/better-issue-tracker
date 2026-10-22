#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
usage='사용법: sh dev.sh [all|server|client]'
mode=${1:-all}
if [ "$#" -gt 1 ]; then
  echo "$usage" >&2
  exit 2
fi

gradle_args='bootRun --console=plain --args=--spring.profiles.active=dev'
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*) gradle='.\gradlew.bat' ;;
  *) gradle='sh ./gradlew' ;;
esac

prepare_client() {
  if [ ! -d "$root/client/node_modules" ]; then
    echo 'client에서 npm ci를 먼저 실행하세요.' >&2
    exit 1
  fi
}

case "$mode" in
  server)
    cd "$root/server"
    exec sh ./gradlew $gradle_args
    ;;
  client)
    prepare_client
    cd "$root/client"
    exec npm run dev
    ;;
  all)
    prepare_client
    cd "$root/client"
    exec npx --yes concurrently@10.0.5 -k -n server,client -c blue,green \
      "cd ../server && $gradle $gradle_args" 'npm run dev'
    ;;
  *)
    echo "$usage" >&2
    exit 2
    ;;
esac
