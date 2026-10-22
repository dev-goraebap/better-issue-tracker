import assert from 'node:assert/strict';
import test from 'node:test';
import { captureJoinEntry, initialJoinToken, forgetInitialToken, subscribeJoinToken } from '../src/pages/entry/join/model/fragment';

test('initial and same-document invitation secrets are stripped before routing and kept only in local handoff', () => {
  let keptUrl = ''; const state = { safe: 'history metadata' };
  const location = { pathname: '/join', search: '', hash: '#token=biti_test-fragment' };
  const handlers = new Map<string, () => void>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location, addEventListener: (event: string, listener: () => void) => handlers.set(event, listener), history: { state, replaceState: (keptState: unknown, _title: string, url: string) => { assert.equal(keptState, state); keptUrl = url; location.hash = ''; } } } });
  let unsubscribe = () => {};
  try {
    captureJoinEntry(); assert.equal(keptUrl, '/join'); assert.equal(initialJoinToken(), 'biti_test-fragment'); forgetInitialToken(); assert.equal(initialJoinToken(), '');
    let local = ''; unsubscribe = subscribeJoinToken(token => { assert.equal(location.hash, ''); local = token; });
    location.hash = '#token=biti_reopened-link'; handlers.get('popstate')!();
    assert.equal(local, 'biti_reopened-link'); assert.equal(initialJoinToken(), '');
    location.hash = '#token=biti_another-link'; handlers.get('hashchange')!();
    assert.equal(local, 'biti_another-link'); assert.equal(location.hash, '');
  } finally { unsubscribe(); forgetInitialToken(); Reflect.deleteProperty(globalThis, 'window'); }
});
