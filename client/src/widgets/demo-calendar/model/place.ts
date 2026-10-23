import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useEffect, useRef } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { currentDay, shiftDay, shiftMonth } from './dates';
import { placedSearch, shownView, viewDays, type CalendarView, type DemoCalendarSearch } from './month';

/** Where the calendar is, read from its address: the view shown, the chosen day and the days on screen. */
export function useCalendarPlace(search: DemoCalendarSearch) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const today = currentDay();
  const view = shownView(search.view, isMobile);
  const day = search.date ?? today;
  return { view, day, today, isMobile, isWeekly: view !== 'month', days: viewDays(view, day) };
}

const VIEW_KEYS: Record<string, CalendarView> = { m: 'month', w: 'week', x: 'workweek' };

/** A key pressed while typing, with a modifier, or under an open dialog or menu is not meant for the calendar. */
const isForCalendar = (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"]')) return false;
  return !document.querySelector('dialog[open]');
};

/**
 * The calendar's keys on a desktop, as SandboxHr's: ←/→ the period, T today, M·W·X the month, week or working week.
 * The latest place is read through a ref, so the listener is added once.
 */
export function useCalendarKeys(search: DemoCalendarSearch, onPlace: (next: DemoCalendarSearch) => void) {
  const place = useCalendarPlace(search);
  const keys = useRef<(event: KeyboardEvent) => void>(() => undefined);
  keys.current = event => {
    if (place.isMobile || !isForCalendar(event)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const to = (next: { view?: CalendarView; date?: string }) => onPlace(placedSearch(place.view, place.day, next));
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const by = key === 'ArrowLeft' ? -1 : 1;
      to({ date: place.isWeekly ? shiftDay(place.day, by * 7) : shiftMonth(place.day, by) });
    } else if (key === 't') to({ date: place.today });
    else if (VIEW_KEYS[key]) to({ view: VIEW_KEYS[key] });
    else return;
    event.preventDefault();
  };
  useEffect(() => {
    const listen = (event: KeyboardEvent) => keys.current(event);
    window.addEventListener('keydown', listen);
    return () => window.removeEventListener('keydown', listen);
  }, []);
  return place;
}
