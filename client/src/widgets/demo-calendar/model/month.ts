import { currentDay, shiftDay } from './dates';

/**
 * The calendar's place in the URL, each left out at its default: the view (the month, the week, or on a desktop its
 * working days Monday to Friday) and the chosen day as 2026-10-23 (the demo's today); the month or week shown is the
 * one holding it. As SandboxHr's team calendar, without its panel and event links.
 */
export type CalendarView = 'month' | 'week' | 'workweek';
export type DemoCalendarSearch = { view?: CalendarView; date?: string };

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function parseDemoCalendarSearch(raw: Record<string, unknown>): DemoCalendarSearch {
  const search: DemoCalendarSearch = {};
  if (raw.view === 'week' || raw.view === 'month' || raw.view === 'workweek') search.view = raw.view;
  if (typeof raw.date === 'string' && DAY.test(raw.date)) search.date = raw.date;
  return search;
}

/** The calendar's place with a change, each part left out of the address at its default. */
export function placedSearch(view: CalendarView, day: string, next: { view?: CalendarView; date?: string } = {}): DemoCalendarSearch {
  const nextView = next.view ?? view;
  const nextDate = next.date ?? day;
  return { ...(nextView === 'month' ? {} : { view: nextView }), ...(nextDate === currentDay() ? {} : { date: nextDate }) };
}

const pad = (value: number) => String(value).padStart(2, '0');
const iso = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

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

/** The week holding the day, Sunday first, as the month's rows run. */
export function weekDays(day: string): string[] {
  const start = shiftDay(day, -new Date(`${day}T00:00:00Z`).getUTCDay());
  return Array.from({ length: 7 }, (_, index) => shiftDay(start, index));
}

/** The view a screen shows: a phone has no working week and shows the whole week instead. */
export const shownView = (view: CalendarView | undefined, isMobile: boolean): CalendarView =>
  (view === 'workweek' && isMobile ? 'week' : view ?? 'month');

/** The days a view shows around the chosen day; the working week is the week's Monday to Friday. */
export const viewDays = (view: CalendarView, day: string) =>
  (view === 'month' ? monthDays(day) : view === 'workweek' ? weekDays(day).slice(1, 6) : weekDays(day));

/** A week as 10월 18일 – 24일, the second month named only when it differs. */
export function weekTitle(days: readonly string[]): string {
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const end = first.slice(5, 7) === last.slice(5, 7) ? `${Number(last.slice(8))}일` : `${Number(last.slice(5, 7))}월 ${Number(last.slice(8))}일`;
  return `${Number(first.slice(5, 7))}월 ${Number(first.slice(8))}일 – ${end}`;
}

export const monthTitle = (day: string) => `${day.slice(0, 4)}년 ${Number(day.slice(5, 7))}월`;
