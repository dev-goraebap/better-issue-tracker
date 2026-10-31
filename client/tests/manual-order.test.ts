import assert from 'node:assert/strict';
import test from 'node:test';
import { manualPageRows, orderManualPages } from '../src/pages/project/manuals/model/manual-order';
import type { Manual } from '../src/pages/project/manuals/model/manual';
const manual: Manual = { id: 'guide', title: '안내', description: '', cover: 'book', sections: [{ id: 'first', title: '시작' }, { id: 'empty', title: '빈 섹션' }], pages: [
  { id: 'one', title: '첫 페이지', body: '![그림](attachment:image)', sectionId: 'first', updatedAt: '' },
  { id: 'two', title: '다음 페이지', body: '본문', sectionId: 'first', updatedAt: '' },
], comments: [{ id: 'comment', pageId: 'one', body: '의견', resolved: false, createdAt: '' }], assets: { image: 'data:image/png;base64,aGVsbG8=' } };

test('a page can enter an empty section and return to the top level without losing its content or comments', () => {
  const moved = orderManualPages(manual, ['section-first', 'page-two', 'section-empty', 'page-one']);
  assert.equal(moved.pages.find(page => page.id === 'one')?.sectionId, 'empty');
  assert.equal(moved.pages.find(page => page.id === 'one')?.body, manual.pages[0]!.body);
  assert.deepEqual(moved.comments, manual.comments);
  assert.deepEqual(moved.assets, manual.assets);
  const top = orderManualPages(moved, ['page-one', 'section-first', 'page-two', 'section-empty']);
  assert.equal(top.pages[0]!.sectionId, '');
  assert.deepEqual(manualPageRows(top).map(row => row.id), ['page-one', 'section-first', 'page-two', 'section-empty']);
});

test('a page order never drops unmentioned pages or duplicates them', () => {
  const moved = orderManualPages(manual, ['section-empty', 'page-two', 'page-two', 'page-unknown']);
  assert.equal(moved.pages.length, 2);
  assert.deepEqual(new Set(moved.pages.map(page => page.id)), new Set(['one', 'two']));
});
