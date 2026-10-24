import { useEffect, useRef } from 'react';
import { Button, IconButton } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { isForOther } from '@/shared/lib/key-target';
import { NavIcon } from '@/shared/ui';
import { currentDay, monthTitle, shiftMonth } from '../model/dates';
import styles from './calendar.module.css';

/**
 * The calendar's own controls over it, as SandboxHr's team calendar has them: 오늘, the month's steps and its title. On a
 * desktop the keys move it too (←/→, T). The month in sight is the address's (date, today's when left out).
 */
export function CalendarBar({ day, onPlace }: { day: string; onPlace: (date: string) => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const keys = useRef<(event: KeyboardEvent) => void>(() => undefined);
  keys.current = event => {
    if (isMobile || isForOther(event)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight') onPlace(shiftMonth(day, key === 'ArrowLeft' ? -1 : 1));
    else if (key === 't') onPlace(currentDay());
    else return;
    event.preventDefault();
  };
  useEffect(() => {
    const listen = (event: KeyboardEvent) => keys.current(event);
    window.addEventListener('keydown', listen);
    return () => window.removeEventListener('keydown', listen);
  }, []);
  return <div className={styles.nav}>
    <Button label="오늘" variant="secondary" size="sm" tooltip="오늘 (T)" onClick={() => onPlace(currentDay())} />
    <IconButton label="이전 달" tooltip="이전 달 (←)" variant="ghost" size="sm" icon={<NavIcon name="previous" />} onClick={() => onPlace(shiftMonth(day, -1))} />
    <IconButton label="다음 달" tooltip="다음 달 (→)" variant="ghost" size="sm" icon={<NavIcon name="forward" />} onClick={() => onPlace(shiftMonth(day, 1))} />
    <h2 className={styles.title}>{monthTitle(day)}</h2>
  </div>;
}
