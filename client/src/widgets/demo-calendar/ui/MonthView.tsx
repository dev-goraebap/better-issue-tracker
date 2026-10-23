import type { PointerEvent } from 'react';
import { clock, currentDay, dayTitle, weekdayOf, WEEKDAYS } from '../model/dates';
import { canDrag, eventKey, KIND_NAMES, type DemoEvent } from '../model/events';
import { barsOf } from '../model/layout';
import { layoutMonthWeeks } from '../model/stack';
import { BarButton } from './BarButton';
import { RepeatMark } from './RepeatMark';
import { useDayDrag } from './useDayDrag';
import { useWorkDrop } from './useWorkDrop';
import styles from './calendar.module.css';

/** Lines a day shows under its date, as the narrow cell of a six-week month holds them; one goes to the foot when needed. */
const LINES = 4;
/** 10:00 as 10시 and 10:30 as it is: an hour on the dot is the commonest start and the narrow day cell gains room. */
const shortClock = (start: string) => (start.slice(14, 16) === '00' ? `${Number(start.slice(11, 13))}시` : clock(start));

/**
 * The month as weeks ruled by thin lines, Sunday first, as SandboxHr's team calendar draws it. Every day reads in the
 * same order, each kind at the same height across the week: events over whole days as bars, then the day's timed
 * events, then a foot with what did not fit ("+N개 더", opening the day's week). An event that may move is carried to
 * another day by its label or bar, keeping its times.
 */
export function MonthView({ anchor, days, events, timed, holidays, selected, onDay, onMore, onEvent, onMoveDays, onDropWork }: {
  anchor: string; days: readonly string[]; events: readonly DemoEvent[]; timed: Map<string, DemoEvent[]>; holidays: ReadonlyMap<string, string>;
  selected: string | null;
  onDay: (day: string) => void; onMore: (day: string) => void; onEvent: (event: DemoEvent) => void; onMoveDays: (event: DemoEvent, days: number) => void;
  /** Work dropped on a day from outside the calendar (useWorkDrop). */
  onDropWork?: (itemId: string, day: string) => void;
}) {
  const today = currentDay();
  const dayDrag = useDayDrag(onMoveDays);
  const workDrop = useWorkDrop(onDropWork);
  const carried = dayDrag.drag;
  const press = (pointer: PointerEvent, event: DemoEvent) => { if (canDrag(event)) dayDrag.press(pointer, event); };
  const isCarried = (event: DemoEvent) => !!carried && eventKey(carried.event) === eventKey(event);
  const weeks = layoutMonthWeeks(barsOf(events), days, timed, LINES);
  return <div className={styles.main} role="grid" aria-label="월 달력" data-dragging={carried ? 'day' : undefined} {...workDrop.props}>
    <div className={styles.weekdays} role="row">
      {WEEKDAYS.map((name, index) => <div key={name} role="columnheader" className={styles.weekday} data-weekday={index}>{name}</div>)}
    </div>
    <div className={styles.weeks} style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
      {weeks.map(week => {
        // Rows: the date, event lanes, timed lines, the foot; each kind starts at the same row on every day.
        const timedRow = week.eventLanes + 2;
        const footRow = timedRow + week.timedLines;
        const repeat = (count: number, size: string) => (count ? ` repeat(${count}, ${size})` : '');
        const rows = `1.875rem${repeat(week.eventLanes, '1.25rem')}${repeat(week.timedLines, '1.3125rem')}${week.hasFoot ? ' 1.25rem' : ''} minmax(0, 1fr)`;
        return <div key={week.days[0]} role="row" className={styles.week} style={{ gridTemplateRows: rows }}>
          {week.days.map((day, column) => {
            const holiday = holidays.get(day);
            const weekday = weekdayOf(day);
            return <button key={day} type="button" role="gridcell" className={styles.day} style={{ gridColumn: column + 1 }} data-day={day}
              data-drop={(carried && carried.to === day && carried.to !== carried.from) || workDrop.day === day ? true : undefined}
              data-outside={day.slice(0, 7) !== anchor.slice(0, 7) || undefined} data-today={day === today || undefined}
              data-selected={day === selected || undefined} data-off={holiday || weekday === 0 ? true : undefined}
              data-saturday={!holiday && weekday === 6 ? true : undefined} aria-pressed={day === selected}
              aria-label={`${dayTitle(day)}${holiday ? ` ${holiday}` : ''}`} onClick={() => { if (!dayDrag.wasDragged()) onDay(day); }}>
              <span className={styles.dayHead}>
                <span className={styles.date}>{day.slice(8) === '01' ? `${Number(day.slice(5, 7))}월 1일` : Number(day.slice(8))}</span>
                {holiday && <span className={styles.holiday}>{holiday}</span>}
              </span>
            </button>;
          })}
          {week.bars.map(placed => <BarButton key={`${placed.bar.key}-${week.days[0]}`} bar={placed.bar}
            style={{ gridColumn: `${placed.column + 1} / span ${placed.span}`, gridRow: placed.lane + 2 }}
            fromBefore={placed.fromBefore} toAfter={placed.toAfter} isMoving={isCarried(placed.bar.event)}
            onPress={canDrag(placed.bar.event) ? press : undefined}
            onEvent={event => { if (!dayDrag.wasDragged()) onEvent(event); }} />)}
          {week.days.map((day, column) => {
            const shown = week.timed[column]!;
            if (shown.length === 0) return null;
            return <div key={day} className={styles.list} data-past={day < today || undefined}
              style={{ gridColumn: column + 1, gridRow: `${timedRow} / span ${week.timedLines}` }}>
              {shown.map(event => <button key={eventKey(event)} type="button" className={styles.item} data-kind={event.kind}
                data-draggable={canDrag(event) || undefined} data-moving={isCarried(event) || undefined}
                onPointerDown={pointer => press(pointer, event)}
                onClick={() => { if (!dayDrag.wasDragged()) onEvent(event); }}
                aria-label={`${clock(event.start)} ${event.title}`} title={`${clock(event.start)} ${KIND_NAMES[event.kind]} · ${event.title}`}>
                <span className={styles.time}>{shortClock(event.start)}</span>
                <span className={styles.itemTitle}>{event.title}</span>
                <RepeatMark event={event} />
              </button>)}
            </div>;
          })}
          {week.hasFoot && week.days.map((day, column) => {
            const more = week.hiddenEvents[column]!;
            if (more === 0) return null;
            return <div key={day} className={styles.cellFoot} style={{ gridColumn: column + 1, gridRow: footRow }}>
              <button type="button" className={styles.more} onClick={() => onMore(day)}>+{more}개 더</button>
            </div>;
          })}
        </div>;
      })}
    </div>
  </div>;
}
