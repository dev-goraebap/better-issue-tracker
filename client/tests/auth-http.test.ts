import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, command, resetCsrf, setUnauthorizedHandler } from '../src/shared/api/http';
const problem = (code: string, status = 403) => new Response(JSON.stringify({ code }), { status, headers: { 'Content-Type': 'application/problem+json' } });
const token = (value: string) => new Response(JSON.stringify({ token: value, headerName: 'X-CSRF-Token' }), { headers: { 'Content-Type': 'application/json' } });

test('concurrent commands share CSRF reads and retry only the explicit CSRF rejection once', async () => {
  const original = globalThis.fetch; resetCsrf(); let reads = 0; let writes = 0;
  globalThis.fetch = async (path, init) => {
    if (path === '/api/v1/auth/csrf') { reads++; await new Promise(resolve => setTimeout(resolve, 10)); return token(reads === 1 ? 'old' : 'new'); }
    writes++; const header = (init?.headers as Record<string, string>)['X-CSRF-Token'];
    return header === 'old' ? problem('AUTH_CSRF_INVALID') : new Response(null, { status: 204 });
  };
  try { await Promise.all([command('POST', '/api/v1/test'), command('DELETE', '/api/v1/test')]); assert.equal(reads, 2); assert.equal(writes, 4); }
  finally { globalThis.fetch = original; resetCsrf(); }
});

test('network errors and ordinary failures never replay commands', async () => {
  const original = globalThis.fetch;
  try {
    for (const mode of ['network', 'forbidden', 'csrf'] as const) {
      resetCsrf(); let writes = 0;
      globalThis.fetch = async path => {
        if (path === '/api/v1/auth/csrf') return token('token');
        writes++; if (mode === 'network') throw new TypeError('offline');
        return problem(mode === 'csrf' ? 'AUTH_CSRF_INVALID' : 'AUTH_FORBIDDEN');
      };
      await assert.rejects(command('POST', '/api/v1/test'));
      assert.equal(writes, mode === 'csrf' ? 2 : 1);
    }
  } finally { globalThis.fetch = original; resetCsrf(); }
});

test('session expiry invokes cleanup while wrong login credentials stay in the form', async () => {
  const original = globalThis.fetch; let cleanups = 0;
  setUnauthorizedHandler(() => { cleanups++; });
  try {
    for (const code of ['AUTH_INVALID_CREDENTIALS', 'AUTH_UNAUTHENTICATED']) {
      resetCsrf(); globalThis.fetch = async path => path === '/api/v1/auth/csrf' ? token('token') : problem(code, 401);
      await assert.rejects(command('POST', '/api/v1/test'), ApiError);
    }
    assert.equal(cleanups, 1);
  } finally { globalThis.fetch = original; setUnauthorizedHandler(() => {}); resetCsrf(); }
});

test('foreign Location never causes a follow-up request', async () => {
  const original = globalThis.fetch; resetCsrf(); let writes = 0;
  Object.defineProperty(globalThis, 'window', { value: { location: { origin: 'http://localhost' } }, configurable: true });
  globalThis.fetch = async path => {
    if (path === '/api/v1/auth/csrf') return token('token');
    writes++; return new Response(null, { status: 201, headers: { Location: 'https://foreign.example/api/v1/me' } });
  };
  try { await assert.rejects(command('POST', '/api/v1/test'), /Invalid API Location/); assert.equal(writes, 1); }
  finally { globalThis.fetch = original; Reflect.deleteProperty(globalThis, 'window'); resetCsrf(); }
});
