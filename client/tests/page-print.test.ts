import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const script = readFileSync(new URL('../../server/src/main/resources/pages/bit-page.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function helper(standalone = false, fonts: Promise<unknown> = Promise.resolve()) {
  let listener: (event: unknown) => void = () => {};
  let prints = 0;
  const messages: string[] = [];
  const parent = { postMessage: (message: { type: string }) => messages.push(message.type) };
  const window = { parent: parent as unknown, addEventListener: (_: string, fn: typeof listener) => { listener = fn; }, focus() {}, print() { prints++; } };
  if (standalone) window.parent = window;
  runInNewContext(script, { window, document: { fonts: { ready: fonts }, images: [] }, setTimeout() {} });
  return { parent, send: (source: unknown, data: unknown) => listener({ source, data }), prints: () => prints, messages };
}

test('page printing accepts only the embedding parent and the print command', async () => {
  const h = helper();
  h.send({}, { type: 'bit:print' }); h.send(h.parent, { type: 'other' }); h.send(h.parent, null);
  await settle(); assert.equal(h.prints(), 0);
  h.send(h.parent, { type: 'bit:print' });
  await settle(); assert.equal(h.prints(), 1); assert.deepEqual(h.messages, ['bit:print-ready']);
});

test('printing waits for fonts and coalesces repeated requests; standalone pages ignore messages', async () => {
  let ready!: () => void;
  const h = helper(false, new Promise<void>(resolve => { ready = resolve; }));
  h.send(h.parent, { type: 'bit:print' }); h.send(h.parent, { type: 'bit:print' });
  await settle(); assert.equal(h.prints(), 0);
  ready(); await settle(); assert.equal(h.prints(), 1);
  const alone = helper(true); alone.send(alone.parent, { type: 'bit:print' });
  await settle(); assert.equal(alone.prints(), 0);
});
