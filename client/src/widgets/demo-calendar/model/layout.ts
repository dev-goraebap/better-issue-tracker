import { lastDayOf } from './dates';
import { eventKey, type DemoEvent } from './events';

// SandboxHr's calendar layout (team-calendar/model/layout), with its leave, overtime and filter parts left out.

/** Something lasting whole days, drawn as a bar across them: an all-day event, or an event over several days. */
export type Bar = { key: string; start: string; end: string; event: DemoEvent };

export type PlacedBar = { bar: Bar; column: number; span: number; lane: number; fromBefore: boolean; toAfter: boolean };
export type WeekLayout = { days: string[]; bars: PlacedBar[]; hiddenEvents: number[]; lanes: number };

const spansDays = (event: DemoEvent) => event.allDay || lastDayOf(event) > event.start.slice(0, 10);

/** The events drawn as bars, over the days they cover. */
export const barsOf = (events: readonly DemoEvent[]): Bar[] =>
  events.filter(spansDays).map(event => ({ key: `e-${eventKey(event)}`, start: event.start.slice(0, 10), end: lastDayOf(event), event }));

/** Events within one day that have a time, by day, earliest first. */
export function timedByDay(events: readonly DemoEvent[]): Map<string, DemoEvent[]> {
  const byDay = new Map<string, DemoEvent[]>();
  for (const event of [...events].sort((a, b) => a.start.localeCompare(b.start)))
    if (!spansDays(event)) {
      const day = event.start.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), event]);
    }
  return byDay;
}

/**
 * Weeks of days with each bar drawn once across the days it covers in the week, in the first lane free for all of
 * them; earlier and longer bars take the upper lanes. Beyond `lanes` a bar is not drawn and each of its days counts it
 * as hidden, for "+N개 더".
 */
export function layoutWeeks(bars: readonly Bar[], days: readonly string[], lanes: number): WeekLayout[] {
  const weeks: WeekLayout[] = [];
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
      .sort((a, b) => a.column - b.column || b.span - a.span);
    const taken: boolean[][] = [];
    const placed: PlacedBar[] = [];
    const hiddenEvents = week.map(() => 0);
    for (const item of within) {
      let lane = 0;
      while (taken[lane]?.slice(item.column, item.column + item.span).some(Boolean)) lane += 1;
      (taken[lane] ??= week.map(() => false)).fill(true, item.column, item.column + item.span);
      if (lane < lanes) placed.push({ ...item, lane, fromBefore: item.bar.start < first, toAfter: item.bar.end > last });
      else for (let column = item.column; column < item.column + item.span; column += 1) hiddenEvents[column]! += 1;
    }
    weeks.push({ days: week, bars: placed, hiddenEvents, lanes: Math.min(taken.length, lanes) });
  }
  return weeks;
}

/** A block of time on one day, in minutes from midnight; end may run past 24:00 and is drawn to the day's end. */
export type TimeBlock<T> = { item: T; start: number; end: number };
export type PlacedBlock<T> = TimeBlock<T> & { column: number; columns: number };

/** Blocks that overlap share the day's width side by side; each cluster of overlapping blocks splits it evenly. */
export function placeBlocks<T>(blocks: readonly TimeBlock<T>[]): PlacedBlock<T>[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: PlacedBlock<T>[] = [];
  let cluster: PlacedBlock<T>[] = [];
  let clusterEnd = -1;
  const close = () => {
    const columns = Math.max(1, ...cluster.map(block => block.column + 1));
    for (const block of cluster) block.columns = columns;
    placed.push(...cluster);
    cluster = [];
  };
  for (const block of sorted) {
    if (block.start >= clusterEnd && cluster.length > 0) close();
    const used = new Set(cluster.filter(other => other.end > block.start).map(other => other.column));
    let column = 0;
    while (used.has(column)) column += 1;
    cluster.push({ ...block, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, block.end);
  }
  if (cluster.length > 0) close();
  return placed;
}

/** What a day's hours show when overlapping blocks would be too many to read: those shown and a count for each run of the rest. */
export type CappedBlocks<T> = {
  /** Blocks drawn, side by side in at most `cap` columns; `crowded` when their cluster lost some, so they leave room for the count. */
  shown: (PlacedBlock<T> & { crowded: boolean })[];
  /** Each run of overlapping blocks not drawn: from its first start, how many. */
  more: { start: number; end: number; count: number }[];
};

/**
 * Overlapping blocks side by side as placeBlocks lays them, but never in more than `cap` columns: a block that would
 * need a column past them is not drawn and counts toward the "+N" of its run, so every block drawn keeps a width its
 * title and time can be read in. A cluster that lost blocks marks those it shows as crowded.
 */
export function capBlocks<T>(blocks: readonly TimeBlock<T>[], cap: number): CappedBlocks<T> {
  const limit = Math.max(1, cap);
  const placed = placeBlocks(blocks);
  const shown: CappedBlocks<T>['shown'] = [];
  const hidden: PlacedBlock<T>[] = [];
  // placeBlocks keeps each cluster together and in order, so a cluster is the run sharing one count of columns.
  let at = 0;
  while (at < placed.length) {
    let end = at + 1;
    let reach = placed[at]!.end;
    while (end < placed.length && placed[end]!.start < reach) reach = Math.max(reach, placed[end++]!.end);
    const cluster = placed.slice(at, end);
    const crowded = cluster.some(block => block.column >= limit);
    for (const block of cluster) {
      if (block.column >= limit) hidden.push(block);
      else shown.push({ ...block, columns: Math.min(block.columns, limit), crowded });
    }
    at = end;
  }
  const more: CappedBlocks<T>['more'] = [];
  for (const block of [...hidden].sort((a, b) => a.start - b.start)) {
    const last = more[more.length - 1];
    if (last && block.start < last.end) {
      last.count += 1;
      last.end = Math.max(last.end, block.end);
    } else more.push({ start: block.start, end: block.end, count: 1 });
  }
  return { shown, more };
}

/** How many blocks fit side by side in a day column of this many pixels, each at least `least` wide, up to `most`. */
export const columnsFitting = (width: number, least: number, most: number, reserve = 0) =>
  Math.max(1, Math.min(most, Math.floor((width - reserve) / least)));

export const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
