export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly traceId?: string) {
    super('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    this.name = 'ApiError';
  }
}

/** Same-origin JSON reads. Server messages and input values are never echoed into errors. */
export async function readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (!response.ok) {
    let code = 'COMMON_REQUEST_FAILED';
    let traceId: string | undefined;
    if (response.headers.get('content-type')?.includes('application/problem+json')) {
      const problem: unknown = await response.json();
      if (problem && typeof problem === 'object') {
        if ('code' in problem && typeof problem.code === 'string') code = problem.code;
        if ('traceId' in problem && typeof problem.traceId === 'string') traceId = problem.traceId;
      }
    }
    throw new ApiError(response.status, code, traceId);
  }
  return response.json() as Promise<T>;
}
