import assert from 'node:assert/strict';
import test from 'node:test';
import { statusSteps } from '../src/entities/work-item/model/work-item';

test('each column is a step within its category, in board order, so 검토 중 and 보류 draw apart (D-111)', () => {
  const steps = statusSteps([
    { id: 'review', category: 'doing', position: 3 }, { id: 'hold', category: 'canceled', position: 6 }, { id: 'backlog', category: 'backlog', position: 0 },
    { id: 'doing', category: 'doing', position: 2 }, { id: 'canceled', category: 'canceled', position: 5 }, { id: 'done', category: 'done', position: 4 },
  ]);
  assert.deepEqual(steps.get('doing'), { rank: 0, of: 2 });
  assert.deepEqual(steps.get('review'), { rank: 1, of: 2 });
  assert.deepEqual(steps.get('canceled'), { rank: 0, of: 2 });
  assert.deepEqual(steps.get('hold'), { rank: 1, of: 2 });
  assert.deepEqual(steps.get('done'), { rank: 0, of: 1 });
});
