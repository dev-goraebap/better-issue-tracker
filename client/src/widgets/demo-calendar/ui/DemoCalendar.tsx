import { useMemo, useState } from 'react';
import { useSchedules, useWorkDues } from '@/entities/demo-sample';
import { atMinutes, shifted } from '../model/drag';
import { buildDemoEvents, HOLIDAYS, type DemoEvent } from '../model/events';
import { timedByDay } from '../model/layout';
import { placedSearch, type DemoCalendarSearch } from '../model/month';
import { useCalendarPlace } from '../model/place';
import { MonthView } from './MonthView';
import { WeekGrid } from './WeekGrid';
import styles from './calendar.module.css';

type Moves = { workspaceId: string; byId: Record<string, { start: string; end: string }> };

/**
 * SandboxHr's team calendar fed by the demo's sample data: the month, or the week or its working days with their
 * hours, at the place the address names (DemoCalendarBar moves it). It fills the card under the header rows, as the
 * team calendar does. Pressing an event opens its demo page (onOpen with its address), a day chooses it, and a day's
 * "+N개 더" opens its week. An event that may move is dragged to another day or time and stays there while the page is
 * open; nothing is saved.
 */
export function DemoCalendar({ workspaceId, search, onPlace, onOpen, onDropWork }: {
  workspaceId: string; search: DemoCalendarSearch; onPlace: (next: DemoCalendarSearch) => void; onOpen: (href: string) => void;
  /** Work carried in from outside (the home's 날짜 미정 drawer) and dropped on a day. */
  onDropWork?: (itemId: string, day: string) => void;
}) {
  const { view, day, days, isWeekly } = useCalendarPlace(search);
  const schedules = useSchedules();
  const dues = useWorkDues();
  const sample = useMemo(() => buildDemoEvents(workspaceId, schedules, dues), [workspaceId, schedules, dues]);
  const [moves, setMoves] = useState<Moves>({ workspaceId, byId: {} });
  const moved = moves.workspaceId === workspaceId ? moves.byId : {};
  const events = useMemo(() => sample.map(event => {
    const to = moved[event.id];
    return to ? { ...event, ...to, changed: event.recurring } : event;
  }), [sample, moved]);
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const shown = events.filter(event => event.start.slice(0, 10) <= last && event.end.slice(0, 10) >= first);
  const timed = timedByDay(shown);
  const move = (event: DemoEvent, start: string, end: string) => {
    if (start === event.start && end === event.end) return;
    setMoves({ workspaceId, byId: { ...moved, [event.id]: { start, end } } });
  };
  const openEvent = (event: DemoEvent) => { if (event.href) onOpen(event.href); };
  const chooseDay = (date: string) => onPlace(placedSearch(view, day, { date }));
  return <div className={styles.calendar}>
    {isWeekly
      ? <WeekGrid key={view} days={days} events={shown} timed={timed} holidays={HOLIDAYS} onDay={chooseDay} onEvent={openEvent}
        onMove={(event, date, start, end) => move(event, atMinutes(date, start), atMinutes(date, end))} onDropWork={onDropWork} />
      : <MonthView anchor={day} days={days} events={shown} timed={timed} holidays={HOLIDAYS} selected={search.date ?? null}
        onDay={chooseDay} onMore={date => onPlace(placedSearch(view, day, { view: 'week', date }))} onEvent={openEvent}
        onMoveDays={(event, by) => { const next = shifted(event, by); move(event, next.start, next.end); }} onDropWork={onDropWork} />}
  </div>;
}
