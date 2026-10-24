import { DECISION_LABEL, issueDays, type Issue } from '@/entities/demo-sample';
import { shiftDay, weekdayOf } from './dates';

/**
 * What the demo's calendar shows, in place of SandboxHr's company and personal events, leave and overtime: the issues of
 * the view in sight that have a day (D-066), at their time when they have one (a meeting), else across their days (a
 * release week) or on their due day. An event's kind only picks its colour: a plan (일정), a note, a decision or work.
 * Each opens its issue's page.
 */
export type DemoEventKind = 'team' | 'session' | 'work' | 'decision';
export type DemoEvent = {
  /** One occurrence of a repeating event has an id of its own. */
  id: string; kind: DemoEventKind; title: string; allDay: boolean;
  /** Wall-clock moments in Seoul; an all-day event ends at the midnight after its last day. */
  start: string; end: string;
  recurring: boolean;
  /** An occurrence of a repeating event moved on its own. */
  changed?: boolean;
  /** The demo page it opens, if any. */
  href?: string;
  /** The project it belongs to; the workspace's own events have none. */
  projectId?: string;
};

export const KIND_NAMES: Record<DemoEventKind, string> = { team: '일정', session: '노트', work: '마감', decision: '결정기록' };

export const eventKey = (event: Pick<DemoEvent, 'id'>) => event.id;

/**
 * Whether an event may be dragged to another time or day: the team's plans and work's due days move; a session that
 * took place and a decision made are records, so they stay. Moves last while the page is open (nothing is saved).
 */
export const canDrag = (event: Pick<DemoEvent, 'kind'>) => event.kind === 'team' || event.kind === 'work';

/** Public holidays around the sample's dates, as SandboxHr's calendar marks them; a holiday reads red. */
export const HOLIDAYS: ReadonlyMap<string, string> = new Map([
  ['2026-09-24', '추석 연휴'], ['2026-09-25', '추석'], ['2026-09-26', '추석 연휴'],
  ['2026-10-03', '개천절'], ['2026-10-05', '대체공휴일'], ['2026-10-09', '한글날'], ['2026-12-25', '성탄절'],
]);

const at = (day: string, time: string) => `${day}T${time}:00`;
const allDay = (first: string, last: string) => ({ allDay: true, start: at(first, '00:00'), end: at(shiftDay(last, 1), '00:00') });
/** An hour after the moment, kept within its day. */
const hourAfter = (moment: string) => {
  const minutes = Math.min(24 * 60, Number(moment.slice(11, 13)) * 60 + Number(moment.slice(14, 16)) + 60);
  return minutes === 24 * 60 ? at(shiftDay(moment.slice(0, 10), 1), '00:00') : at(moment.slice(0, 10), `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
};


/** An issue's events, each opening its page: at its time, across its days, or on its due day. */
export function buildIssueEvents(workspaceId: string, issues: readonly Issue[]): DemoEvent[] {
  return issues.flatMap(issue => {
    const days = issueDays(issue);
    if (!days) return [];
    const kind: DemoEventKind = issue.labels.includes(DECISION_LABEL) ? 'decision'
      : issue.labels.some(label => label === '회의록' || label === '세션 요약') ? 'session' : issue.labels.includes('일정') ? 'team' : 'work';
    const when = issue.startAt && !issue.allDay && issue.startAt.length > 10
      ? { allDay: false, start: `${issue.startAt}:00`, end: issue.endAt ? `${issue.endAt}:00` : hourAfter(`${issue.startAt}:00`) }
      : allDay(days.first, days.last);
    return [{ id: issue.id, kind, title: `${issue.key} ${issue.title}`, ...when, recurring: false,
      href: `/demo/w/${workspaceId}/p/${issue.projectId}/work-items/${issue.id}`, projectId: issue.projectId }];
  });
}
