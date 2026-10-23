import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppShell, HStack, IconButton, VStack } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY, PRODUCT_NAME } from '@/shared/config';
import { useAppearance } from '@/shared/lib/appearance';
import { NavIcon, PageBackShownContext, PageChromeContext } from '@/shared/ui';
import { AgentBar } from './AgentBar';
import styles from './app-shell.module.css';

/**
 * The window every signed-in screen shares, as SandboxHr's: on a desktop the menu on the wash at the left and beside it
 * the page's card, whose header row holds the menu's fold, the trail and the page's tools and actions, with the rows a
 * page hands it (tabs, conditions) under it and its foot row (PageFoot) at the card's bottom; under the card the agent
 * strip. A phone keeps the card full width with its tab bar under it, and gives a page with a way back of its own (a
 * detail, a form) the whole screen. The workspace shell and the /demo shell both draw it, so the demo shows the real
 * frame.
 */
export function ShellFrame({ pathname, sidebar, trail, mobileNav, folded, onFold, children }: {
  pathname: string; sidebar: ReactNode; trail: ReactNode; mobileNav?: ReactNode; folded: boolean; onFold: (next: boolean) => void; children: ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { layout } = useAppearance();
  const scrollBox = useRef<HTMLDivElement>(null);
  const [tools, setTools] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState<HTMLElement | null>(null);
  const [foot, setFoot] = useState<HTMLElement | null>(null);
  // A page with a way back of its own (PageFrame back) tells the shell, which gives it a phone's whole screen.
  const [hasPageBack, setPageBack] = useState(false);
  const isPhoneBare = isMobile && hasPageBack;
  // What sticks under the rows (a table's header) needs their height.
  useEffect(() => {
    const box = scrollBox.current;
    if (!rows || !box) return undefined;
    const observer = new ResizeObserver(() => box.style.setProperty('--workspace-rows-height', `${rows.offsetHeight}px`));
    observer.observe(rows);
    return () => { observer.disconnect(); box.style.removeProperty('--workspace-rows-height'); };
  }, [rows]);
  return <AppShell height="fill" variant="wash" contentPadding={0}>
    <section className={styles.shell} data-layout={layout} aria-label={PRODUCT_NAME}>
      {!isMobile && sidebar}
      <VStack gap={0} className={styles.frame} data-bare={isPhoneBare || undefined} data-tabless={(isMobile && (isPhoneBare || !mobileNav)) || undefined}>
        <div className={styles.panel}>
          <VStack gap={0} ref={scrollBox} className={styles.card} id="workspace-scroll" data-scroll-restoration-id="workspace-scroll">
            {!isPhoneBare && <HStack as="nav" aria-label="현재 위치" gap={1} className={styles.topbar}>
              {!isMobile && <span className={styles.menuToggle}>
                <IconButton label={folded ? '메뉴 펼치기' : '메뉴 접기'} tooltip={folded ? '메뉴 펼치기' : '메뉴 접기'} aria-expanded={!folded}
                  icon={<NavIcon name="sidebar" />} variant="ghost" size="sm" onClick={() => onFold(!folded)} />
              </span>}
              {trail}
              <span className={styles.topbarEnd}>
                <span ref={setTools} className={styles.chromeTools} />
                {!isMobile && <span ref={setActions} className={styles.chromeActions} data-page-action />}
              </span>
            </HStack>}
            <div ref={setRows} className={styles.chromeRows} />
            <PageChromeContext.Provider value={{ tools, actions: isMobile ? null : actions, rows, foot }}>
              <PageBackShownContext.Provider value={setPageBack}>
                <VStack gap={0} key={pathname} className={styles.content}>{children}</VStack>
              </PageBackShownContext.Provider>
            </PageChromeContext.Provider>
            <div ref={setFoot} className={styles.footSlot} />
          </VStack>
        </div>
        {!isMobile && <AgentBar />}
        {isMobile && !isPhoneBare && mobileNav}
      </VStack>
    </section>
  </AppShell>;
}
