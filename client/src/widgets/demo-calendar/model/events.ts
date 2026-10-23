import { DECISIONS, projectsIn, SESSIONS, WORK_ITEMS } from '@/entities/demo-sample';
import { shiftDay, weekdayOf } from './dates';

/**
 * What the demo's calendar shows, in place of SandboxHr's company and personal events, leave and overtime: the team's
 * own events (a sprint review, a release week), sessions at their time, work items on their due day (the last stretch
 * before it for a few) and decisions on the day they were made. Each opens its demo page when it has one.
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
};

export const KIND_NAMES: Record<DemoEventKind, string> = { team: '팀 일정', session: '세션', work: '작업 마감', decision: '결정' };

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

/** A sample moment (UTC ISO) as the wall clock in Seoul. */
const seoul = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 19);
const at = (day: string, time: string) => `${day}T${time}:00`;
const allDay = (first: string, last: string) => ({ allDay: true, start: at(first, '00:00'), end: at(shiftDay(last, 1), '00:00') });
/** An hour after the moment, kept within its day. */
const hourAfter = (moment: string) => {
  const minutes = Math.min(24 * 60, Number(moment.slice(11, 13)) * 60 + Number(moment.slice(14, 16)) + 60);
  return minutes === 24 * 60 ? at(shiftDay(moment.slice(0, 10), 1), '00:00') : at(moment.slice(0, 10), `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
};

/** Every day from the first to the last on the given weekday. */
const weekly = (first: string, last: string, weekday: number) => {
  const days: string[] = [];
  for (let day = first; day <= last; day = shiftDay(day, 1)) if (weekdayOf(day) === weekday) days.push(day);
  return days;
};

/** The team's own events, made by hand so the month around the demo's today looks lived in. */
function teamEvents(): DemoEvent[] {
  const reviews = weekly('2026-09-01', '2026-12-31', 5).map(day => ({
    id: `team-review-${day}`, kind: 'team' as const, title: '스프린트 리뷰', allDay: false, start: at(day, '16:00'), end: at(day, '17:00'), recurring: true,
  }));
  const plannings = weekly('2026-09-01', '2026-12-31', 1).filter((_, index) => index % 2 === 0).map(day => ({
    id: `team-planning-${day}`, kind: 'team' as const, title: '스프린트 계획', allDay: false, start: at(day, '10:00'), end: at(day, '11:00'), recurring: true,
  }));
  return [
    ...reviews, ...plannings,
    { id: 'team-release', kind: 'team', title: '릴리스 주간 · v0.4', ...allDay('2026-10-27', '2026-10-29'), recurring: false },
    { id: 'team-retro', kind: 'team', title: '분기 회고', allDay: false, start: at('2026-10-23', '14:00'), end: at('2026-10-23', '15:30'), recurring: false },
    { id: 'team-offsite', kind: 'team', title: '팀 워크숍', ...allDay('2026-11-05', '2026-11-06'), recurring: false },
  ];
}

/** The calendar's events for a workspace: the team's own, then those its projects' sample data gives. */
export function buildDemoEvents(workspaceId: string): DemoEvent[] {
  const projects = new Set(projectsIn(workspaceId).map(project => project.id));
  const base = `/demo/w/${workspaceId}/p`;
  const sessions: DemoEvent[] = SESSIONS.filter(session => projects.has(session.projectId)).map(session => {
    const start = seoul(session.occurredAt);
    return { id: `session-${session.id}`, kind: 'session', title: `${session.key} ${session.title}`, allDay: false, start, end: hourAfter(start), recurring: false,
      href: `${base}/${session.projectId}/sessions` };
  });
  // The first few due items show the stretch before their due day (from when they were made, four days at most).
  const due = WORK_ITEMS.filter(item => projects.has(item.projectId) && item.dueAt);
  const work: DemoEvent[] = due.map((item, index) => {
    const last = seoul(item.dueAt!).slice(0, 10);
    const made = seoul(item.createdAt).slice(0, 10);
    const first = index < 3 ? (made > shiftDay(last, -4) ? made : shiftDay(last, -4)) : last;
    return { id: `work-${item.id}`, kind: 'work', title: `${item.key} ${item.title}`, ...allDay(first, last), recurring: false,
      href: `${base}/${item.projectId}/work-items/${item.id}` };
  });
  const decisions: DemoEvent[] = DECISIONS.filter(decision => projects.has(decision.projectId) && decision.decidedAt).map(decision => {
    const day = seoul(decision.decidedAt!).slice(0, 10);
    return { id: `decision-${decision.id}`, kind: 'decision', title: `${decision.key} ${decision.title}`, ...allDay(day, day), recurring: false,
      href: `${base}/${decision.projectId}/decisions` };
  });
  return [...teamEvents(), ...sessions, ...work, ...decisions];
}
