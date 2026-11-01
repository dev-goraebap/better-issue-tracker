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
        assert.equal(outcome, mode === 'success' ? 'refreshed' : 'saved-with-refresh-error');
        assert.equal(writes, 1); assert.deepEqual((stored as { content: unknown }).content, detail.content);
        assert.equal(publishes, mode === 'detail-failure' ? 0 : 1);
      }
      assert.equal(draft.version, 3); assert.equal(draft.pages[0]!.body, '저장할 본문');
    } finally { globalThis.fetch = original; resetCsrf(); }
  });
}

test('summary save propagates a failed prerequisite read without writing or publishing', async () => {
  const original = globalThis.fetch; resetCsrf();
  const offline = new TypeError('detail offline before the write');
  const requests: string[] = []; let publishes = 0;
  const item = { ...draft, pageCount: 1, pages: [] };
  const before = structuredClone(item);
  globalThis.fetch = async (path, init) => {
    requests.push(`${init?.method ?? 'GET'} ${path}`);
    throw offline;
  };
  try {
    await assert.rejects(saveManualAndRefresh('w123456789', undefined, item, async () => { publishes++; }), error => error === offline);
    assert.deepEqual(requests, ['GET /api/v1/workspaces/w123456789/manuals/m123456789']);
    assert.equal(publishes, 0);
    assert.deepEqual(item, before);
  } finally { globalThis.fetch = original; resetCsrf(); }
});

test('an unconfirmed PUT propagates its network error without retrying or publishing', async () => {
  const original = globalThis.fetch; resetCsrf();
  const offline = new TypeError('connection lost during the write');
  const requests: string[] = []; let publishes = 0;
  const before = structuredClone(draft);
  globalThis.fetch = async (path, init) => {
    requests.push(`${init?.method ?? 'GET'} ${path}`);
    if (path === '/api/v1/auth/csrf') return Response.json({ headerName: 'X-CSRF-Token', token: 'test-token' });
    if (init?.method === 'PUT') throw offline;
    return Response.json(detail);
  };
  try {
    await assert.rejects(saveManualAndRefresh('w123456789', undefined, draft, async () => { publishes++; }), error => error === offline);
    assert.deepEqual(requests, ['GET /api/v1/auth/csrf', 'PUT /api/v1/workspaces/w123456789/manuals/m123456789']);
    assert.equal(publishes, 0);
    assert.deepEqual(draft, before);
  } finally { globalThis.fetch = original; resetCsrf(); }
});

test('a matching summary version saves edited metadata while preserving the latest content', async () => {
  const original = globalThis.fetch; resetCsrf();
  const latest: Manual = { ...draft, title: '기존 안내', description: '기존 설명', icon: 'workflow', color: '#bb87fc', projectId: 'j123456789',
    sections: [{ id: 's123456789', title: '최신 섹션' }],
    pages: [{ ...draft.pages[0]!, body: '최신 본문', sectionId: 's123456789' }],
    comments: [{ id: 'c123456789', pageId: 'p123456789', body: '보존할 의견', resolved: false, createdAt: '2026-11-01T00:00:00Z' }] };
  const item: Manual = { ...draft, description: '변경한 설명', pageCount: 1, sections: [], pages: [], comments: [] };
  const before = structuredClone(item);
  const latestBefore = structuredClone(latest);
  const content = { sections: latest.sections, pages: latest.pages, comments: latest.comments };
  const saved = { ...latest, title: item.title, description: item.description, icon: item.icon, color: item.color, version: 4 };
  const requests: string[] = []; let stored: unknown; let publishes = 0; let reads = 0; let published: Manual | undefined;
  globalThis.fetch = async (path, init) => {
    requests.push(`${init?.method ?? 'GET'} ${path}`);
    if (path === '/api/v1/auth/csrf') return Response.json({ headerName: 'X-CSRF-Token', token: 'test-token' });
    if (init?.method === 'PUT') { stored = JSON.parse(init.body as string); return new Response(null, { status: 204 }); }
    return Response.json({ ...(reads++ === 0 ? latest : saved), content });
  };
  try {
    const outcome = await saveManualAndRefresh('w123456789', 'j987654321', item, async value => {
      publishes++;
      published = value;
    });
    assert.equal(outcome, 'refreshed');
    assert.deepEqual(published, { ...saved, content });
    assert.deepEqual(stored, { id: item.id, projectId: latest.projectId, expectedVersion: latest.version,
      title: item.title, description: item.description, icon: item.icon, color: item.color, content, uploadIds: [] });
    assert.deepEqual(requests, ['GET /api/v1/workspaces/w123456789/manuals/m123456789', 'GET /api/v1/auth/csrf',
      'PUT /api/v1/workspaces/w123456789/manuals/m123456789', 'GET /api/v1/workspaces/w123456789/manuals/m123456789']);
    assert.equal(publishes, 1);
    assert.deepEqual(item, before);
    assert.deepEqual(latest, latestBefore);
  } finally { globalThis.fetch = original; resetCsrf(); }
});
