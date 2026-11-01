# API 요청과 실패 회복 연결하기

화면에 조회·저장 요청과 실패 후의 회복 동작을 연결합니다.

## 시작 전 확인

현재 공용 HTTP 함수와 Query 옵션, 저장 후 갱신할 캐시를 찾습니다. 취소·401·CSRF·네트워크 실패·저장 후 읽기 실패의 예상 결과를 정합니다.

설계 기준과 실제 코드 예는 [횡단 관심사 — HTTP·취소·재시도·오류 수명](../architecture/NnbZ5SNWxA.md)에서 확인합니다. 이 페이지는 작업 순서와 결과 확인을 다룹니다.

## 작업 순서

1. 횡단 관심사의 HTTP·재시도·캐시 수명 기준과 실제 readJson을 읽습니다.
2. 공용 요청 경로를 사용해 signal·입력·응답 타입을 연결합니다.
3. 성공 뒤 갱신과 실패 안내·초안 보존을 구현합니다.
4. 클라이언트 테스트를 실행합니다.

저장소 루트:

```powershell
npm test --prefix client
```

5. 실제 요청 취소·세션 만료·네트워크 실패·후속 읽기 실패를 확인합니다.

### 매뉴얼 저장 경로의 회귀 확인 — BIT-149 개발 변경

적용 리비전 `37fafd454b01781dd06317cf01c14e965f5f4689`의 개발 절차입니다. 운영은 아직 v0.22.0 동작을 사용합니다.

1. `save-manual.ts`와 `ManualWorkspace`의 저장/갱신 연결을 확인합니다. 판정 기준과 실제 코드는 연결된 횡단 관심사를 따릅니다.
2. `client` 디렉터리에서 아래 회귀 검사를 실행합니다.

```powershell
node --import tsx --test tests/manual-save.test.ts
```

3. 격리 BIT에서 정상 저장·쓰기 거절·저장 뒤 상세 또는 목록 읽기 실패를 각각 확인합니다. 읽기 실패는 시험 전용 네트워크 제어로 주입하고 운영 서버를 조작하지 않습니다.
4. 브라우저에서 저장 완료/최신 조회 실패 안내를 확인한 뒤 ‘최신 내용 불러오기’를 누릅니다.
5. 요청 기록의 쓰기 횟수와 별도 API/MCP 조회의 본문을 확인하고, 읽기 회복 뒤 화면의 본문과 대조합니다.

## 완료 확인

중복 쓰기가 없고 저장 결과와 후속 읽기 상태를 구분해 안내하는지 확인합니다. 기존 데이터·초안·로그아웃 캐시 처리도 대조합니다.

## 막히면

응답이 끊겨 저장 여부를 모르면 같은 쓰기를 바로 다시 보내지 않습니다. 현재 서버 결과를 확인하고 안전한 회복 경로를 선택합니다. 기존 구현의 한계는 설계 기준과 분리해 기록합니다.

[검사 실행](AQygip0Rv4.md) · [격리된 BIT에서 검증](RqGTB7dtd6.md)

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [client/src/shared/api/http.ts](../../../client/src/shared/api/http.ts)
- [client/src/app/model/query-client.ts](../../../client/src/app/model/query-client.ts)
- [client/src/pages/project/manuals/ui/ManualWorkspace.tsx](../../../client/src/pages/project/manuals/ui/ManualWorkspace.tsx)

- BIT-149 개발 변경 원본: `client/src/pages/project/manuals/api/save-manual.ts`, `client/src/pages/project/manuals/ui/ManualWorkspace.tsx`, `client/tests/manual-save.test.ts`
- 저장 결과 구분 구현과 회귀 기준은 [HTTP 설계·검증 기준](../architecture/NnbZ5SNWxA.md)을 따른다. 실행/화면 증거는 BIT-149에 있으며 미배포 변경과 운영 동작을 구분한다.
