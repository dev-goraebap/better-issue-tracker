import { IconButton } from '@astryxdesign/core';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { NavIcon } from '@/shared/ui';
import { clock, currentDay, currentMinute, dayTitle, weekdayOf, WEEKDAYS } from '../model/dates';
import { canDrag, eventKey, KIND_NAMES, type DemoEvent } from '../model/events';
import { barsOf, capBlocks, columnsFitting, minutesOf, type TimeBlock } from '../model/layout';
import { hiddenBars, stackedWeek } from '../model/stack';
import { BarButton } from './BarButton';
import { RepeatMark } from './RepeatMark';
import { useTimeDrag } from './useTimeDrag';
import { useWorkDrop } from './useWorkDrop';
import styles from './calendar.module.css';

/** One hour's height; the day runs 24 of them and opens two hours before the working day. */
const HOUR = 44;
const OPEN_AT = 7;
const LANES = 3;
/** The narrowest an event's block gets beside others, so its title and start stay readable; never more than three side by side. */
const BLOCK_LEAST = 44;
const BLOCKS_MOST = 3;
/** Room at a crowded cluster's end for its "+N". */
const MORE_LANE = 22;

/**
 * A week of seven days, or its five working days, as SandboxHr's team calendar draws it. Bars over whole days sit above
 * the hours, three lanes unless opened, with "+N" for the rest. The hours of every day scroll under them with timed
 * events by their times, overlapping ones side by side in as many columns as the day's width keeps readable (three at
 * most); the rest of a crowded cluster is counted in a "+N". Today's column shows the time now. An event that may move
 * goes to another time or day by its body and stretches by its lower edge.
 */
export function WeekGrid({ days, events, timed, holidays, onDay, onEvent, onMove, onDropWork }: {
  days: readonly string[]; events: readonly DemoEvent[]; timed: Map<string, DemoEvent[]>; holidays: ReadonlyMap<string, string>;
  onDay: (day: string) => void; onEvent: (event: DemoEvent) => void; onMove: (event: DemoEvent, day: string, start: number, end: number) => void;
  /** Work dropped on a day from outside the calendar (useWorkDrop). */
  onDropWork?: (itemId: string, day: string) => void;
}) {
  const today = currentDay();
  const workDrop = useWorkDrop(onDropWork);
  const [expanded, setExpanded] = useState(false);
  const stack = stackedWeek(barsOf(events), days);
  const lanes = expanded ? stack.eventLanes : Math.min(stack.eventLanes, LANES);
  const shown = stack.events.filter(bar => bar.lane < lanes);
  const hidden = hiddenBars(stack.events, lanes, days.length);
  const hours = useRef<HTMLDivElement>(null);
  // Opens on the morning once; moving between weeks keeps where the member scrolled to.
  useLayoutEffect(() => { if (hours.current) hours.current.scrollTop = OPEN_AT * HOUR; }, []);
  // The hours' scrollbar takes width from their columns only; the rows above keep the same room so the days line up.
  const [gutter, setGutter] = useState(0);
  useLayoutEffect(() => {
    const scroller = hours.current;
    if (!scroller) return;
    const measure = () => setGutter(scroller.offsetWidth - scroller.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);
  const now = currentMinute();
  const grid = useRef<HTMLDivElement>(null);
  // How wide a day is decides how many overlapping events it shows side by side.
  const [dayWidth, setDayWidth] = useState(0);
  useLayoutEffect(() => {
    const element = grid.current;
    if (!element) return;
    const measure = () => setDayWidth(element.querySelector<HTMLElement>('[data-column]')?.clientWidth ?? 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [days.length]);
  const cap = dayWidth ? columnsFitting(dayWidth - 6, BLOCK_LEAST, BLOCKS_MOST, MORE_LANE) : 1;
  const columns = () => [...(grid.current?.querySelectorAll<HTMLElement>('[data-column]') ?? [])];
  const timeDrag = useTimeDrag({
    hour: HOUR,
    columnAt: x => {
      const found = columns().findIndex(column => { const box = column.getBoundingClientRect(); return box.left <= x && x < box.right; });
      return found < 0 ? null : found;
    },
    onMove: (event, column, start, end) => onMove(event, days[column]!, start, end),
  });
  const drag = timeDrag.drag;
  return <div className={styles.main} style={{ '--days': days.length, '--gutter': `${gutter}px` } as CSSProperties} {...workDrop.props}>
    <div className={styles.weekHead} role="row">
      <span />
      {days.map(day => {
        const weekday = weekdayOf(day);
        const holiday = holidays.get(day);
        // The date and its weekday on one line, centred on it, so neither sits off the other.
        return <button key={day} type="button" className={styles.weekHeadDay} onClick={() => onDay(day)} data-day={day} data-drop={workDrop.day === day || undefined}
          data-today={day === today || undefined}
          data-past={day < today || undefined} data-off={holiday || weekday === 0 ? true : undefined} data-saturday={!holiday && weekday === 6 ? true : undefined}
          aria-label={`${dayTitle(day)}${holiday ? ` ${holiday}` : ''}`}>
          <span className={styles.weekHeadDate}>{Number(day.slice(8))}</span>
          <span className={styles.weekHeadName}>{WEEKDAYS[weekday]}</span>
          {holiday && <span className={styles.holiday}>{holiday}</span>}
        </button>;
      })}
    </div>
    {stack.eventLanes > 0 && <div className={styles.allDay} style={{ gridTemplateRows: `repeat(${lanes + (hidden.some(Boolean) ? 1 : 0)}, 1.375rem)` }}>
      <div className={styles.allDayLabel}>
        <span className={styles.allDayName}>종일</span>
        {stack.eventLanes > LANES && <IconButton size="sm" variant="ghost" label={expanded ? '종일 줄 접기' : '종일 줄 모두 보기'}
          icon={<span style={{ display: 'inline-flex', rotate: expanded ? '-90deg' : '90deg' }}><NavIcon name="forward" /></span>}
          onClick={() => setExpanded(!expanded)} />}
      </div>
      {/* Each day's cell under its bars, ruled as the hours below are so the columns run from the head to the hours. */}
      {days.map((day, column) => <span key={day} className={styles.allDayCell} aria-hidden="true" data-day={day} data-today={day === today || undefined}
        style={{ gridColumn: column + 2, gridRow: '1 / -1' }} />)}
      {shown.map(placed => <BarButton key={placed.bar.key} bar={placed.bar} fromBefore={placed.fromBefore} toAfter={placed.toAfter}
        style={{ gridColumn: `${placed.column + 2} / span ${placed.span}`, gridRow: placed.lane + 1, blockSize: '1.375rem' }} onEvent={onEvent} />)}
      {hidden.map((count, column) => count > 0 && <button key={days[column]} type="button" className={styles.allDayMore}
        style={{ gridColumn: column + 2, gridRow: lanes + 1 }} onClick={() => setExpanded(true)}
        aria-label={`종일 줄 ${count}개 더 보기`}>+{count}</button>)}
    </div>}
    <div ref={hours} className={styles.hours}>
      <div ref={grid} className={styles.hoursGrid} data-dragging={drag ? drag.mode : undefined}
        style={{ blockSize: 24 * HOUR, '--hour': `${HOUR}px` } as CSSProperties}>
        <div className={styles.hourLabels}>
          {Array.from({ length: 23 }, (_, index) => index + 1).map(hour => <span key={hour} className={styles.hourLabel} style={{ insetBlockStart: hour * HOUR }}>
            {hour < 12 ? `오전 ${hour}` : `오후 ${hour === 12 ? 12 : hour - 12}`}
          </span>)}
        </div>
        {days.map((day, columnIndex) => {
          // A short event is drawn at least half an hour tall, so it takes that much room beside others too.
          const blocks: TimeBlock<DemoEvent>[] = (timed.get(day) ?? []).map(event => {
            const start = minutesOf(event.start.slice(11));
            return { item: event, start, end: Math.max(Math.min(24 * 60, endMinute(event)), Math.min(24 * 60, start + 30)) };
          });
          const { shown: placedEvents, more } = capBlocks(blocks, cap);
          return <div key={day} className={styles.column} data-column={columnIndex} data-day={day} data-drop={workDrop.day === day || undefined}
            data-today={day === today || undefined}>
            {placedEvents.map(placed => {
              const event = placed.item;
              const end = Math.min(24 * 60, endMinute(event));
              // A crowded cluster leaves the lane at its end to its "+N".
              const room = `(100% - ${(placed.crowded ? MORE_LANE : 0) + 3}px)`;
              const style: CSSProperties = {
                insetBlockStart: (placed.start / 60) * HOUR + 1, blockSize: Math.max(22, ((end - placed.start) / 60) * HOUR - 3),
                insetInlineStart: `calc(${room} * ${placed.column / placed.columns} + 3px)`, inlineSize: `calc(${room} / ${placed.columns} - 3px)`,
              };
              const past = day < today || (day === today && end <= now);
              const draggable = canDrag(event);
              const moving = !!drag && eventKey(drag.event) === eventKey(event);
              return <button key={eventKey(event)} type="button" className={styles.block} data-kind={event.kind} data-past={past || undefined}
                data-draggable={draggable || undefined} data-moving={moving || undefined}
                style={style} title={`${clock(event.start)} – ${clock(event.end)} ${KIND_NAMES[event.kind]} · ${event.title}`}
                onPointerDown={pointer => { if (draggable) timeDrag.pressEvent(pointer, event, columnIndex, placed.start, end, 'move'); }}
                onClick={() => { if (!timeDrag.wasDragged()) onEvent(event); }}>
                <span className={styles.blockTitle}>
                  <span>{event.title}</span>
                  <RepeatMark event={event} />
                </span>
                {/* Beside others or a count there is room for the start only; the whole span is in the title on hover. */}
                <span className={styles.blockTime}>{placed.columns > 1 || placed.crowded ? clock(event.start) : `${clock(event.start)} – ${clock(event.end)}`}</span>
                {draggable && <span className={styles.stretch} aria-hidden="true" onPointerDown={pointer => {
                  pointer.stopPropagation();
                  timeDrag.pressEvent(pointer, event, columnIndex, placed.start, end, 'resize');
                }} />}
              </button>;
            })}
            {more.map(run => <button key={`more-${run.start}`} type="button" className={styles.blockMore}
              style={{ insetBlockStart: (run.start / 60) * HOUR + 1, insetInlineEnd: 2, inlineSize: MORE_LANE - 2 }}
              aria-label={`${timeText(run.start)}부터 겹친 일정 ${run.count}개 더 보기`} title={`겹친 일정 ${run.count}개 더`} onClick={() => onDay(day)}>
              +{run.count}
            </button>)}
            {drag && drag.column === columnIndex && <span className={styles.ghost} aria-hidden="true" data-kind={drag.event.kind}
              style={{ insetBlockStart: (drag.start / 60) * HOUR + 1, blockSize: Math.max(22, ((drag.end - drag.start) / 60) * HOUR - 3) }}>
              <span className={styles.blockTitle}><span>{drag.event.title}</span></span>
              <span className={styles.blockTime}>{timeText(drag.start)} – {timeText(drag.end)}</span>
            </span>}
            {day === today && <span className={styles.now} style={{ insetBlockStart: (now / 60) * HOUR }} aria-hidden="true" />}
          </div>;
        })}
      </div>
    </div>
  </div>;
}

const pad = (value: number) => String(value).padStart(2, '0');
const timeText = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** An event ending at midnight ends at the day's end. */
const endMinute = (event: DemoEvent) => (event.end.slice(0, 10) > event.start.slice(0, 10) ? 24 * 60 : minutesOf(event.end.slice(11)));
