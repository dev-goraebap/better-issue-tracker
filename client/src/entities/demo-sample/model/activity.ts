import { DECISIONS, PEOPLE, projectsIn, SESSIONS, WORK_ITEMS } from './mock';

/** The demo's today in Seoul, which the sample is dated around. */
const TODAY = '2026-10-23';
const seoulDay = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 10);
const shift = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00Z`) + by * 86_400_000).toISOString().slice(0, 10);

export type Contribution = { day: string; count: number };

/**
 * A year of the workspace's contributions by day (work made or changed, 결정기록, notes), Sunday-first weeks ending this
 * week, as GitHub's contribution graph reads them. The sample's few dated records are spread over a steady, seeded
 * background so the year looks lived in; the same workspace always draws the same year.
 */
export function contributionsOf(workspaceId: string): Contribution[] {
  const projects = new Set(projectsIn(workspaceId).map(project => project.id));
  const counted = new Map<string, number>();
  const add = (iso?: string) => { if (iso) { const day = seoulDay(iso); counted.set(day, (counted.get(day) ?? 0) + 1); } };
  WORK_ITEMS.filter(item => projects.has(item.projectId)).forEach(item => { add(item.createdAt); add(item.updatedAt); });
  DECISIONS.filter(decision => projects.has(decision.projectId)).forEach(decision => add(decision.decidedAt));
  SESSIONS.filter(session => projects.has(session.projectId)).forEach(session => add(session.occurredAt));
  let seed = [...workspaceId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const weekday = new Date(`${TODAY}T00:00:00Z`).getUTCDay();
  const first = shift(TODAY, -(52 * 7 + weekday));
  const days: Contribution[] = [];
  for (let day = first; day <= TODAY; day = shift(day, 1)) {
    const weekend = [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
    const base = random() < (weekend ? 0.25 : 0.7) ? Math.floor(random() * (weekend ? 3 : 7)) : 0;
    days.push({ day, count: base + (counted.get(day) ?? 0) });
  }
  return days;
}

export type Activity = { id: string; actorId: string; verb: string; key: string; title: string; projectId: string; at: string;
  /** What it points at, for its link. */
  target: { kind: 'work'; id: string } | { kind: 'decision' } | { kind: 'note' } };

/** The workspace's latest activity, newest first: work made and changed, 결정기록 made, notes written. */
export function activityOf(workspaceId: string, limit = 12): Activity[] {
  const projects = new Set(projectsIn(workspaceId).map(project => project.id));
  const user = (id?: string) => (PEOPLE.some(person => person.id === id) ? id! : 'u1');
  const all: Activity[] = [
    ...WORK_ITEMS.filter(item => projects.has(item.projectId)).flatMap(item => [
      { id: `${item.id}-made`, actorId: user(item.assigneeId), verb: '작업을 만들었습니다', key: item.key, title: item.title, projectId: item.projectId, at: item.createdAt, target: { kind: 'work' as const, id: item.id } },
      ...(item.updatedAt !== item.createdAt ? [{ id: `${item.id}-changed`, actorId: user(item.assigneeId), verb: item.status === 'done' ? '작업을 끝냈습니다' : '작업을 고쳤습니다',
        key: item.key, title: item.title, projectId: item.projectId, at: item.updatedAt, target: { kind: 'work' as const, id: item.id } }] : []),
    ]),
    ...DECISIONS.filter(decision => projects.has(decision.projectId) && decision.decidedAt).map(decision => ({ id: `${decision.id}-made`, actorId: decision.ownerId,
      verb: '결정기록을 남겼습니다', key: decision.key, title: decision.title, projectId: decision.projectId, at: decision.decidedAt!, target: { kind: 'decision' as const } })),
    ...SESSIONS.filter(session => projects.has(session.projectId)).map(session => ({ id: `${session.id}-made`, actorId: session.participantIds[0]!,
      verb: '노트를 썼습니다', key: session.key, title: session.title, projectId: session.projectId, at: session.occurredAt, target: { kind: 'note' as const } })),
  ];
  return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
