import assert from 'node:assert/strict';
import test from 'node:test';
import { selectManuals, type ManualListEntry } from '../src/pages/project/manuals/model/manual-list';
import { isManuals, parseManualSearch, type Manual } from '../src/pages/project/manuals/model/manual';

const manual = (title: string, color: string, updatedAt?: string): Manual => ({ id: 'shared-id', title, description: '운영 기준', color, cover: 'book', updatedAt, sections: [], pages: [], comments: [], assets: {} });
const entries: ManualListEntry[] = [
  { key: 'workspace.shared-id', manual: manual('공통 안내', '#4cb782', '2026-10-30T00:00:00Z'), scopeName: '워크스페이스', isLocal: true },
  { key: 'a123456789.shared-id', manual: manual('개발 안내', '#bb87fc', '2026-10-31T00:00:00Z'), projectId: 'a123456789', scopeName: '개발', isLocal: false },
  { key: 'b123456789.shared-id', manual: manual('운영 안내', '#4cb782'), projectId: 'b123456789', scopeName: '운영', isLocal: false },
];
test('manual origins stay distinct when workspace and projects have the same local manual id', () => {
  assert.deepEqual(selectManuals(entries, { scope: 'workspace' }).map(entry => entry.key), ['workspace.shared-id']);
  assert.deepEqual(selectManuals(entries, { scope: 'a123456789', color: '#4cb782' }), []);
  assert.deepEqual(selectManuals(entries, { scope: 'a123456789', q: '운영 기준' }).map(entry => entry.scopeName), ['개발']);
  assert.equal(entries[1]!.manual.title, '개발 안내');
});
test('manual sorting uses page edits too and leaves undated legacy manuals last', () => {
  const changed = entries.map(entry => entry.isLocal ? { ...entry, manual: { ...entry.manual, pages: [{ id: 'page', title: '소개', body: '', sectionId: '', updatedAt: '2026-11-01T00:00:00Z' }] } } : entry);
  assert.deepEqual(selectManuals(changed, {}).map(entry => entry.scopeName), ['워크스페이스', '개발', '운영']);
  assert.deepEqual(selectManuals(changed, { sort: 'updated', dir: 'asc' }).map(entry => entry.scopeName), ['개발', '워크스페이스', '운영']);
  assert.equal(selectManuals(entries, { sort: 'title', dir: 'asc' })[0]!.manual.title, '개발 안내');
});
test('manual list links validate filter values while old unmarked bundles remain readable', () => {
  assert.deepEqual(parseManualSearch({ scope: {}, sort: 'priority', dir: 'sideways', color: 'red' }), {});
  assert.deepEqual(parseManualSearch({ scope: 'workspace', color: '#4cb782', sort: 'title', dir: 'asc', finding: '1' }), { scope: 'workspace', color: '#4cb782', sort: 'title', dir: 'asc', finding: 1 });
  assert.equal(isManuals([{ ...entries[0]!.manual, icon: undefined, color: undefined, updatedAt: undefined }]), true);
  assert.equal(isManuals([{ ...entries[0]!.manual, updatedAt: 7 }]), false);
});
