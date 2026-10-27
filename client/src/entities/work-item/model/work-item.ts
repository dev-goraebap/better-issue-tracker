import { beforeText } from '@/shared/lib/date-text';
import type { EventTime, Repeat, Weekday } from '@/shared/ui';
import type { ColumnCategory, WorkItem } from '../api/work-item';

/** A work item is a work item (D-066): no fixed types, only the properties it has and its labels. */
export type Priority = NonNullable<WorkItem['priority']>;
/** Where a work item stands across projects: its column's category, or none (no status, D-066). */
export type StatusCategory = ColumnCategory | 'none';
export const CATEGORY_LABELS: Record<StatusCategory, string> = { todo: '할 일', doing: '진행 중', done: '완료', none: '상태 없음' };
export const CATEGORIES: readonly ColumnCategory[] = ['todo', 'doing', 'done'];
export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
/** A label filter's value for the workspace's system label (결정기록), whatever its id in a workspace. */
export const SYSTEM_LABEL = 'system';

export const categoryOf = (item: Pick<WorkItem, 'columnCategory'>): StatusCategory => item.columnCategory ?? 'none';

const pad = (value: number) => String(value).padStart(2, '0');
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** A moment's day in the member's own time zone, as 2026-10-28. */
export const localDay = (moment: string) => { const at = new Date(moment); return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`; };
/** A moment's time of day in the member's own time zone, as 10:00. */
export const localTime = (moment: string) => { const at = new Date(moment); return `${pad(at.getHours())}:${pad(at.getMinutes())}`; };
const dayWords = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return `${month}월 ${date}일 (${WEEKDAYS[new Date(Date.UTC(year!, month! - 1, date!)).getUTCDay()]})`;
};

/**
 * The days a work item covers, for a calendar or a timeline: start to due, or its one day; a timed event its days in
 * the member's own time zone (D-092); none without a day.
 */
export function spanOf(item: Pick<WorkItem, 'startDate' | 'dueDate' | 'startsAt' | 'endsAt'>): { start: string; end: string } | undefined {
  if (item.startsAt) {
    const start = localDay(item.startsAt);
    return { start, end: item.endsAt ? localDay(item.endsAt) : start };
  }
  const start = item.startDate ?? item.dueDate;
  const end = item.dueDate ?? item.startDate;
  return start && end ? { start, end } : undefined;
}

/** When an event happens, as its page says it (D-092): 10월 28일 (화) 10:00–11:00, or 10월 28일 (화) 종일; none for a task. */
export function eventWhen(item: Pick<WorkItem, 'kind' | 'startDate' | 'dueDate' | 'startsAt' | 'endsAt' | 'allDay'>): string | undefined {
  if (item.kind !== 'event') return undefined;
  if (item.startsAt) {
    const day = localDay(item.startsAt);
    const end = item.endsAt && (localDay(item.endsAt) === day ? localTime(item.endsAt) : `${dayWords(localDay(item.endsAt))} ${localTime(item.endsAt)}`);
    return `${dayWords(day)} ${localTime(item.startsAt)}${end ? `–${end}` : ''}`;
  }
  const span = spanOf(item);
  if (!span) return undefined;
  return span.start === span.end ? `${dayWords(span.start)} 종일` : `${dayWords(span.start)} – ${dayWords(span.end)} 종일`;
}

/** A work item's page, for what navigates rather than links (a calendar's bar, a toast's 보기). */
export const workItemHref = (workspaceId: string, item: Pick<WorkItem, 'id' | 'projectId'>) => `/workspaces/${workspaceId}/projects/${item.projectId}/work-items/${item.id}`;

/** An event's time as the picker holds it, in the member's own time zone (D-092). */
export function eventTimeOf(item: Pick<WorkItem, 'startDate' | 'dueDate' | 'startsAt' | 'endsAt' | 'allDay'>): EventTime {
  if (item.startsAt) return { day: localDay(item.startsAt), start: localTime(item.startsAt), end: item.endsAt ? localTime(item.endsAt) : undefined, allDay: false };
  return { day: item.startDate ?? item.dueDate ?? undefined, allDay: item.allDay || !!(item.startDate ?? item.dueDate) };
}

/**
 * An event's time for the API, from what the member picked: a day without a start time is that whole day, so the day
 * is never lost; times are the member's own and leave as moments.
 */
/** An event's reminder in words (BIT-39): 시작할 때, 10분 전, 1시간 전, 1일 전. */
export const reminderText = (minutes: number) => (minutes === 0 ? '시작할 때' : beforeText(minutes));

/** The rule a work item repeats by, as the repeat pill takes it (D-092); none when it does not repeat. */
export function repeatOf(item: Pick<WorkItem, 'recurrence'>): Repeat | undefined {
  const rule = item.recurrence;
  return rule ? { frequency: rule.frequency, interval: rule.interval, weekdays: rule.weekdays as Weekday[], untilOn: rule.untilOn ?? undefined } : undefined;
}

/** A rule as the server takes it, in the member's own time zone, over the version the member saw. */
export function repeatBody(repeat: Repeat, expectedVersion: number) {
  return {
    expectedVersion, frequency: repeat.frequency, interval: repeat.interval, weekdays: repeat.weekdays.length > 0 ? repeat.weekdays : null,
    untilOn: repeat.untilOn ?? null, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function eventFields(time: EventTime) {
  if (!time.day) return { startDate: null, dueDate: null, startsAt: null, endsAt: null, allDay: false };
  if (time.allDay || !time.start) return { startDate: time.day, dueDate: time.day, startsAt: null, endsAt: null, allDay: true };
  const moment = (at?: string) => (at ? new Date(`${time.day}T${at}`).toISOString() : null);
  return { startDate: null, dueDate: null, startsAt: moment(time.start), endsAt: moment(time.end), allDay: false };
}
