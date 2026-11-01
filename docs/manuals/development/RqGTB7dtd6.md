# 별도 BIT에서 기능을 검증하기

사용자나 다른 에이전트가 쓰는 인스턴스를 시험 데이터로 바꾸지 않습니다. 저장소의 검증 실행기는 빈 데이터와 빈 포트에 서버·화면·초기 계정·API 키를 준비합니다.

## 실행과 상태 점검

저장소 루트에서 실행합니다. `feature-check`는 예시 run 이름이며 다른 실행과 겹치지 않는 소문자·숫자·하이픈 이름을 고릅니다.

```powershell
node .agents/skills/bit-development/scripts/verify.mjs launch feature-check
node .agents/skills/bit-development/scripts/verify.mjs doctor feature-check
```

launch가 돌려준 client 주소와 전용 계정 파일을 사용합니다. 계정의 비밀번호·키는 대화나 근거 파일로 복사하지 않습니다. doctor는 프로세스·health·화면·인증과 같은 리비전인지 확인합니다. 서버 코드를 바꿨다면 Vite 갱신만 믿지 말고 새 서버로 검증합니다.

## 조작과 결과 대조

1. 필요한 선행 상태를 실제 API/MCP로 준비합니다.
2. 기능별 검증 지도에서 해당 경로와 완료 상태를 확인합니다.
3. 사람 경로는 실제 화면, 에이전트 경로는 MCP, 계약 경로는 API로 조작합니다.
4. 저장 결과를 다시 열거나 독립 조회로 확인합니다. 클릭 시도와 완료를 구분합니다.
5. `evidence/`에 동작·결과·환경·미실행 범위를 남깁니다.

화면을 볼 수 없으면 합성 화면으로 대체하지 말고 API/MCP만 확인했다고 밝힙니다. 시험 전용 내부 setter나 DB 직접 쓰기로 사용 흐름 검증을 대체하지 않습니다. DB 조회는 독립 확인에 사용할 수 있습니다.

## 정리

```powershell
node .agents/skills/bit-development/scripts/verify.mjs cleanup feature-check
```

내 run의 프로세스와 임시 데이터만 정리하고 evidence는 남깁니다. 프로세스 이름으로 다른 서버를 일괄 종료하지 않습니다. 추가로 만든 계정·토큰 파일이 있으면 함께 정리합니다.

이 책을 작성하면서 같은 실행기의 `dev-handbook` run으로 launch·doctor를 수행했습니다. 개발 매뉴얼의 표·코드·구조 다이어그램과 페이지 조회를 확인하는 데 사용하며, 운영 배포나 복구를 실행하는 경로는 아닙니다.

## 관련 아키텍처

[구조와 설계 이유](../architecture/ZgzDm1WoZn.md)를 함께 확인합니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [.agents/skills/bit-development/playbooks/verify.md](../../../.agents/skills/bit-development/playbooks/verify.md)
- [.agents/skills/bit-development/references/verify/README.md](../../../.agents/skills/bit-development/references/verify/README.md)
- [.agents/skills/bit-development/scripts/verify.mjs](../../../.agents/skills/bit-development/scripts/verify.mjs)
