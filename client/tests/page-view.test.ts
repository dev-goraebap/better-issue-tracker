import assert from 'node:assert/strict';
import test from 'node:test';
import { pageVersionQuery, type PageVersion } from '../src/pages/workspace/document/api/page-version';
import { parseDocumentSearch, shownVersion } from '../src/pages/workspace/document/model/search';
import { RENEW_FLOOR_MS, renewIn } from '../src/pages/workspace/document/model/view-renewal';

const minute = 60_000;

test('a page address keeps the version it shows and drops what is not one', () => {
  assert.deepEqual(parseDocumentSearch({ v: 2 }), { v: 2 });
  assert.deepEqual(parseDocumentSearch({ v: '3' }), { v: 3 });
  for (const v of [0, -1, 1.5, '02x', 'latest', '', null, Number.MAX_VALUE, '9999999999']) assert.deepEqual(parseDocumentSearch({ v }), { v: undefined }, String(v));
  assert.deepEqual(parseDocumentSearch({}), { v: undefined });
});

test('a page shows the version its address names, else its latest', () => {
  assert.equal(shownVersion({ v: 1 }, 3), 1);
  assert.equal(shownVersion({}, 3), 3);
});

test('a view address is asked for again five minutes before it ends', () => {
  const issued = 1_000_000;
  assert.equal(renewIn(issued, issued + 60 * minute, issued), 55 * minute);
  assert.equal(renewIn(issued, issued + 60 * minute, issued + 50 * minute), 5 * minute);
});

test('a short-lived address is renewed halfway, and a late one only after a pause', () => {
  const issued = 1_000_000;
  assert.equal(renewIn(issued, issued + 4 * minute, issued), 2 * minute);
  assert.equal(renewIn(issued, issued + 60 * minute, issued + 58 * minute), RENEW_FLOOR_MS);
  assert.equal(renewIn(issued, issued - minute, issued), RENEW_FLOOR_MS);
});

test('a version read stays fresh until its address is due and then renews on a timer', () => {
  const issued = Date.now();
  const data = { viewUrl: '/pages/v/t/index.html', viewExpiresAt: new Date(issued + 60 * minute).toISOString() } as PageVersion;
  const options = pageVersionQuery('w', 'd', 2);
  const query = { state: { data, dataUpdatedAt: issued } } as never;
  const staleTime = options.staleTime as (q: never) => number;
  const interval = options.refetchInterval as (q: never) => number | false;
  assert.deepEqual(options.queryKey, ['workspace', 'w', 'page-view', 'd', 2]);
  assert.equal(staleTime(query), 55 * minute);
  const wait = interval(query);
  assert.ok(typeof wait === 'number' && wait > 54 * minute && wait <= 55 * minute, String(wait));
  assert.equal(interval({ state: { data: undefined, dataUpdatedAt: 0 } } as never), false);
});
