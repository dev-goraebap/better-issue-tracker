import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { ApiError, authError, readJson } from '../src/shared/api/http';

test('JSON reads send their Accept header and preserve the response', async () => {
  const server = createServer((request, response) => {
    assert.equal(request.headers.accept, 'application/json');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{"objectStorage":true,"mail":false}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    assert.deepEqual(await readJson(`http://127.0.0.1:${address.port}`), { objectStorage: true, mail: false });
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('problem responses expose the code and trace without displaying server detail', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(503, { 'Content-Type': 'application/problem+json' });
    response.end('{"code":"MAIL_NOT_CONFIGURED","traceId":"test-trace","detail":"internal detail"}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    await assert.rejects(readJson(`http://127.0.0.1:${address.port}`), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 503);
      assert.equal(error.code, 'MAIL_NOT_CONFIGURED');
      assert.equal(error.traceId, 'test-trace');
      assert.ok(!error.message.includes('internal detail'));
      return true;
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('aborted reads propagate cancellation', async () => {
  const signal = AbortSignal.abort();
  await assert.rejects(readJson('http://127.0.0.1:1', signal), { name: 'AbortError' });
});

test('a repository host refusal shows its reason while other details stay hidden', () => {
  assert.equal(authError(new ApiError(400, 'INTEGRATION_HOST_REFUSED', undefined, '토큰이 거절되었습니다')), '토큰이 거절되었습니다');
  assert.equal(authError(new ApiError(400, 'FILE_PICTURE_INVALID', undefined, '사진을 읽을 수 없습니다')), '사진을 읽을 수 없습니다');
  assert.ok(!authError(new ApiError(503, 'MAIL_NOT_CONFIGURED', undefined, 'internal detail')).includes('internal detail'));
});
