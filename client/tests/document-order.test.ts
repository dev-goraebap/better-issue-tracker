import assert from 'node:assert/strict';
import test from 'node:test';
import { orderedRows, rowKey, type FolderRow } from '../src/widgets/document-folder/model/rows';
import { parseFolderSearch } from '../src/entities/document/model/search';
const folder = (id: string, name: string, updatedAt = '2026-10-26') => ({ kind: 'folder', id, folder: { name, updatedAt } }) as FolderRow;
const doc = { kind: 'document', id: 'doc', document: { title: '안내', updatedAt: '2026-10-27' } } as FolderRow;
test('shared manual order mixes row types, ignores removed rows and appends new rows', () => {
  const rows = [folder('old', '설계'), folder('new', '검증'), doc];
  assert.deepEqual(orderedRows(rows, ['document:gone', 'document:doc', 'folder:old']).map(rowKey), ['document:doc', 'folder:old', 'folder:new']);
});
test('display sorting never changes the shared order or the source rows', () => {
  const rows = [folder('b', '배포'), doc, folder('a', '기획')];
  const saved = ['folder:b', 'document:doc', 'folder:a'];
  assert.equal(rowKey(orderedRows(rows, saved, 'updated')[0]!), 'document:doc');
  assert.deepEqual(orderedRows(rows, saved, 'name').map(rowKey), ['folder:a', 'folder:b', 'document:doc']);
  assert.deepEqual(orderedRows(rows, saved).map(rowKey), saved);
  assert.deepEqual(rows.map(rowKey), saved);
});
test('document list addresses keep supported filters and discard invalid sort and types', () => {
  assert.deepEqual(parseFolderSearch({ q: '  arc42 ', sort: 'name', kind: 'document' }), { q: 'arc42', sort: 'name', kind: 'document', folder: undefined, label: undefined, direction: undefined });
  assert.equal(parseFolderSearch({ sort: 'manual', kind: 'other' }).sort, undefined);
  assert.equal(parseFolderSearch({ sort: 'manual', kind: 'other' }).kind, undefined);
});
