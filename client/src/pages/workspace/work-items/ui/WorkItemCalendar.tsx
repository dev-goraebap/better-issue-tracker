import { useState } from 'react';
import { Popover } from '@astryxdesign/core';
import { workItemHref, type WorkItem } from '@/entities/work-item';
import { currentDay, dayTitle, monthDays, weekdayOf, WEEKDAYS } from '../model/dates';
import { barsOf, layoutMonth } from '../model/month';
import { useDayDrag } from './useDayDrag';
import styles from './calendar.module.css';

/** Lanes a day shows under its date, as the narrow cell of a six-week month holds them; one goes to the foot when needed. */
const LINES = 4;
const kindOf = (item: WorkItem) => (item.labels.some(label => label.system) ? 'decision' : 'work');

/**
 * The month as weeks ruled by thin lines, Sunday first, as SandboxHr's team calendar draws it, with the view's work items
 * that have a day as bars across their days (start to due, D-071): a 결정기록 in its own tint. Pressing a bar opens the
 * work item (in the page's modal, D-069); "+N개 더" lists the day's work items. When the member may write, a bar is carried to
 * other days, moving its start and due day together (onMove).
 */
export function WorkItemCalendar({ workspaceId, items, anchor, onOpen, onMove }: {
  workspaceId: string; items: readonly WorkItem[]; anchor: string;
  onOpen: (href: string) => void; onMove?: (item: WorkItem, days: number) => void;
}) {
  const today = currentDay();
  const days = monthDays(anchor);
  const dayDrag = useDayDrag((item, by) => onMove?.(item, by));
  const carried = dayDrag.drag;
  const [moreDay, setMoreDay] = useState<string | null>(null);
  const bars = barsOf(items);
  const weeks = layoutMonth(bars, days, LINES);
  const open = (item: WorkItem) => { if (!dayDrag.wasDragged()) onOpen(workItemHref(workspaceId, item)); };
  return <div className={styles.calendar}><div className={styles.main} role="grid" aria-label="월 달력" data-dragging={carried ? 'day' : undefined}>
    <div className={styles.weekdays} role="row">
      {WEEKDAYS.map((name, index) => <div key={name} role="columnheader" className={styles.weekday} data-weekday={index}>{name}</div>)}
    </div>
    <div className={styles.weeks} style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
      {weeks.map(week => {
        const hasFoot = week.hidden.some(Boolean);
        const rows = `1.875rem${week.lanes ? ` repeat(${week.lanes}, 1.25rem)` : ''}${hasFoot ? ' 1.25rem' : ''} minmax(0, 1fr)`;
        return <div key={week.days[0]} role="row" className={styles.week} style={{ gridTemplateRows: rows }}>
          {week.days.map((day, column) => {
            const weekday = weekdayOf(day);
            return <div key={day} role="gridcell" className={styles.day} style={{ gridColumn: column + 1 }} data-day={day}
              data-drop={carried && carried.to === day && carried.to !== carried.from ? true : undefined}
              data-outside={day.slice(0, 7) !== anchor.slice(0, 7) || undefined} data-today={day === today || undefined}
              data-off={weekday === 0 || undefined} data-saturday={weekday === 6 || undefined} aria-label={dayTitle(day)}>
              <span className={styles.dayHead}>
                <span className={styles.date}>{day.slice(8) === '01' ? `${Number(day.slice(5, 7))}월 1일` : Number(day.slice(8))}</span>
              </span>
            </div>;
          })}
          {week.bars.map(placed => {
            const item = placed.bar.item;
            return <button key={`${item.id}-${week.days[0]}`} type="button" className={styles.bar}
              style={{ gridColumn: `${placed.column + 1} / span ${placed.span}`, gridRow: placed.lane + 2 }}
              data-from-before={placed.fromBefore || undefined} data-to-after={placed.toAfter || undefined} data-kind={kindOf(item)}
              data-draggable={onMove ? true : undefined} data-moving={carried?.item.id === item.id || undefined} title={`${item.key} ${item.title}`}
              onPointerDown={onMove ? pointer => dayDrag.press(pointer, item) : undefined} onClick={() => open(item)}>
              <span className={styles.barName}>{item.key} {item.title}</span>
            </button>;
          })}
          {hasFoot && week.days.map((day, column) => {
            const more = week.hidden[column]!;
            if (more === 0) return null;
            const onDay = bars.filter(bar => bar.start <= day && bar.end >= day);
            return <div key={day} className={styles.cellFoot} style={{ gridColumn: column + 1, gridRow: week.lanes + 2 }}>
              <Popover isOpen={moreDay === day} onOpenChange={isOpen => setMoreDay(isOpen ? day : null)} placement="below" alignment="start" width={260}
                label={`${dayTitle(day)} 업무`} content={<div className={styles.dayList}>
                  <span className={styles.dayListTitle}>{dayTitle(day)}</span>
                  {onDay.map(bar => <button key={bar.item.id} type="button" className={styles.dayListItem} data-kind={kindOf(bar.item)}
                    onClick={() => { setMoreDay(null); onOpen(workItemHref(workspaceId, bar.item)); }}>
                    <span className={styles.dayListDot} aria-hidden="true" />{bar.item.key} {bar.item.title}
                  </button>)}
                </div>}>
                <button type="button" className={styles.more}>+{more}개 더</button>
              </Popover>
            </div>;
          })}
        </div>;
      })}
    </div>
  </div></div>;
}
