import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTyped, dateLabel, seoulToday } from '../src/shared/ui/date-field/date-text';

test('typed dates reject normalized impossible dates and accept leap days and compact input', () => {
  assert.equal(parseTyped('2026-02-29'), undefined);
  assert.equal(parseTyped('2026-04-31'), undefined);
  assert.equal(parseTyped('2028.2.29'), '2028-02-29');
  assert.equal(parseTyped('20261023'), '2026-10-23');
  assert.equal(parseTyped('2026/10/23'), '2026-10-23');
  assert.equal(parseTyped('2026-1'), undefined);
});

test('calendar today uses Seoul midnight and labels use the date without timezone shifts', () => {
  assert.equal(seoulToday(new Date('2026-10-22T14:59:59Z')), '2026-10-22');
  assert.equal(seoulToday(new Date('2026-10-22T15:00:00Z')), '2026-10-23');
  assert.equal(dateLabel('2026-10-23'), '2026년 10월 23일 (금)');
});
