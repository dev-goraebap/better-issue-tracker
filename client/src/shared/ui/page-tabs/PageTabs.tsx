import { Tab, TabList } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import type { ReactNode } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { NavIcon } from '../NavIcon';
import styles from './page-tabs.module.css';

export type PageTab<T extends string> = { value: T; label: string; icon?: string; endContent?: ReactNode };

/**
 * A page's tabs. A desktop draws them as a switch: a muted track, the chosen tab raised on it, each tab's icon (when it
 * has one) before its label. A phone draws them underlined, labels alone, sharing the row's width; given to
 * PageFrame's tabs they sit on the header's rule, which spans the page, and inside a page hasRule draws the same
 * full-width rule under them (a desktop's switch needs none). Either way they stay tabs to assistive technology.
 */
export function PageTabs<T extends string>({ value, items, panelId, onChange, hasRule = false }: {
  value: T; items: PageTab<T>[]; panelId: string; onChange: (value: T) => void; hasRule?: boolean;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isSwitch = !isMobile;
  const list = <TabList role="tablist" className={isSwitch ? `${styles.tabs} ${styles.switch}` : styles.tabs} value={value} onChange={next => onChange(next as T)}>
    {items.map(item => <Tab key={item.value} value={item.value} label={item.label} panelId={panelId}
      icon={isSwitch && item.icon ? <NavIcon name={item.icon} /> : undefined} endContent={item.endContent} />)}
  </TabList>;
  return hasRule && !isSwitch ? <div className={styles.rule}>{list}</div> : list;
}
