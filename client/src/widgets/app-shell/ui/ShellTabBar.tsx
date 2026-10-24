import { useState, type ReactNode } from 'react';
import { BottomSheet, Heading, Text, VStack } from '@astryxdesign/core';
import { useNavigate } from '@tanstack/react-router';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { isPlainClick } from '@/shared/lib/history-trail';
import { NavIcon } from '@/shared/ui';
import styles from './app-shell.module.css';

export type ShellTab = { label: string; icon: string; href: string; isCurrent: boolean };

/**
 * A phone's tab bar: the scope's core menus as tabs, then 더보기, which opens the scope's other menus in a bottom sheet
 * (bit-frontend 04 §2). account is what the sheet ends with (the account rows and sign-out).
 */
export function ShellTabBar({ label, tabs, more, moreTitle, account }: { label: string; tabs: ShellTab[]; more: ShellTab[]; moreTitle: string; account?: ReactNode }) {
  const [isMoreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const isMoreCurrent = more.some(item => item.isCurrent);
  return <>
    <nav className={styles.mobileNavigation} aria-label={label}>
      {tabs.map(item => <a key={item.href} href={item.href} className={styles.tab} aria-current={item.isCurrent ? 'page' : undefined}
        onClick={event => { if (!isPlainClick(event)) return; event.preventDefault(); void navigate({ href: item.href }); }}>
        <NavIcon name={item.icon} /><span>{item.label}</span>
      </a>)}
      <button type="button" className={styles.tab} aria-current={isMoreCurrent ? 'page' : undefined} aria-expanded={isMoreOpen} aria-haspopup="dialog" onClick={() => setMoreOpen(true)}>
        <NavIcon name="more" /><span>더보기</span>
      </button>
    </nav>
    <BottomSheet isOpen={isMoreOpen} onOpenChange={setMoreOpen} label="더보기" height="hug"><VStack gap={4} padding={6}>
      <Heading level={2}>더보기</Heading><Text type="supporting" color="secondary">{moreTitle}</Text>
      <nav className={styles.moreNavigation} aria-label="추가 메뉴">
        {more.map(item => <a key={item.href} href={item.href} className={styles.moreLink} aria-current={item.isCurrent ? 'page' : undefined}
          onClick={event => { if (!isPlainClick(event)) return; event.preventDefault(); setMoreOpen(false); afterOverlayClose(() => { void navigate({ href: item.href }); }); }}>
          <NavIcon name={item.icon} /><Text>{item.label}</Text>
        </a>)}
      </nav>
      {account}
    </VStack></BottomSheet>
  </>;
}
