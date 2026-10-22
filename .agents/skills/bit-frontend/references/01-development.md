---
title: 프론트엔드 01. 개발 환경
description: 클라이언트 기술 스택, 빌드·검증 파이프라인과 번들 정책. 클라이언트를 빌드하거나 검사할 때 읽는다.
---

이 문서는 프론트엔드 애플리케이션의 개발 환경 구성, 기술 스택 기준, 빌드 및 검증 파이프라인, 네트워크 및 번들 최적화 정책을 정의한다.

---

## 1. 기술 스택 및 프로젝트 구조

프론트엔드는 저장소의 `client/` 단일 애플리케이션(npm 패키지 `bit-client`)으로 구성되며, 엄격한 타입 안정성과 컴포넌트 기반 아키텍처를 지향한다. 버전 기준은 `docs/conventions.md` 1절이다.

| 분류 | 기술 / 라이브러리 | 역할 및 비고 |
| :--- | :--- | :--- |
| **Framework & UI** | React, TypeScript | 컴포넌트 기반 UI 개발 및 정적 타입 시스템 |
| **Build Tool** | Vite | 고속 번들링 및 개발 서버 환경 제공 |
| **Routing** | TanStack Router | 타입 세이프(Type-safe) 클라이언트 사이드 라우팅 |
| **Data Fetching** | TanStack Query | 서버 상태 캐싱, 동기화 및 비동기 수명주기 관리 |
| **Design System** | Astryx (`@astryxdesign/core`, `theme-stone`, `cli`) | 공통 컴포넌트 라이브러리 및 토큰 시스템 |

전역 상태 라이브러리는 두지 않는다. 상태는 Query·Router·로컬 state로 나눈다([데이터 흐름](03-data-flow.md)).

### 프로젝트 및 공통 규칙
- **의존성 기준**: `client/package.json` 및 `package-lock.json`이 클라이언트 의존성 버전의 단일 원본(SSOT)이다.
- **경로 별칭 (Path Alias)**: `@/`는 항상 `client/src`를 가리키도록 일관되게 구성한다.
- **개행 문자**: 모든 소스 및 텍스트 파일은 줄바꿈 문자로 `LF`를 사용한다.
- **진입점**: 앱은 `app/entry.tsx`에서 초기화되며, 전역 스타일은 `app/styles/index.css`를 통해 불러온다.

---

## 2. API 타입 생성 및 계약 동기화

백엔드와의 인터페이스 정합성을 보장하기 위해 OpenAPI 스펙 기반의 코드 생성을 채택한다.

- **생성 타입 파일 위치**: `client/src/shared/api/schema.d.ts` (`@/shared/api`를 통해 공개)
- **타입 생성 원본**: 백엔드에서 내보낸 `server/openapi.json` 스펙 파일을 참조하여 `openapi-typescript`로 자동 생성한다.
- **계약 준수 원칙**:
  - 자동 생성된 TypeScript 타입 파일을 임의로 수동 수정해서는 안 된다.
  - 프론트엔드 개발 시 임의로 작성한 Mock 데이터를 공식 서버 계약으로 간주하지 않는다. 모든 계약 변경은 백엔드 OpenAPI 스펙 갱신을 선행한다.

---

## 3. 주요 실행 명령어

저장소 루트(Root) 디렉터리에서 실행하는 표준 개발 명령은 다음과 같다. 서버와 함께 띄울 때는 `sh dev.sh [all|server|client]`를 쓴다.

```sh
# 개발 서버 실행
npm run dev --prefix client

# 전체 품질 및 정적 검사 (컴포넌트 린트, steiger, 테스트, 타입, 빌드)
npm run check --prefix client

# OpenAPI 스펙 기반 클라이언트 API 타입 생성
npm run api:generate --prefix client

# Astryx CLI (05 문서 참고)
npm run astryx --prefix client -- <명령>
```

---

## 4. 품질 검사 파이프라인 및 테스트 전략

### 품질 검사 파이프라인 (`check`)
`npm run check` 명령은 다음 단계의 검사를 순차적으로 실행하여 품질을 강제한다.
1. **컴포넌트 작성 규칙 검사** (`lint:components`): 디자인 시스템 및 프로젝트 표준 컴포넌트 사용 규칙 검증
2. **Steiger (FSD 아키텍처 린터)** (`lint:fsd`): 레이어 및 슬라이스 간 의존성 규칙 검사
3. **HTTP 기반 테스트** (`node --test` + tsx): 네트워크 및 통합 시나리오 검증
4. **TypeScript 타입 검사**: `tsc`를 통한 정적 타입 무결성 검증
5. **Vite 프로덕션 빌드**: 번들 생성 오류 및 자산 누락 사전 차단

### 테스트 범위 및 시나리오
- **통신 및 안정성 검증**: 요청 취소(`AbortController`) 시그널 전파, 보안 인증 쿠키 설정, 네트워크 오류 시 안전한 예외 처리 흐름을 기본적으로 검증한다.
- **핵심 유스케이스 검증**: 다음 시나리오를 실제 API 통신 환경에서 엄격히 검증한다.
  - 최초 데이터 로딩 상태
  - 백그라운드 재조회 실패 시의 Fallback 처리
  - 세션 만료 시 로그인 전환 및 상태 초기화
  - 폼 중복 제출(Double-submit) 방지
  - 데이터 저장 성공 후 관련 목록 캐시의 즉각 반영
  - 서버가 꺼졌다고 알린 기능의 버튼이 보이지 않음(D-030)

---

## 5. 네트워크 통신 및 번들 최적화 정책

### 동일 출처 통신 및 로컬 프록시
- 브라우저 환경에서는 동일 출처 정책에 따라 `/api/v1` 경로로 직접 통신한다. 배포 시 Spring Boot가 빌드된 정적 파일을 API와 함께 서빙한다.
- 로컬 개발 환경에서는 Vite 개발 서버의 프록시 설정을 통해 `/api` 요청을 로컬 백엔드 서버로 투명하게 라우팅한다.

### 보안 인증
- 사용자 인증 상태는 XSS(Cross-Site Scripting) 공격 방지를 위해 `HttpOnly`, `Secure` 속성이 부여된 쿠키를 통해 관리한다. 스크립트에서 토큰을 직접 읽거나 로컬 스토리지에 저장하지 않는다. 개인 API 키(Bearer)는 에이전트·MCP용이며 화면은 쓰지 않는다.

### 번들 분석 및 코드 분할 (Code Splitting)
- **지연 로딩**: 초기 구동에 필수적이지 않은 무거운 기능 모듈은 번들 분석(Bundle Analyzer) 결과를 기반으로 동적 임포트(`import()`)를 적용하여 지연 로딩한다.
- **정적 참조 방지**: 슬라이스의 공개 `index.ts`에서 지연 로딩 대상 컴포넌트를 정적으로 re-export하여 초기 진입 번들에 의도치 않게 다시 포함되는 일이 없도록 빌드 결과를 정기적으로 점검한다.
