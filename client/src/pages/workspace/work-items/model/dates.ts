// Day helpers of SandboxHr's calendar (entities/calendar/model/dates), kept to what the work item views use. Days are
// written as 2026-10-23.

const pad = (value: number) => String(value).padStart(2, '0');
const iso = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/** Today in the member's own time zone. */
export const currentDay = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** The day so many days later, or earlier when negative. */
export function shiftDay(day: string, by: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + by);
  return iso(date);
}

/** The same day so many months later, kept within the month (31 March less a month is 28 February). */
export function shiftMonth(day: string, by: number): string {
  const date = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + by);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(Number(day.slice(8)), last));
  return iso(date);
}

/** Whole days from one day to another. */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
export const dayTitle = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 ${WEEKDAYS[weekdayOf(day)]}요일`;

/** The weeks shown for the month holding the day, Sunday first: whole weeks from the 1st to the last day. */
export function monthDays(day: string): string[] {
  const first = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const end = new Date(last);
  end.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));
  const days: string[] = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) days.push(iso(date));
  return days;
}

export const monthTitle = (day: string) => `${day.slice(0, 4)}년 ${Number(day.slice(5, 7))}월`;
