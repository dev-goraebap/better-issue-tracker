import assert from 'node:assert/strict';
import test from 'node:test';
import { placeOf, spotOf, stepSpot, withCardAt } from '../src/pages/workspace/work-items/model/board-move';

const card = (id: string) => ({ id });
const lanes = [
  { key: 'todo', columnId: 'c1', cards: [card('a'), card('b'), card('c')] },
  { key: 'doing', columnId: 'c2', cards: [card('d')] },
  { key: 'done', columnId: 'c3', cards: [] },
];

test('a card sits at its place among the others in its lane', () => {
  assert.deepEqual(spotOf(lanes, 'b'), { lane: 'todo', index: 1 });
  assert.equal(spotOf(lanes, 'x'), null);
});

test('arrow keys walk the lanes and the places, stopping at the edges', () => {
  assert.deepEqual(stepSpot(lanes, 'c', { lane: 'todo', index: 2 }, 'ArrowRight'), { lane: 'doing', index: 1 });
  assert.deepEqual(stepSpot(lanes, 'c', { lane: 'doing', index: 1 }, 'ArrowRight'), { lane: 'done', index: 0 });
  assert.deepEqual(stepSpot(lanes, 'c', { lane: 'done', index: 0 }, 'ArrowRight'), { lane: 'done', index: 0 });
  assert.deepEqual(stepSpot(lanes, 'a', { lane: 'todo', index: 0 }, 'ArrowLeft'), { lane: 'todo', index: 0 });
  assert.deepEqual(stepSpot(lanes, 'a', { lane: 'todo', index: 0 }, 'ArrowUp'), { lane: 'todo', index: 0 });
  assert.deepEqual(stepSpot(lanes, 'a', { lane: 'todo', index: 1 }, 'ArrowDown'), { lane: 'todo', index: 2 });
  assert.deepEqual(stepSpot(lanes, 'a', { lane: 'todo', index: 2 }, 'ArrowDown'), { lane: 'todo', index: 2 });
});

test('a drop goes before the card at the place, after the last one at the end, and nowhere when it stays', () => {
  assert.equal(placeOf(lanes, 'b', { lane: 'todo', index: 1 }), null);
  assert.deepEqual(placeOf(lanes, 'c', { lane: 'todo', index: 0 }), { targetColumnId: 'c1', beforeItemId: 'a' });
  assert.deepEqual(placeOf(lanes, 'a', { lane: 'todo', index: 2 }), { targetColumnId: 'c1', afterItemId: 'c' });
  assert.deepEqual(placeOf(lanes, 'a', { lane: 'doing', index: 1 }), { targetColumnId: 'c2', afterItemId: 'd' });
  assert.deepEqual(placeOf(lanes, 'a', { lane: 'done', index: 0 }), { targetColumnId: 'c3' });
  assert.equal(placeOf([{ key: 'todo', cards: [card('a')] }, { key: 'done', cards: [] }], 'a', { lane: 'done', index: 0 }), null);
});

test('the card is shown at the place and nowhere else', () => {
  const shown = withCardAt(lanes, 'a', { lane: 'doing', index: 0 });
  assert.deepEqual(shown.map(lane => lane.cards.map(each => each.id)), [['b', 'c'], ['a', 'd'], []]);
  assert.deepEqual(withCardAt(lanes, 'a', { lane: 'todo', index: 2 }).map(lane => lane.cards.map(each => each.id)), [['b', 'c', 'a'], ['d'], []]);
});
