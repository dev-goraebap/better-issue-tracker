import type { components } from './schema';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly traceId?: string) {
    super('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    this.name = 'ApiError';
  }
}
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler: () => void) { onUnauthorized = handler; }
export function notifySessionExpired() { onUnauthorized(); }
async function failure(response: Response, quiet = false): Promise<never> {
  let code = 'COMMON_REQUEST_FAILED';
  let traceId: string | undefined;
  if (response.headers.get('content-type')?.includes('application/problem+json')) {
    const problem: unknown = await response.json();
    if (problem && typeof problem === 'object') {
      if ('code' in problem && typeof problem.code === 'string') code = problem.code;
      if ('traceId' in problem && typeof problem.traceId === 'string') traceId = problem.traceId;
    }
  }
  if (response.status === 401 && code !== 'AUTH_INVALID_CREDENTIALS' && !quiet) onUnauthorized();
  throw new ApiError(response.status, code, traceId);
}
export async function readJson<T>(path: string, signal?: AbortSignal, quietUnauthorized = false): Promise<T> {
  const response = await fetch(path, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (!response.ok) return failure(response, quietUnauthorized);
  return response.json() as Promise<T>;
}
type Csrf = components['schemas']['Csrf'];
let csrf: Csrf | undefined;
let pending: Promise<Csrf> | undefined;
let generation = 0;
export function resetCsrf() { csrf = undefined; pending = undefined; generation++; }
async function getCsrf(): Promise<Csrf> {
  if (csrf) return csrf;
  if (!pending) {
    const current = generation;
    const request = readJson<Csrf>('/api/v1/auth/csrf');
    pending = request;
    try {
      const value = await request;
      if (current === generation) csrf = value;
      return value;
    } finally { if (pending === request) pending = undefined; }
  }
  return pending;
}
/** Replay only an explicit CSRF rejection, never a network failure. */
export async function command<T = void>(method: string, path: string, body?: unknown): Promise<T> {
  if (!path.startsWith('/api/v1/')) throw new Error('Invalid API path');
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getCsrf();
    const response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: { Accept: 'application/json', [token.headerName]: token.token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      try { await failure(response); }
      catch (error) {
        if (error instanceof ApiError && error.code === 'AUTH_CSRF_INVALID' && attempt === 0) {
          if (csrf === token) resetCsrf();
          continue;
        }
        throw error;
      }
    }
    const location = response.headers.get('Location');
    if (location) {
      const url = new URL(location, window.location.origin);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/v1/')) throw new Error('Invalid API Location');
    }
    const text = response.status === 204 ? '' : await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
  throw new Error('CSRF retry exhausted');
}
export function authError(error: unknown): string {
  if (!(error instanceof ApiError)) return '서버에 연결하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.';
  const messages: Record<string, string> = {
    AUTH_INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다. 잠금 상태라면 15분 뒤 다시 시도해 주세요.',
    AUTH_PASSWORD_INVALID: '비밀번호는 15~64자, UTF-8 72바이트 이하여야 합니다.',
    AUTH_RATE_LIMITED: '요청이 많습니다. 1분 뒤 다시 시도해 주세요.',
    AUTH_BOOTSTRAP_CLOSED: '첫 관리자 가입이 끝났습니다. 로그인해 주세요.',
    AUTH_FORBIDDEN: '이 작업을 수행할 권한이 없습니다.',
    AUTH_CSRF_INVALID: '보안 확인에 실패했습니다. 화면을 새로고침해 주세요.',
    AUTH_UNAUTHENTICATED: '세션이 만료됐습니다. 다시 로그인해 주세요.',
    COMMON_INVALID_REQUEST: '입력값을 확인해 주세요.',
  };
  return messages[error.code] ?? error.message;
}
