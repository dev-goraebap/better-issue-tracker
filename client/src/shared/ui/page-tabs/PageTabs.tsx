import { Tab, TabList } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import type { ReactNode } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { MarkIcon } from '../icon-picker';
import { NavIcon } from '../NavIcon';
import styles from './page-tabs.module.css';

export type PageTab<T extends string> = { value: T; label: string; icon?: string; endContent?: ReactNode;
  /** A mark someone picked (a view's: an icon or an emoji, MarkIcon) in place of an app icon. */
  mark?: string;
  /** The icon's colour (a view's own, say); the label's ink when left out. */
  tone?: string };

/**
 * A page's tabs as Linear's view chips (D-067): a pill each, the chosen one filled, each tab's icon (when it has one)
 * before its label on a desktop. A phone draws the same chips, labels alone, in a row that scrolls sideways when they
 * do not fit; inside a page hasRule draws a phone a full-width rule under them. Either way they stay tabs to assistive technology.
 */
export function PageTabs<T extends string>({ value, items, panelId, onChange, hasRule = false }: {
  value: T; items: PageTab<T>[]; panelId: string; onChange: (value: T) => void; hasRule?: boolean;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const glyph = (item: PageTab<T>) => (item.mark ? <MarkIcon name={item.mark} /> : item.icon ? <NavIcon name={item.icon} /> : undefined);
  const list = <TabList role="tablist" className={`${styles.tabs} ${styles.switch}`} value={value} onChange={next => onChange(next as T)}>
    {items.map(item => <Tab key={item.value} value={item.value} label={item.label} panelId={panelId}
      icon={!isMobile && glyph(item) ? (item.tone ? <span className={styles.tone} style={{ color: item.tone }}>{glyph(item)}</span> : glyph(item)) : undefined} endContent={item.endContent} />)}
  </TabList>;
  return hasRule && isMobile ? <div className={styles.rule}>{list}</div> : list;
}
