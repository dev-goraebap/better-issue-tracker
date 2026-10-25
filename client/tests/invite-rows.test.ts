import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyRow, linksText, MAX_ROWS, pasteInto, validateRows } from '../src/pages/workspace/members-invite/model/rows';

test('several addresses pasted into a row fill it and the rows after, with its role', () => {
  const first = { ...emptyRow('viewer'), email: '' };
  const last = { ...emptyRow(), email: 'kept@orum.test' };
  const rows = pasteInto([first, last], first.key, 'a@orum.test\nb@orum.test, c@orum.test\td@orum.test')!;
  assert.deepEqual(rows.map(row => row.email), ['a@orum.test', 'b@orum.test', 'c@orum.test', 'd@orum.test', 'kept@orum.test']);
  assert.deepEqual(rows.slice(0, 4).map(row => row.role), ['viewer', 'viewer', 'viewer', 'viewer']);
  assert.equal(rows[0]!.key, first.key);
  assert.equal(pasteInto([first], first.key, 'one@orum.test'), null);
  const many = Array.from({ length: MAX_ROWS + 5 }, (_, index) => `p${index}@orum.test`).join('\n');
  assert.equal(pasteInto([first], first.key, many)!.length, MAX_ROWS);
});

test('rows say what is wrong: not an address, the same address above, or nothing at all', () => {
  const rows = [{ ...emptyRow(), email: 'a@orum.test' }, { ...emptyRow(), email: 'A@orum.test ' }, { ...emptyRow(), email: 'nope' }, emptyRow()];
  const errors = validateRows(rows);
  assert.equal(errors.get(rows[1]!.key), '위에 같은 이메일이 있습니다.');
  assert.equal(errors.get(rows[2]!.key), '이메일 형식이 아닙니다.');
  assert.equal(errors.has(rows[0]!.key) || errors.has(rows[3]!.key), false);
  const blank = [emptyRow(), emptyRow()];
  assert.equal(validateRows(blank).get(blank[0]!.key), '초대할 이메일을 입력해 주세요.');
});

test('every link made copies as one email and link per line', () => {
  assert.equal(linksText([
    { key: '1', email: 'a@orum.test', role: 'member', link: 'http://x/join#token=1' },
    { key: '2', email: 'b@orum.test', role: 'member', error: '이미 구성원입니다' },
  ]), 'a@orum.test\thttp://x/join#token=1');
});
