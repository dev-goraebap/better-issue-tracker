import assert from 'node:assert/strict';
import test from 'node:test';
import { readManualPackage } from '../src/pages/project/manuals/model/manual-package';
const manual = { id: 'manual-one', title: '사용자 매뉴얼', description: '', cover: 'book', sections: [], pages: [{ id: 'one', title: '시작', body: '안내', sectionId: '', updatedAt: '' }], comments: [], assets: {} };
const bundle = (value: unknown) => JSON.stringify({ format: 'bit-manual', version: 1, manual: value });
test('portable manual requires an explicit format and unique, safe page identities', () => {
  assert.equal(readManualPackage(bundle(manual)).title, '사용자 매뉴얼');
  assert.throws(() => readManualPackage(JSON.stringify(manual)));
  assert.throws(() => readManualPackage(bundle({ ...manual, pages: [manual.pages[0], manual.pages[0]] })));
  assert.throws(() => readManualPackage(bundle({ ...manual, pages: [{ ...manual.pages[0], id: 'a"]' }] })));
});
test('portable manual rejects missing images and external asset URLs', () => {
  const withImage = { ...manual, pages: [{ ...manual.pages[0], body: '![화면](attachment:Image00001)' }] };
  assert.throws(() => readManualPackage(bundle(withImage)));
  assert.throws(() => readManualPackage(bundle({ ...withImage, assets: { Image00001: 'https://example.test/tracking.png' } })));
  assert.equal(Object.keys(readManualPackage(bundle({ ...withImage, assets: { Image00001: 'data:image/png;base64,aGVsbG8=' } })).assets).length, 1);
});


test('portable manual keeps original GIF image data instead of requiring JPEG conversion', () => {
  const source = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const portable = { ...manual, pages: [{ ...manual.pages[0], body: '![동작](attachment:Image00001)' }], assets: { Image00001: source } };
  assert.equal(readManualPackage(bundle(portable)).assets.Image00001, source);
});


test('portable book limits match the server rather than truncating books over 200 pages', () => {
  const pages = Array.from({ length: 500 }, (_, i) => ({ ...manual.pages[0]!, id: `page${i}` }));
  assert.equal(readManualPackage(bundle({ ...manual, pages })).pages.length, 500);
  assert.throws(() => readManualPackage(bundle({ ...manual, pages: [...pages, { ...pages[0], id: 'extra' }] })));
  assert.throws(() => readManualPackage(bundle({ ...manual, pages: pages.slice(0, 26).map(page => ({ ...page, body: 'x'.repeat(200_000) })) })));
});
