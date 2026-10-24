import type { components } from './schema';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly traceId?: string) {
    super('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    this.name = 'ApiError';
  }
}
/** Whether a read found nothing at its address (404): asking again finds nothing either. */
export const isNotFound = (error: unknown): boolean => error instanceof ApiError && error.status === 404;
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
export async function command<T = void>(method: string, path: string, body?: unknown, onLocation?: (path: string) => void): Promise<T> {
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
      onLocation?.(url.pathname);
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
    PROJECT_NOT_FOUND: '프로젝트를 찾을 수 없거나 접근 권한이 없습니다.',
    PROJECT_KEY_CONFLICT: '현재 또는 과거에 사용한 프로젝트 키입니다. 다른 키를 입력해 주세요.',
    PROJECT_ARCHIVED: '보관한 프로젝트입니다. 프로젝트 설정에서 보관을 해제해 주세요.',
    PROJECT_VERSION_CONFLICT: '다른 변경이 있습니다. 입력한 초안을 보관했으니 최신 내용을 확인한 뒤 다시 편집해 주세요.',
    PROJECT_COLUMN_NOT_FOUND: '컬럼이 없거나 다른 프로젝트의 컬럼입니다.',
    PROJECT_COLUMN_REQUIRED: '컬럼을 하나 이상 유지해야 합니다.',
    PROJECT_FINAL_COLUMN_REQUIRED: '완료 컬럼을 하나 이상 유지해야 합니다.',
    PROJECT_COLUMN_TARGET_INVALID: '다른 목적 컬럼 또는 백로그를 선택해 주세요.',
    WORKITEM_NOT_FOUND: '작업항목을 찾을 수 없거나 접근 권한이 없습니다.',
    WORKITEM_VERSION_CONFLICT: '다른 변경이 있습니다. 입력한 초안은 유지됩니다. 취소 후 최신 내용으로 다시 편집해 주세요.',
    WORKITEM_ASSIGNEE_NOT_MEMBER: '현재 워크스페이스 멤버만 새 담당자로 지정할 수 있습니다.',
    WORKITEM_DATE_RANGE_INVALID: '시작일은 마감일보다 늦을 수 없습니다.',
    WORKITEM_MOVE_INVALID: '이동할 위치가 달라졌습니다. 목록을 새로 읽고 다시 이동해 주세요.',
    COMMON_CONFLICT: '이미 사용 중인 값이거나 현재 상태에서는 처리할 수 없습니다.',
    WORKSPACE_SLUG_CONFLICT: '이미 사용한 고정 주소입니다. 다른 slug를 입력하세요.',
    WORKSPACE_MEMBER_EXISTS: '이미 참여 중인 멤버입니다.',
    WORKSPACE_INVITATION_ALREADY_PENDING: '아직 유효한 초대가 있습니다. 기존 초대를 폐기하거나 만료 후 다시 만드세요.',
    WORKSPACE_OWNER_REQUIRED: '소유권을 다른 멤버에게 이전한 뒤 진행해 주세요.',
    WORKSPACE_INVALID_OWNER: '다른 활성 멤버를 새 owner로 선택해 주세요.',
    WORKSPACE_INVITATION_ALREADY_ACCEPTED: '이미 수락한 초대입니다.',
    WORKSPACE_NOT_FOUND: '워크스페이스를 찾을 수 없거나 참여 권한이 없습니다.',
    WORKSPACE_INVITATION_UNAVAILABLE: '사용할 수 없는 초대입니다. 관리자에게 새 초대를 요청하세요.',
    WORKSPACE_INVITATION_LOGIN_REQUIRED: '이미 계정이 있습니다. 기존 계정으로 로그인해 주세요.',
    WORKSPACE_INVITATION_ACCOUNT_MISMATCH: '초대받은 이메일의 계정으로 로그인해 주세요.',
  };
  return messages[error.code] ?? error.message;
}
