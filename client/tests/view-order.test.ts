import assert from 'node:assert/strict';
import test from 'node:test';
import { orderViews } from '../src/entities/work-item/model/view-order';

const views = [{ id: 'all' }, { id: 'backlog' }, { id: 'board' }, { id: 'calendar' }];
const ids = (list: readonly { id: string }[]) => list.map(view => view.id);

test('a scope with no order of its own shows the workspace order', () => {
  assert.deepEqual(ids(orderViews(views, undefined)), ['all', 'backlog', 'board', 'calendar']);
  assert.deepEqual(ids(orderViews(views, [])), ['all', 'backlog', 'board', 'calendar']);
});

test('the views a scope names come first in its order, the rest after in the workspace order', () => {
  assert.deepEqual(ids(orderViews(views, ['board', 'all'])), ['board', 'all', 'backlog', 'calendar']);
});

test('a named view no longer there is skipped, so the first one left is the default', () => {
  assert.deepEqual(ids(orderViews(views, ['gone', 'calendar'])), ['calendar', 'all', 'backlog', 'board']);
});
