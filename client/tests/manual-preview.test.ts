import assert from 'node:assert/strict';
import test from 'node:test';
import { findPages, isManuals, movePage, pageMarkdown, pagesInOrder, parseManualSearch, safeFilename, type Manual } from '../src/pages/project/manuals/model/manual';
const manual: Manual = { id: 'one', title: '개발 매뉴얼', description: '', cover: 'book', sections: [{ id: 'start', title: '시작' }], comments: [], assets: {}, pages: [
  { id: 'a', title: '설정', body: '환경 설정', sectionId: 'start', updatedAt: '' },
  { id: 'root', title: '소개', body: '', sectionId: '', updatedAt: '' },
  { id: 'b', title: '구조', body: '```ts\nconst version = 1;\n```', sectionId: 'start', updatedAt: '' },
] };
test('manual ordering separates root from sections, reorders only siblings and retains IDs/body', () => {
  const changed = movePage(manual, 'b', -1);
  assert.deepEqual(pagesInOrder(changed).map(page => page.id), ['root', 'b', 'a']);
  assert.equal(changed.pages.find(page => page.id === 'b')?.body, manual.pages[2]?.body);
  assert.equal(movePage(manual, 'a', -1), manual);
  assert.deepEqual(pagesInOrder(manual).map(page => page.id), ['root', 'a', 'b']);
});
test('search finds page contents, Markdown export retains fences, filename strips path characters', () => {
  assert.deepEqual(findPages(manual, 'VERSION').map(page => page.id), ['b']);
  assert.equal(pageMarkdown(manual.pages[2]!), '# 구조\n\n```ts\nconst version = 1;\n```\n');
  assert.equal(safeFilename('a/b:c?.md'), 'a-b-c-.md');
});
test('invalid cached storage is rejected including orphaned section references', () => {
  assert.equal(isManuals([manual]), true);
  assert.equal(isManuals([{ ...manual, pages: [{ ...manual.pages[0], sectionId: 'other-manual-section' }] }]), false);
  assert.equal(isManuals([{ ...manual, comments: [{}] }]), false);
  assert.equal(isManuals({}), false);
});
test('route input ignores object parameters and bounds query size', () => {
  assert.deepEqual(parseManualSearch({ manual: {}, page: 'a', q: ' ' }), { page: 'a' });
  assert.equal(parseManualSearch({ q: 'a'.repeat(1000) }).q?.length, 200);
});

test('manual URL query trims before its length limit without changing other search parameters', () => {
  const filters = { manual: 'book', page: 'a', scope: 'a123456789', color: '#4cb782', sort: 'updated', dir: 'desc', finding: 1 } as const;
  assert.deepEqual(parseManualSearch({ ...filters, q: `${' '.repeat(200)}환경  설정 \t\n` }), { ...filters, q: '환경  설정' });
  assert.equal(parseManualSearch({ q: ` \t${'가'.repeat(201)} \n` }).q, '가'.repeat(200));
  for (const q of ['', ' \t\r\n', undefined, null, 123, {}]) {
    assert.deepEqual(parseManualSearch({ ...filters, q }), filters);
  }
});
