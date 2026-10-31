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
