import { spanOf, type Issue } from '@/entities/issue';

// SandboxHr's month layout (team-calendar/model/layout and stack), with only bars over whole days: an issue has days,
// never times (D-071).

/** An issue with a day, drawn as a bar across its days. */
export type Bar = { item: Issue; start: string; end: string };
export type PlacedBar = { bar: Bar; column: number; span: number; lane: number; fromBefore: boolean; toAfter: boolean };
/** A week of the month: its bars in their lanes and, per day, how many did not fit (for "+N개 더"). */
export type MonthWeek = { days: string[]; bars: PlacedBar[]; lanes: number; hidden: number[] };

/** The issues with a day, as bars over the days they cover. */
export const barsOf = (items: readonly Issue[]): Bar[] => items.flatMap(item => {
  const span = spanOf(item);
  return span ? [{ item, ...span }] : [];
});

/**
 * Weeks of days with each bar drawn once across the days it covers in the week, in the first lane free for all of
 * them; earlier and longer bars take the upper lanes. A day shows `lines` lanes; when more are needed one lane gives way
 * to the "+N개 더" foot and each hidden bar counts on every day it covers.
 */
export function layoutMonth(bars: readonly Bar[], days: readonly string[], lines: number): MonthWeek[] {
  const weeks: MonthWeek[] = [];
  for (let index = 0; index < days.length; index += 7) {
    const week = days.slice(index, index + 7);
    const first = week[0]!;
    const last = week[week.length - 1]!;
    const within = bars
      .filter(bar => bar.start <= last && bar.end >= first)
      .map(bar => {
        const start = bar.start < first ? first : bar.start;
        const end = bar.end > last ? last : bar.end;
        return { bar, column: week.indexOf(start), span: week.indexOf(end) - week.indexOf(start) + 1 };
      })
      .sort((a, b) => a.column - b.column || b.span - a.span || a.bar.item.key.localeCompare(b.bar.item.key));
    const taken: boolean[][] = [];
    const all: PlacedBar[] = [];
    for (const each of within) {
      let lane = 0;
      while (taken[lane]?.slice(each.column, each.column + each.span).some(Boolean)) lane += 1;
      (taken[lane] ??= week.map(() => false)).fill(true, each.column, each.column + each.span);
      all.push({ ...each, lane, fromBefore: each.bar.start < first, toAfter: each.bar.end > last });
    }
    const lanes = taken.length > lines ? lines - 1 : taken.length;
    const hidden = week.map(() => 0);
    const shown: PlacedBar[] = [];
    for (const placed of all) {
      if (placed.lane < lanes) shown.push(placed);
      else for (let column = placed.column; column < placed.column + placed.span; column += 1) hidden[column]! += 1;
    }
    weeks.push({ days: week, bars: shown, lanes, hidden });
  }
  return weeks;
}
