import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppShell, HStack, VStack } from '@astryxdesign/core';
import { useRouterState } from '@tanstack/react-router';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY, PRODUCT_NAME } from '@/shared/config';
import { useAppearance } from '@/shared/lib/appearance';
import { PageBackShownContext, PageChromeContext, PageLoader, useLoadingHold } from '@/shared/ui';
import { AgentBar } from './AgentBar';
import { SidebarExpandHandle } from './SidebarExpandHandle';
import styles from './app-shell.module.css';

/**
 * The window every signed-in screen shares, as SandboxHr's: on a desktop the menu on the wash at the left and beside it
 * the page's card, whose header row holds the trail and the page's tools and actions, with the rows a
 * page hands it (tabs, conditions) under it and its foot row (PageFoot) at the card's bottom; under the card the agent
 * strip. A phone keeps the card full width with its tab bar under it, and gives a page with a way back of its own (a
 * detail, a form) the whole screen. A move to another page that waits for its reads veils the card (not the menu) with
 * the rocket, as SandboxHr's, past 100ms and for 300ms at least, until the next page is drawn under it.
 */
export function ShellFrame({ pathname, sidebar, trail, mobileNav, mobileEnd, folded, onExpandSidebar, children }: {
  pathname: string; sidebar: ReactNode; trail: ReactNode; mobileNav?: ReactNode;
  /** What a phone's header row ends with, after the page's tools (the notices' bell, which a desktop keeps in the menu's head). */
  mobileEnd?: ReactNode;
  folded: boolean; onExpandSidebar: () => void; children: ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { layout } = useAppearance();
  const scrollBox = useRef<HTMLDivElement>(null);
  const [tools, setTools] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState<HTMLElement | null>(null);
  const [back, setBack] = useState<HTMLElement | null>(null);
  const [title, setTitle] = useState<HTMLElement | null>(null);
  const [mobileActions, setMobileActions] = useState<HTMLElement | null>(null);
  const [foot, setFoot] = useState<HTMLElement | null>(null);
  // A page with a way back of its own (PageFrame back) tells the shell, which gives it a phone's whole screen.
  const [hasPageBack, setPageBack] = useState(false);
  const isPhoneBare = isMobile && hasPageBack;
  const isMoving = useRouterState({ select: state => state.status === 'pending' && !!state.resolvedLocation && state.location.pathname !== state.resolvedLocation.pathname });
  const isVeiled = useLoadingHold(isMoving, { delay: 100, minimum: 300 });
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
      {!isMobile && <div className={styles.sidebarRail}>{sidebar}{folded && <SidebarExpandHandle onExpand={onExpandSidebar} />}</div>}
      <VStack gap={0} className={styles.frame} data-bare={isPhoneBare || undefined} data-tabless={(isMobile && (isPhoneBare || !mobileNav)) || undefined}>
        <div className={styles.panel}>
          <VStack gap={0} ref={scrollBox} className={styles.card} id="workspace-scroll" data-scroll-restoration-id="workspace-scroll">
            {<HStack as="nav" aria-label="현재 위치" gap={1} className={styles.topbar}>
              <span ref={setBack} className={styles.chromeBack} />
              <div ref={setTitle} className={styles.detailTitle} />
              <div className={styles.trail}>{trail}</div>
              <span className={styles.topbarEnd}>
                <span ref={setTools} className={styles.chromeTools} />
                {!isMobile && <span ref={setActions} className={styles.chromeActions} data-page-action />}
                {isMobile && <span ref={setMobileActions} className={styles.chromeActions} />}
                {isMobile && !isPhoneBare && mobileEnd}
              </span>
            </HStack>}
            <div ref={setRows} className={styles.chromeRows} />
            <PageChromeContext.Provider value={{ tools, actions: isMobile ? null : actions, rows, foot, back, title, mobileActions }}>
              <PageBackShownContext.Provider value={setPageBack}>
                <VStack gap={0} key={pathname} className={styles.content}>{children}</VStack>
              </PageBackShownContext.Provider>
            </PageChromeContext.Provider>
            <div ref={setFoot} className={styles.footSlot} />
          </VStack>
          <PageLoader isVisible={isVeiled} place="card" />
        </div>
        {!isMobile && <AgentBar />}
        {isMobile && !isPhoneBare && mobileNav}
      </VStack>
    </section>
  </AppShell>;
}
