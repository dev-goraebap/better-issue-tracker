import { Button, IconButton } from '@astryxdesign/core';
import { NavIcon } from '@/shared/ui';
import { shiftDay, shiftMonth } from '../model/dates';
import { monthTitle, placedSearch, weekTitle, type CalendarView, type DemoCalendarSearch } from '../model/month';
import { useCalendarKeys } from '../model/place';
import { ViewMenu } from './ViewMenu';
import styles from './calendar.module.css';

/** The views a desktop picks from, with the keys that switch to each. */
const VIEW_CHOICES = [{ value: 'month', label: '월', keys: 'M' }, { value: 'week', label: '주', keys: 'W' }, { value: 'workweek', label: '업무 주', keys: 'X' }] as const;

/**
 * The calendar's own controls for the header chrome's tab row, as SandboxHr's team calendar has them: 오늘, the
 * period's steps, its title, then the view behind the … button. On a desktop the keys move it too (←/→, T, M·W·X).
 */
export function DemoCalendarBar({ search, onPlace }: { search: DemoCalendarSearch; onPlace: (next: DemoCalendarSearch) => void }) {
  const { view, day, days, today, isWeekly, isMobile } = useCalendarKeys(search, onPlace);
  const place = (next: { view?: CalendarView; date?: string }) => onPlace(placedSearch(view, day, next));
  const step = (by: number) => place({ date: isWeekly ? shiftDay(day, by * 7) : shiftMonth(day, by) });
  const unit = isWeekly ? '주' : '달';
  // A phone has no working week (it shows the whole week instead).
  const choices = isMobile ? VIEW_CHOICES.filter(choice => choice.value !== 'workweek') : VIEW_CHOICES;
  return <div className={styles.nav}>
    <Button label="오늘" variant="secondary" size="sm" tooltip="오늘 (T)" onClick={() => place({ date: today })} />
    <IconButton label={`이전 ${unit}`} tooltip={`이전 ${unit} (←)`} variant="ghost" size="sm" icon={<NavIcon name="previous" />} onClick={() => step(-1)} />
    <IconButton label={`다음 ${unit}`} tooltip={`다음 ${unit} (→)`} variant="ghost" size="sm" icon={<NavIcon name="forward" />} onClick={() => step(1)} />
    <h2 className={styles.title}>{isWeekly ? weekTitle(days) : monthTitle(day)}</h2>
    <ViewMenu value={view} choices={choices} onChange={next => place({ view: next })} />
  </div>;
}
