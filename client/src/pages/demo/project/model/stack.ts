import type { DemoEvent } from './events';
import { layoutWeeks, type Bar, type PlacedBar } from './layout';

// SandboxHr's month stacking (team-calendar/model/stack) with events alone: its leave lanes are left out.

/** A week's bars in their lanes, every lane kept. */
export function stackedWeek(bars: readonly Bar[], week: readonly string[]): { events: PlacedBar[]; eventLanes: number } {
  const events = layoutWeeks(bars, week, Infinity)[0]!;
  return { events: events.bars, eventLanes: events.lanes };
}

/** A week of the month as its rows: event lanes, then lines of timed events, then a line of what is left. */
export type MonthWeek = {
  days: string[];
  /** Bars to draw, their lane counted from the first bar row. */
  bars: PlacedBar[];
  eventLanes: number; timedLines: number;
  /** Each day's timed events that are shown. */
  timed: DemoEvent[][];
  /** Per day, events (bars or timed) not shown, and whether the week keeps a last line for them. */
  hiddenEvents: number[]; hasFoot: boolean;
};

/**
 * A day's timed events with its own ones before the occurrences of repeating series, each by time: a series met every
 * week would otherwise take the first line of every cell and push what is particular to the day into "+N개 더".
 */
export const ownFirst = (events: readonly DemoEvent[]) =>
  [...events].sort((a, b) => Number(a.recurring) - Number(b.recurring));

/** Per day, how many bars sit past the lanes shown. */
export function hiddenBars(placed: readonly PlacedBar[], lanes: number, days: number): number[] {
  return Array.from({ length: days }, (_, column) =>
    placed.filter(bar => bar.lane >= lanes && bar.column <= column && column < bar.column + bar.span).length);
}

/**
 * Lines a day's cell holds under its date. When everything fits it is shown whole; otherwise one line goes to the foot,
 * which counts what is hidden, and the rest are shared in the fixed order bars, timed events: each kind present keeps
 * at least one line, and the earlier kind takes what is left over.
 */
export function layoutMonthWeeks(bars: readonly Bar[], days: readonly string[], timed: Map<string, DemoEvent[]>, lines: number): MonthWeek[] {
  const weeks: MonthWeek[] = [];
  for (let index = 0; index < days.length; index += 7) {
    const week = days.slice(index, index + 7);
    const stack = stackedWeek(bars, week);
    const dayTimed = week.map(day => ownFirst(timed.get(day) ?? []));
    const sizes = [stack.eventLanes, Math.max(0, ...dayTimed.map(items => items.length))];
    const total = sizes.reduce((sum, size) => sum + size, 0);
    const hasFoot = total > lines;
    let left = hasFoot ? lines - 1 : lines;
    const given = sizes.map((size, at) => {
      const after = sizes.slice(at + 1).filter(Boolean).length;
      const give = Math.max(0, Math.min(size, Math.max(Math.min(1, size), left - after), left));
      left -= give;
      return give;
    });
    const [eventLanes, timedLines] = given as [number, number];
    const hiddenEvents = week.map(() => 0);
    const shown: PlacedBar[] = [];
    for (const bar of stack.events) {
      if (bar.lane < eventLanes) shown.push(bar);
      else for (let column = bar.column; column < bar.column + bar.span; column += 1) hiddenEvents[column]! += 1;
    }
    weeks.push({
      days: week, bars: shown, eventLanes, timedLines, hasFoot,
      timed: dayTimed.map(items => items.slice(0, timedLines)),
      hiddenEvents: hiddenEvents.map((count, column) => count + Math.max(0, dayTimed[column]!.length - timedLines)),
    });
  }
  return weeks;
}
