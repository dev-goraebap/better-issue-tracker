import { useSyncExternalStore } from 'react';
import { DECISIONS, projectOf, SESSIONS, WORK_ITEMS, type Decision, type Priority, type Status } from './mock';

/**
 * Everything the demo tracks as one kind of thing, the issue (D-066): no fixed types, only properties an issue has or
 * has not, and labels. Which views show it follows from its properties: a list shows every issue, a calendar those with
 * a start or a due day, a board those with a status, a timeline those with a day. 결정기록 is the one system label: an
 * issue carrying it has a decision's state, its progress and the alternatives it rejected.
 */
export type DecisionState = Decision['status'];
export type Issue = {
  id: string; projectId: string; key: string; title: string; labels: string[];
  status?: Status; priority?: Priority; assigneeId?: string;
  /** When it takes place (a meeting, a release week): a Seoul wall-clock moment or, all day, a date. */
  startAt?: string; endAt?: string; allDay?: boolean;
  dueAt?: string;
  createdAt: string; updatedAt: string; comments: number;
  /** What was said or found, for a note. */
  summary?: string; participantIds?: string[];
  decision?: { state: DecisionState; progress: [done: number, total: number]; rejected: string[] };
};

/** The system label: it gives an issue a decision's fields and cannot be removed from the workspace (D-066). */
export const DECISION_LABEL = '결정기록';
export const DECISION_STATES: Record<DecisionState, string> = { proposed: '제안', accepted: '확정', superseded: '대체됨' };
/** The workspace's labels: 결정기록 first, then the ones members made. */
export const ISSUE_LABELS = [DECISION_LABEL, '회의록', '세션 요약', '일정', '서버', '화면', 'MCP', '문서', '배포', '버그'];
export const LABEL_COLORS: Record<string, string> = {
  [DECISION_LABEL]: '#5e6ad2', 회의록: '#26b5ce', '세션 요약': '#bb87fc', 일정: '#f2c94c', 서버: '#4e75fc', 화면: '#4cb782', MCP: '#a86fdf', 문서: '#4ea7fc', 배포: '#f2994a', 버그: '#eb5757',
};

const seoulDay = (offset: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 23 + offset, hour, minute)).toISOString().slice(0, 16).replace('Z', '');
const REJECTED: Record<string, string[]> = {
  d1: ['모든 컨트롤을 50px로 통일', '화면마다 크기를 따로 지정'],
  d2: ['정정 이력을 한 행에 통째로 저장'],
  d3: ['세션과 결정을 따로 저장하고 나중에 연결'],
  d6: ['응답 크기 제한 없이 전부 돌려주기'],
};

/** Keys after a project's highest so far, for what the sample kept apart under its own numbers (notes, decisions). */
function keyer() {
  const next = new Map<string, number>();
  for (const item of WORK_ITEMS) {
    const [prefix, number] = item.key.split('-');
    next.set(prefix!, Math.max(next.get(prefix!) ?? 0, Number(number)));
  }
  return (projectId: string) => {
    const prefix = projectOf(projectId)?.key ?? 'NEW';
    const number = (next.get(prefix) ?? 0) + 1;
    next.set(prefix, number);
    return `${prefix}-${number}`;
  };
}

function sampleIssues(): Issue[] {
  const nextKey = keyer();
  const work: Issue[] = WORK_ITEMS.map(item => ({ ...item, labels: [...item.labels] }));
  const notes: Issue[] = SESSIONS.map(session => ({
    id: session.id, projectId: session.projectId, key: nextKey(session.projectId), title: session.title,
    labels: [session.type === 'meeting' ? '회의록' : '세션 요약'], startAt: new Date(Date.parse(session.occurredAt) + 9 * 3_600_000).toISOString().slice(0, 16),
    endAt: new Date(Date.parse(session.occurredAt) + 10 * 3_600_000).toISOString().slice(0, 16), allDay: false,
    createdAt: session.occurredAt, updatedAt: session.occurredAt, comments: session.decisions, summary: session.summary, participantIds: session.participantIds,
  }));
  const decisions: Issue[] = DECISIONS.map(decision => ({
    id: decision.id, projectId: decision.projectId, key: nextKey(decision.projectId), title: decision.title, labels: [DECISION_LABEL],
    assigneeId: decision.ownerId, createdAt: decision.decidedAt ?? new Date(Date.UTC(2026, 9, 22, 1)).toISOString(),
    updatedAt: decision.decidedAt ?? new Date(Date.UTC(2026, 9, 22, 1)).toISOString(), comments: 0,
    decision: { state: decision.status, progress: decision.progress, rejected: REJECTED[decision.id] ?? [] },
  }));
  // A few of the team's plans, as issues with a time: what used to be 일정.
  const plans: Issue[] = [
    { id: 'e1', projectId: 'p-core', title: '분기 회고', labels: ['일정'], startAt: seoulDay(0, 14), endAt: seoulDay(0, 15, 30), allDay: false, participantIds: ['u1', 'u2', 'u3', 'u4'] },
    { id: 'e2', projectId: 'p-core', title: '릴리스 주간 · v0.4', labels: ['일정', '배포'], startAt: '2026-10-27', endAt: '2026-10-29', allDay: true, status: 'todo' as const, priority: 'high' as const, assigneeId: 'u1' },
    { id: 'e3', projectId: 'p-core', title: '스프린트 리뷰', labels: ['일정'], startAt: seoulDay(7, 16), endAt: seoulDay(7, 17), allDay: false, participantIds: ['u1', 'u2', 'u3'] },
    { id: 'e4', projectId: 'p-mcp', title: 'MCP 도구 데모', labels: ['일정'], startAt: seoulDay(4, 11), endAt: seoulDay(4, 12), allDay: false, participantIds: ['u2', 'a1'] },
  ].map(plan => ({ ...plan, key: nextKey(plan.projectId), createdAt: new Date(Date.UTC(2026, 9, 20, 1)).toISOString(), updatedAt: new Date(Date.UTC(2026, 9, 21, 1)).toISOString(), comments: 0 }));
  return [...work, ...notes, ...decisions, ...plans];
}

/** The issues for the demo's visit: the sample's and any made in the 새 이슈 dialog, kept in memory so every view agrees. */
export const ISSUES: Issue[] = sampleIssues();
let version = 0;
const listeners = new Set<() => void>();

/** Every issue, read again whenever one is made. */
export function useIssues(): readonly Issue[] {
  useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => version);
  return ISSUES;
}
export const issueOf = (id?: string) => ISSUES.find(issue => issue.id === id);

/** Adds an issue to a project under its next key (BIT-130, say), the newest first, and returns it. */
export function addIssue(draft: Omit<Issue, 'id' | 'key' | 'createdAt' | 'updatedAt' | 'comments'>): Issue {
  const prefix = `${projectOf(draft.projectId)?.key ?? 'NEW'}-`;
  const next = Math.max(0, ...ISSUES.filter(issue => issue.key.startsWith(prefix)).map(issue => Number(issue.key.slice(prefix.length)) || 0)) + 1;
  const now = new Date(Date.UTC(2026, 9, 23, 6)).toISOString();
  const issue: Issue = {
    ...draft, id: `i-${Date.now().toString(36)}`, key: `${prefix}${next}`, createdAt: now, updatedAt: now, comments: 0,
    decision: draft.labels.includes(DECISION_LABEL) ? draft.decision ?? { state: 'proposed', progress: [0, 0], rejected: [] } : undefined,
  };
  ISSUES.unshift(issue);
  version += 1;
  listeners.forEach(listener => listener());
  return issue;
}

/** The day an issue falls on for a calendar or a timeline: its start, else its due day (Seoul dates). */
export const issueDays = (issue: Issue): { first: string; last: string } | undefined => {
  const due = issue.dueAt && new Date(Date.parse(issue.dueAt) + 9 * 3_600_000).toISOString().slice(0, 10);
  if (issue.startAt) return { first: issue.startAt.slice(0, 10), last: (issue.endAt ?? issue.startAt).slice(0, 10) };
  return due ? { first: due, last: due } : undefined;
};

