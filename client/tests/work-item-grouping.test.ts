import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkItem } from '../src/entities/work-item/api/work-item';
import { groupWorkItems, limitGroups, nestLines, subtaskProgress } from '../src/entities/work-item/model/grouping';

const item = (id: string, extra: Partial<WorkItem> = {}) => ({
  id, key: `T-${id}`, title: `업무 ${id}`, parentId: null, people: [], labels: [], priority: null, columnId: null, columnCategory: null, projectId: 'p1',
  type: { id: 'task', name: '작업' }, ...extra,
}) as unknown as WorkItem;
const keys = (lines: readonly { item: WorkItem; depth: number }[]) => lines.map(line => `${line.item.id}@${line.depth}`);

test('a subtask sits under its parent in the list order, and one whose parent is away names it', () => {
  const epic = item('1');
  const story = item('2', { parentId: '1' });
  const bug = item('3', { parentId: '2' });
  const stray = item('4', { parentId: '9' });
  const all = new Map([epic, story, bug, stray, item('9', { title: '걸러진 상위' })].map(each => [each.id, each]));
  const lines = nestLines([bug, stray, epic, story], all);
  assert.deepEqual(keys(lines), ['4@0', '1@0', '2@1', '3@2']);
  assert.deepEqual(lines[0]?.parent, { key: 'T-9', title: '걸러진 상위' });
  assert.equal(lines[2]?.parent, undefined);
});

test('parents that only lead to one another still all show', () => {
  const a = item('a', { parentId: 'b' });
  const b = item('b', { parentId: 'a' });
  const lines = nestLines([a, b], new Map([[a.id, a], [b.id, b]]));
  assert.deepEqual(keys(lines), ['a@0', 'b@1']);
});

test('a work item with two labels is in both groups and counted in each; none comes last', () => {
  const design = { id: 'l1', name: '디자인', color: '#f00' };
  const bug = { id: 'l2', name: '버그', color: '#0f0' };
  const rows = [item('1', { labels: [design, bug] as never }), item('2', { labels: [bug] as never }), item('3')];
  const groups = groupWorkItems(rows, 'label', { all: rows, labels: [{ id: 'l2' }, { id: 'l1' }] });
  assert.deepEqual(groups.map(group => [group.label, group.count]), [['버그', 2], ['디자인', 1], ['라벨 없음', 1]]);
});

test('a subtask goes under its parent only within the same group', () => {
  const parent = item('1', { priority: 'high' });
  const child = item('2', { parentId: '1', priority: 'high' });
  const elsewhere = item('3', { parentId: '1', priority: 'low' });
  const rows = [parent, child, elsewhere];
  const groups = groupWorkItems(rows, 'priority', { all: rows });
  assert.deepEqual(groups.map(group => group.label), ['높음', '낮음']);
  assert.deepEqual(keys(groups[0]?.lines ?? []), ['1@0', '2@1']);
  assert.deepEqual(groups[1]?.lines[0]?.parent, { key: 'T-1', title: '업무 1' });
});

test('status groups by a project\'s columns in their order, the home by category, and project grouping inside a project is none', () => {
  const rows = [item('1', { columnId: 'c2', columnCategory: 'doing' }), item('2', { columnId: 'c1', columnCategory: 'todo' }), item('3')];
  const inProject = groupWorkItems(rows, 'status', { all: rows, columns: [{ id: 'c1', name: '할 일' }, { id: 'c2', name: '검토 중' }] });
  assert.deepEqual(inProject.map(group => group.label), ['할 일', '검토 중', '상태 없음']);
  const home = groupWorkItems(rows, 'status', { all: rows });
  assert.deepEqual(home.map(group => group.label), ['할 일', '진행 중', '상태 없음']);
  assert.deepEqual(groupWorkItems(rows, 'project', { all: rows }).map(group => group.grouping), ['none']);
});

test('the rows are cut after the limit, headers not counted, and a folded group keeps only its header', () => {
  const rows = [item('1', { priority: 'high' }), item('2', { priority: 'high' }), item('3', { priority: 'low' })];
  const groups = groupWorkItems(rows, 'priority', { all: rows });
  const cut = limitGroups(groups, 2, new Set());
  assert.deepEqual(cut.groups.map(group => group.lines.length), [2]);
  assert.equal(cut.hasMore, true);
  const folded = limitGroups(groups, 2, new Set(['high']));
  assert.deepEqual(folded.groups.map(group => group.lines.length), [0, 1]);
  assert.equal(folded.hasMore, false);
});

test('a parent\'s progress counts its subtasks and those done', () => {
  const progress = subtaskProgress([item('1'), item('2', { parentId: '1', columnCategory: 'done' }), item('3', { parentId: '1', columnCategory: 'todo' })]);
  assert.deepEqual(progress.get('1'), { done: 1, total: 2 });
  assert.equal(progress.has('2'), false);
});

test('the tree lines know where a line runs on, where a row closes its parent\'s subtasks and where one goes down', () => {
  const root = item('1');
  const a = item('2', { parentId: '1' });
  const a1 = item('3', { parentId: '2' });
  const b = item('4', { parentId: '1' });
  const b1 = item('5', { parentId: '4' });
  const rows = [root, a, a1, b, b1];
  const lines = nestLines(rows, new Map(rows.map(each => [each.id, each])));
  assert.deepEqual(lines.map(line => [line.item.id, line.guides, line.isLast, line.hasChildren]), [
    ['1', [], true, true],
    ['2', [], false, true],
    ['3', [true], true, false],
    ['4', [], true, true],
    ['5', [false], true, false],
  ]);
});
