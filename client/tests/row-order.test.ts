import assert from 'node:assert/strict';
import test from 'node:test';
import { placeAt, placeFor, stepBy } from '../src/shared/lib/row-reorder/order';

const order = ['todo', 'doing', 'review', 'done'];

test('a column put at a place lands there among the others', () => {
  assert.deepEqual(placeAt(order, 'done', 0), ['done', 'todo', 'doing', 'review']);
  assert.deepEqual(placeAt(order, 'todo', 2), ['doing', 'review', 'todo', 'done']);
  assert.deepEqual(placeAt(order, 'todo', 9), ['doing', 'review', 'done', 'todo']);
  assert.deepEqual(placeAt(order, 'ghost', 1), order);
});

test('Alt + arrow moves a column one place and stops at the ends', () => {
  assert.deepEqual(stepBy(order, 'doing', 1), ['todo', 'review', 'doing', 'done']);
  assert.deepEqual(stepBy(order, 'doing', -1), ['doing', 'todo', 'review', 'done']);
  assert.deepEqual(stepBy(order, 'todo', -1), order);
  assert.deepEqual(stepBy(order, 'done', 1), order);
});

test('a carried row takes the place its middle has passed, measured without it', () => {
  const rows = [0, 100, 200, 300].map(top => ({ top, height: 100 }));
  // Carrying the second row: still in its place until its middle passes the next row's.
  assert.equal(placeFor(rows, 1, 150), 1);
  assert.equal(placeFor(rows, 1, 149), 1);
  assert.equal(placeFor(rows, 1, 151), 2);
  assert.equal(placeFor(rows, 1, 40), 0);
  assert.equal(placeFor(rows, 1, 390), 3);
  // The place does not depend on where the gap is shown: rows below the carried one count as closed up.
  assert.equal(placeFor(rows, 0, 140), 1);
  assert.equal(placeFor(rows, 0, 160), 2);
});
