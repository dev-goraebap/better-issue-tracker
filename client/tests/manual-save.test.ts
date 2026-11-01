import assert from 'node:assert/strict';
import test from 'node:test';
import { saveManualAndRefresh } from '../src/pages/project/manuals/api/save-manual';
import { ApiError, resetCsrf } from '../src/shared/api/http';
import type { Manual } from '../src/pages/project/manuals/model/manual';

const draft: Manual = { id: 'm123456789', title: '변경한 안내', description: '', cover: 'book', icon: 'manuals', color: '#20b2a0', version: 3,
  sections: [], pages: [{ id: 'p123456789', title: '시작', body: '저장할 본문', sectionId: '', updatedAt: '2026-11-01T00:00:00Z' }], comments: [], assets: {} };
const detail = { ...draft, version: 4, content: { sections: draft.sections, pages: draft.pages, comments: [] } };

for (const mode of ['success', 'detail-failure', 'list-failure', 'write-conflict', 'summary-conflict'] as const) {
  test(`manual save distinguishes a confirmed write from ${mode}`, async () => {
    const original = globalThis.fetch; resetCsrf();
    let writes = 0; let publishes = 0; let stored: unknown;
    globalThis.fetch = async (path, init) => {
      if (path === '/api/v1/auth/csrf') return Response.json({ headerName: 'X-CSRF-Token', token: 'test-token' });
      if (init?.method === 'PUT') {
        writes++;
        if (mode === 'write-conflict') return new Response(JSON.stringify({ code: 'MANUAL_VERSION_CONFLICT' }), { status: 409, headers: { 'Content-Type': 'application/problem+json' } });
        stored = JSON.parse(init.body as string); return new Response(null, { status: 204 });
      }
      if (mode === 'detail-failure') throw new TypeError('read offline after the write');
      return Response.json(detail);
    };
    try {
      const publish = async (saved: Manual) => { publishes++; assert.equal(saved.version, 4); if (mode === 'list-failure') throw new Error('list offline'); };
      const item = mode === 'summary-conflict' ? { ...draft, pageCount: 1, pages: [] } : draft;
      if (mode === 'write-conflict' || mode === 'summary-conflict') {
        await assert.rejects(saveManualAndRefresh('w123456789', undefined, item, publish), error => error instanceof ApiError && error.status === 409);
        assert.equal(writes, mode === 'summary-conflict' ? 0 : 1); assert.equal(stored, undefined); assert.equal(publishes, 0);
      } else {
        const outcome = await saveManualAndRefresh('w123456789', undefined, item, publish);
        assert.equal(outcome, mode === 'success' ? 'refreshed' : 'saved');
        assert.equal(writes, 1); assert.deepEqual((stored as { content: unknown }).content, detail.content);
        assert.equal(publishes, mode === 'detail-failure' ? 0 : 1);
      }
      assert.equal(draft.version, 3); assert.equal(draft.pages[0]!.body, '저장할 본문');
    } finally { globalThis.fetch = original; resetCsrf(); }
  });
}
