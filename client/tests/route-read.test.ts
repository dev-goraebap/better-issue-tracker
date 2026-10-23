import assert from 'node:assert/strict';
import test from 'node:test';
import { CancelledError, QueryClient, QueryObserver } from '@tanstack/react-query';
import { routeRead } from '../src/app/model/route-read';

test('a route guard restarts its shared read after the outgoing observer cancels it', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); let calls = 0;
  const options = { queryKey: ['route-guard'], queryFn: ({ signal }: { signal: AbortSignal }) => { calls++; if (calls > 1) return Promise.resolve('current membership'); return new Promise<string>((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))); } };
  const observer = new QueryObserver(client, options); const unsubscribe = observer.subscribe(() => {});
  const result = routeRead(() => client.fetchQuery(options)); unsubscribe();
  assert.equal(await result, 'current membership'); assert.equal(calls, 2); client.clear();
});

test('route reads do not retry network/authorization failures or repeat cancellation indefinitely', async () => {
  let calls = 0; const failure = new Error('403');
  await assert.rejects(routeRead(async () => { calls++; throw failure; }), error => error === failure); assert.equal(calls, 1);
  calls = 0; await assert.rejects(routeRead(async () => { calls++; throw new CancelledError(); })); assert.equal(calls, 2);
});
