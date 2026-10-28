import assert from 'node:assert/strict';
import test from 'node:test';
import { activityIcon, activityText, foldTimeline, type ActivityNames } from '../src/widgets/work-item-detail/model/activity-text';
import type { TimelineEntry } from '../src/widgets/work-item-detail/api/timeline';

const names: ActivityNames = {
  people: new Map([['u1', '김하늘'], ['u2', '박서준']]),
  columns: new Map([['c1', '할 일'], ['c2', '진행 중'], ['c3', '완료']]),
  labels: new Map([['l1', '버그'], ['l2', '결정기록']]),
  priorities: { low: '낮음', medium: '보통', high: '높음', urgent: '긴급' },
  types: new Map([['t1', '작업'], ['t2', '버그'], ['t3', '스토리']]),
};
const entry = (patch: Partial<TimelineEntry>): TimelineEntry => ({
  kind: 'activity', id: 'a', at: '2026-10-25T01:00:00Z', actorId: 'u1', actorName: '김하늘', actorAgent: null, body: null, version: 0, editedAt: null,
  action: 'changed', field: null, before: null, after: null, ...patch,
});

test('activity reads as a sentence with the particle its last word takes', () => {
  assert.equal(activityText(entry({ action: 'created' }), names), '업무를 만들었습니다');
  assert.equal(activityText(entry({ field: 'priority', after: 'high' }), names), '우선순위를 높음으로 바꿨습니다');
  assert.equal(activityText(entry({ field: 'priority', after: 'medium' }), names), '우선순위를 보통으로 바꿨습니다');
  assert.equal(activityText(entry({ field: 'column', before: 'c1', after: 'c2' }), names), '상태를 할 일에서 진행 중으로 옮겼습니다');
  assert.equal(activityText(entry({ field: 'column', before: 'c2', after: null }), names), '상태를 진행 중에서 상태 없음으로 옮겼습니다');
  assert.equal(activityText(entry({ field: 'title', after: '워치 앱' }), names), "제목을 '워치 앱'으로 바꿨습니다");
  assert.equal(activityText(entry({ field: 'title', after: '버그 수정' }), names), "제목을 '버그 수정'으로 바꿨습니다");
  assert.equal(activityText(entry({ field: 'title', after: 'API' }), names), "제목을 'API'(으)로 바꿨습니다");
  assert.equal(activityText(entry({ field: 'labels', before: 'l2', after: 'l1,l2' }), names), "라벨 '버그'를 달았습니다");
  assert.equal(activityText(entry({ field: 'labels', before: 'l1,l2', after: null }), names), "라벨 '버그', '결정기록'을 뗐습니다");
  assert.equal(activityText(entry({ field: 'assignee', after: 'u2' }), names), '박서준에게 맡겼습니다');
  assert.equal(activityText(entry({ field: 'assignee', after: 'u1' }), names), '스스로 맡았습니다');
  assert.equal(activityText(entry({ field: 'dueDate', after: '2026-11-03' }), names), '기한을 11월 3일로 정했습니다');
  assert.equal(activityText(entry({ field: 'column', before: 'c1', after: 'gone' }), names), '상태를 할 일에서 이전 상태로 옮겼습니다');
});

test('a type change names both types with the particle the new one takes (D-104)', () => {
  assert.equal(activityText(entry({ field: 'type', before: 't1', after: 't2' }), names), "유형을 '작업'에서 '버그'로 바꿨습니다");
  assert.equal(activityText(entry({ field: 'type', before: 't2', after: 't3' }), names), "유형을 '버그'에서 '스토리'로 바꿨습니다");
  assert.equal(activityText(entry({ field: 'type', before: 'gone', after: 't1' }), names), "유형을 '지워진 유형'에서 '작업'으로 바꿨습니다");
  assert.equal(activityIcon(entry({ field: 'type', before: 't1', after: 't2' })), 'tasks');
});

test('workspace status history retains its readable category after project removal', () => {
  assert.equal(activityText(entry({ field: 'column', before: 'todo', after: 'doing' }), names), '상태를 할 일에서 진행 중으로 옮겼습니다');
  assert.equal(activityText(entry({ field: 'column', before: 'doing', after: 'done' }), names), '상태를 진행 중에서 완료로 옮겼습니다');
});

test("one person's description edits within half an hour read as one line, at the last", () => {
  const edit = (id: string, at: string, actorId = 'u1') => entry({ id, at, actorId, field: 'description' });
  const lines = foldTimeline([
    edit('a', '2026-10-25T01:00:00Z'), edit('b', '2026-10-25T01:10:00Z'), edit('c', '2026-10-25T01:20:00Z', 'u2'),
    edit('d', '2026-10-25T02:30:00Z', 'u2'), entry({ id: 'e', kind: 'comment', at: '2026-10-25T02:31:00Z' }), edit('f', '2026-10-25T02:32:00Z', 'u2'),
  ]);
  assert.deepEqual(lines.map(line => line.id), ['b', 'c', 'd', 'e', 'f']);
});
