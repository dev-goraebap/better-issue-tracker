# HTTP·취소·재시도·오류 수명

조회와 저장 요청을 연결하는 화면 또는 API 함수를 작성할 때 적용합니다.

## 규칙과 이유

공용 readJson/command를 사용해 쿠키·CSRF·오류 변환을 공유합니다. 조회 signal을 fetch까지 전달하고 사용자 변경 요청을 네트워크 실패 때 무조건 재전송하지 않습니다. 저장 성공 후 후속 재조회 실패를 저장 실패로 오해하게 하지 않습니다.

## BIT 실제 코드

현재 코드 발췌: `client/src/shared/api/http.ts` · 30행부터. 주변 선언·호출부는 원본에서 확인합니다.

```ts
export async function readJson<T>(path: string, signal?: AbortSignal, quietUnauthorized = false): Promise<T> {
  const response = await fetch(path, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (!response.ok) return failure(response, quietUnauthorized);
  return response.json() as Promise<T>;
}
```

공용 읽기는 AbortSignal과 동일 출처 쿠키를 전달하고 실패 응답을 공용 예외로 바꿉니다. command의 한 차례 재전송은 명시적 CSRF 거절에 한정됩니다. 전역 mutation retry도 false입니다.

### 매뉴얼의 저장 결과와 갱신 결과 분리 — BIT-149 개발 변경

적용 리비전은 `e8e03bb`이며 0.23.0에 운영 반영됐습니다. 아래 반환값 명칭은 BIT-149 후속 커밋을 반영했습니다. `client/src/pages/project/manuals/api/save-manual.ts`의 현재 코드에서 발췌했습니다.

```ts
  await storeManual(workspaceId, projectId, complete);
  try {
    const saved = await readManual(workspaceId, complete.id);
    await publish(saved);
    return 'refreshed';
  } catch {
    return 'saved-with-refresh-error';
  }
}
```

쓰기 응답을 확인한 뒤에만 후속 갱신 실패를 `saved-with-refresh-error`로 반환합니다. 쓰기 자체의 거절·통신 실패와 사전 버전 검사는 바깥으로 전달되며, 성공했다고 추정하지 않습니다. `ManualWorkspace`는 `saved-with-refresh-error`를 저장 완료와 최신 조회 실패로 안내하고 ‘최신 내용 불러오기’에서 읽기만 수행합니다. 서버에 반영된 초안은 읽기 회복 후 확인합니다. 목록 갱신도 실패를 감지하도록 `throwOnError`를 사용합니다.

## 피해야 할 예

아래는 실패 이유를 보여 주는 설명용 반례이며 현재 BIT 구현의 발췌가 아닙니다. 생략된 선언이 있어 그대로 실행하는 완성 코드가 아닙니다.

```ts
try { await fetch(url, { method: "POST", body }); }
catch { await fetch(url, { method: "POST", body }); }
// 서버가 첫 요청을 반영했는지 몰라 중복 작성 위험
```

## 예외와 적용 한계

서버가 멱등성을 명시적으로 보장하는 별도 계약은 그 조건대로 판단합니다. 상세/한 조각 목록의 invalidateQueries와 여러 조각 목록의 changeRows/startListsOver 정책은 서로 다릅니다. v0.22.0의 매뉴얼 save는 후속 재조회까지 하나의 catch로 처리했습니다. BIT-149 변경은 이를 분리했으며 0.23.0부터 운영에 반영됐습니다.

## 검증 기준

자동: `npm test --prefix client`의 http/auth-http/route-read 테스트를 확인합니다. BIT-149 개발 변경은 `client/tests/manual-save.test.ts`에서 정상 저장, 저장 뒤 상세 읽기 실패, 목록 갱신 실패, 쓰기 충돌, 요약 버전 충돌을 확인합니다. 실패한 후속 읽기 때문에 쓰기를 재전송하지 않는지도 검사합니다.

BIT-149 후속 회귀 보완(`2e63469`·0.23.0 반영)은 요약 저장 전 상세 조회 실패의 오류 전달과 쓰기/갱신 미실행, PUT 통신 오류의 오류 전달과 재전송/성공 추정 금지, 동일 버전 요약 저장의 최신 섹션·본문·댓글 보존 및 제목·설명·아이콘·색 반영도 검사합니다. 기존 5개와 함께 총 8개이며 제품 함수의 동작 변경은 없습니다.

수동/네트워크: 요청 취소·세션 만료·명시적 CSRF 실패·네트워크 끊김·저장 후 읽기 실패에서 중복 쓰기·초안 손실·잘못된 성공/실패 안내가 없는지 확인합니다.

## 적용 절차

실제 변경은 [개발 매뉴얼의 작업 절차](../development/Mz8JeOVDcL.md)로 이어 갑니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [client/src/shared/api/http.ts](../../../client/src/shared/api/http.ts)
- [client/src/app/model/query-client.ts](../../../client/src/app/model/query-client.ts)
- [client/src/pages/project/manuals/ui/ManualWorkspace.tsx](../../../client/src/pages/project/manuals/ui/ManualWorkspace.tsx)

- BIT-149 개발 변경 원본: `client/src/pages/project/manuals/api/save-manual.ts`, `client/src/pages/project/manuals/ui/ManualWorkspace.tsx`, `client/tests/manual-save.test.ts`
- 개발 변경 기준: `e8e03bb` (0.23.0 반영). 실행/화면 증거: BIT-149.
