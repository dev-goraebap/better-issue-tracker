# REST와 MCP가 같은 규칙을 사용하게 하기

사람과 에이전트가 함께 사용할 기능의 API 또는 MCP 도구를 바꿀 때 적용합니다.

## 규칙과 이유

REST는 DTO·HTTP 응답, MCP는 도구 입력·이름 해석을 담당하고 업무 판단은 같은 Service로 보냅니다. MCP에서 REST를 다시 호출하지 않습니다. 도구 스키마의 이름·필수값·예시를 실제 구현과 맞춥니다. HTTP 계약을 바꾸면 OpenAPI와 생성 타입을 함께 갱신합니다.

## BIT 실제 코드

현재 코드 발췌: `server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualController.java` · 59행부터. 주변 선언·호출부는 원본에서 확인합니다.

```java
        String id = manualService.save(actor, workspaceId, request, true);
        return ResponseEntity.created(URI.create("/api/v1/workspaces/" + workspaceId + "/manuals/" + id))
                .build();
```

HTTP 작성은 Service가 돌려준 ID를 Location으로 반환합니다. `ManualMcpTools`의 save도 같은 `ManualService.save`를 사용하며 도구의 version 검사를 더합니다. 입력 형태가 다른 것은 허용되지만 권한·소속·저장 불변식은 갈라지면 안 됩니다.

## 피해야 할 예

아래는 실패 이유를 보여 주는 설명용 반례이며 현재 BIT 구현의 발췌가 아닙니다. 생략된 선언이 있어 그대로 실행하는 완성 코드가 아닙니다.

```java
// MCP만 저장소에 직접 쓰면 HTTP의 권한·버전 검사와 갈라짐
return manualRepository.save(uncheckedManual);
// 서버 내부 도구가 자기 REST를 HTTP로 재호출하는 것도 피함
```

## 예외와 적용 한계

MCP에 HTTP 화면의 모든 버튼을 반드시 1:1 복제하지는 않습니다. 목록 요약·맥락 묶음처럼 에이전트용 투영은 가능하지만 같은 원본 권한을 적용합니다. 현재 도구가 제공하지 않는 본문 검색/목차 인자를 문서에서 만들어 내지 않습니다.

## 검증 기준

자동: `node scripts/check-bit-skill.mjs`로 도구 안내 목록을 대조합니다. `server`에서 `.\gradlew.bat exportOpenApi`, 루트에서 `npm run api:generate --prefix client` 후 계약/타입 diff를 함께 검토합니다.

실제 경로: 같은 주체로 REST와 MCP의 성공·권한 거절·잘못된 입력을 각각 확인합니다. 목록 스키마 일치 검사는 도구 의미 전체를 검증하지 않습니다.

## 적용 절차

실제 변경은 [개발 매뉴얼의 작업 절차](../development/xlXKn4GNiy.md)로 이어 갑니다.

## 근거와 적용 기준

앱 버전은 server/build.gradle과 client/package.json 기준 0.22.0입니다. 개발 커밋은 출시 버전과 구분합니다. 근거 링크는 현재 체크아웃의 원본이며, 실제 코드 발췌는 공백을 정규화해 대조했습니다. 실행 검사 이력은 BIT-148을 따르며 이 정적 검수는 새 실행/화면 검증을 뜻하지 않습니다.

- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualController.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualController.java)
- [server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java](../../../server/src/main/java/io/github/goraebap/bit/module/manual/application/ManualMcpTools.java)
- [server/build.gradle](../../../server/build.gradle)
- [client/package.json](../../../client/package.json)

## 상세 적용 기준: 공통 01. API 계약


이 문서는 백엔드와 프론트엔드가 준수해야 하는 RESTful API 설계 원칙, HTTP 상태 코드 및 헤더 표준, 페이징과 데이터 직렬화 형식을 정의한다.

---

## 1. API 소유권 및 URL 경로 설계 원칙

백엔드 서버가 API 계약의 단일 소유자(SSOT)이며, 일관된 RESTful URL 체계를 적용한다.

- **기본 경로**: 모든 비즈니스 API는 `/api/v1` 접두사를 사용한다. MCP 엔드포인트는 `/api/mcp` 하나다(`docs/07-mcp.md`).
- **자원 명명**: URI 자원은 **복수형 명사**를 기본으로 사용한다 (예: `/api/v1/work-items`).
- **식별자 표현**: 개별 자원의 식별자는 경로 변수(Path Variable)에 ID(10자, D-083)로 전달한다 (예: `/api/v1/work-items/{workItemId}`). `BIT-42`, `D-007` 같은 사람이 읽는 참조는 MCP 도구가 받는 값이며 REST 경로 변수의 기본은 ID다.
- **상태 변경 표현**: 상태 전이나 비즈니스 액션은 임의의 RPC 동사 대신 하위 자원의 생성 또는 처리로 표현한다 (예: `/api/v1/decisions/{decisionId}/acceptances`).
- **추상화**: URL 경로에 특정 회사명이나 테넌트 식별자를 하드코딩하지 않는다.

---

## 2. HTTP 메서드 및 상태 코드 표준

HTTP 표준 상태 코드를 신뢰하며, 응답 본문에 `{ success: true, data: { ... } }`와 같은 비표준 전역 성공 래퍼를 씌우지 않는다.

| HTTP 메서드 | 성공 상태 코드 | 응답 본문 (Body) | 표준 동작 및 헤더 규약 |
| :--- | :--- | :--- | :--- |
| **GET** | `200 OK` | 자원 단건 또는 페이징 모델 | 조회 성공 시 데이터 직접 반환 |
| **POST (생성)** | `201 Created` | **빈 본문 (Empty)** | 생성된 자원의 URI를 `Location` 헤더에 담아 반환 |
| **PUT / PATCH** | `204 No Content` | **빈 본문 (Empty)** | 자원 수정 완료 시 본문 없이 응답 |
| **DELETE** | `204 No Content` | **빈 본문 (Empty)** | 자원 삭제 완료 시 본문 없이 응답 |

### 명시적 예외 규정
- **즉시 소비 정보 반환**: 파일 업로드 세션 생성 등 클라이언트가 즉시 소비해야 하는 임시 서명 URL이나 필수 전송 헤더가 있는 특수 유스케이스는 명시적 예외로 규정하고 OpenAPI 스펙에 응답 모델을 정의한다. API 키 생성 응답(키 글자를 한 번만 돌려줌)도 같은 예외다.
- **비동기 작업**: 백그라운드 장기 실행 작업 생성 시 작업 자원의 URI를 `Location` 헤더로 반환하며, 클라이언트는 해당 경로를 통해 작업 상태를 조회한다.

---

## 3. 클라이언트 통신 및 타입 계약 동기화

- **HTTP 클라이언트 처리**: 브라우저 HTTP 계층은 요청 취소 시그널(`AbortSignal`), `Location` 헤더 해석, 본문 없는 응답(`204 No Content`)을 안전하게 처리해야 한다.
- **Location 경로 검증**: 응답의 `Location` 헤더를 소비할 때는 기대한 동일 출처(Same-Origin) API 경로인지 반드시 검증한 후 후속 요청을 진행한다.
- **단일 원본 동기화**: 백엔드 OpenAPI 스펙에서 자동 생성된 TypeScript 타입과 이를 소비하는 프론트엔드 코드는 동일 커밋 단위로 동기화한다. 수기(Hand-written) 인터페이스 사본을 작성하여 사용하는 것을 엄격히 금지한다.

---

## 4. 목록 조회 및 페이징 표준

데이터가 지속적으로 누적되는 자원(업무, 결정, 세션, 산출물, 활동, 알림 등)은 반드시 서버 사이드 검색, 정렬, 페이징을 적용한다.

### 커서 목록 응답
누적되는 목록은 앞 조각이 끝난 곳에서 다음 조각을 읽는 커서 방식으로 조회한다. 요청은 검색·필터 조건과 `sort`·`direction`·`cursor`·`size`를 쿼리로 받고, 응답은 다음 모양이다.
```json
{
  "items": [ ... ],
  "nextCursor": "불투명한 문자열 또는 없음"
}
```
- **정렬 방향**: 정렬을 고를 수 있는 목록은 `sort` 옆에 `direction`(`ASC`·`DESC`)을 받는다. 생략하면 그 목록의 평소 방향(대부분의 목록은 최신순)으로 읽는다.
- **목록 필터 값**: 여러 값을 받는 필터(`status`, `labelId`, `priority`, `triggerType` 등)는 쉼표 목록이나 반복 파라미터로 받고, 그중 하나라도 맞으면 남긴다. 빈 항목(`?labelId=<id>,`)과 중복은 버리며 오류로 보지 않는다(shared/web의 `ListParams`).
- **커서 내용**: 커서는 정렬 이름과 마지막 행의 정렬 값·고유 ID를 담은 문자열이며 클라이언트는 해석하지 않고 그대로 돌려보낸다. 정렬 이름은 `기준_방향`(예: `TITLE_DESC`)이므로 다른 기준이나 방향에서 받은 커서는 `COMMON_INVALID_REQUEST`로 거절된다. 서버는 `size`보다 한 건 더 읽어 다음 행이 있을 때만 `nextCursor`를 준다.
- **정렬과 인덱스**: 정렬 옵션마다 (정렬 값, 고유 ID) 순서의 인덱스를 두고, 다음 조각은 그 행 값 비교로 고른다. 인덱스로 받칠 수 없는 열에는 정렬을 열지 않는다.
- **잘못된 커서**: 다른 정렬에서 만든 커서나 해석되지 않는 커서는 `COMMON_INVALID_REQUEST`(400)로 거절하고, 화면은 목록을 처음부터 다시 읽는다.
- **건수**: 커서 목록은 전체 건수를 돌려주지 않는다. 건수가 판단에 필요한 목록만 별도 조회로 세거나, 조각마다 `total`을 함께 준다.
- **여러 키 정렬**: 정렬 키가 여럿이거나 방향이 섞이면 키 필드 목록(고유 ID로 끝남)을 jOOQ `seek`에 넘겨 다음 조각을 고른다(shared/web의 `Keyset`). 비어 있을 수 있는 키는 그 정렬에서 비어 있는 행이 놓일 끝값으로 바꿔(`coalesce`) 비교한다.
- **정렬 안정성(Deterministic Ordering)**: 모든 정렬은 고유 ID를 마지막 기준으로 포함한다. 같은 정렬 값의 행이 조각 경계에서 겹치거나 빠지지 않게 하는 조건이다.

> [!NOTE]
> 쪽 번호 방식(`{items, total, page, size}`)은 쓰지 않는다. 새 목록은 처음부터 커서 방식으로 만든다.

- **배열 직접 반환 제한**: 페이징이 필요 없는 단순 공통 코드 목록이나 옵션성 데이터(예: 프로젝트의 보드 컬럼, 워크스페이스 라벨)에 한해서만 순수 JSON 배열(`[...]`) 반환을 허용한다.

---

## 5. 데이터 타입 및 직렬화 표준

| 데이터 분류 | 표현 표준 | 예시 및 규칙 |
| :--- | :--- | :--- |
| **고유 식별자** | 10자 ID 문자열(첫 글자 영문, 대소문자 구분) | `"aB3dE6gH9j"` |
| **날짜 (Date)** | ISO 8601 Date | `YYYY-MM-DD` (예: `"2026-09-18"`) |
| **로컬 시각** | ISO 8601 Local | 시간대 오프셋 없는 ISO 형식 (예: `"2026-09-18T09:00:00"`) |
| **절대 시각 (Timestamp)** | UTC ISO 8601 | UTC 기준 Z 접미사 필수 (예: `"2026-09-18T00:00:00Z"`) |

- **업무 기준 시간대**: 날짜만 있는 값과 순간 값을 구분한다. 시각 입력은 사용자 환경의 시간대로 표시하고 반복 요청은 timeZone을 명시한다. client/src/entities/work-item/model/work-item.ts와 WorkItemRequests.Repeat의 계약을 따른다.
- **미지정 필드 직렬화**: 응답 데이터에서 값이 비어 있는 필드는 키 자체를 생략하지 않고 `null`로 명시하여 클라이언트 직렬화 모호성을 없앤다.
- **PATCH 수정 정책**: `PATCH` 요청 DTO에서는 '필드 생략(기존 값 유지)'과 '`null` 전송(기존 값 제거/초기화)'의 비즈니스적 의미 차이를 명확히 정의하여 처리한다.

---

## 6. 켜진 기능 알림 (D-030)

메일(SMTP), Git 연동처럼 외부 설정에 기대는 기능은 설정이 없거나 연결되지 않으면 그 기능만 꺼지고 서버는 정상 실행된다.

- **서버**: 켜진 기능 목록을 API로 알려 준다(Kaneo `hasImageUploads`와 같은 방식). 파일 저장소(로컬 어댑터 내장, D-029)와 문서 텍스트 변환·서버 PDF 생성은 현재 SystemController가 false로 응답한다. 브라우저 인쇄 PDF는 이 capability와 별개다. 값은 현재 사용 가능한 상태다.
- **화면**: 그 값을 보고 꺼진 기능의 버튼과 입력을 숨긴다. 숨김은 사용자 경험용이며, 꺼진 기능의 API는 서버가 거절한다.
- **MCP**: 꺼진 기능을 부르는 도구는 꺼진 이유를 오류로 돌려준다.
- **목록 API**: `GET /api/v1/capabilities`. 로그인 전에도 공개한다(로그인 화면이 이메일 OTP가 켜졌는지 알아야 한다). 응답은
  `{ "mail": bool, "gitIntegration": bool, "objectStorage": bool, "documentConversion": bool, "pdf": bool, "fileMaxBytes": number }`. 기능을 더하면 키를 더한다.
- **거절**: 꺼진 기능을 부르면 503과 `code: <MODULE>_NOT_CONFIGURED`(예: `MAIL_NOT_CONFIGURED`). Kaneo도 업로드 미설정에 503을 쓴다.
