import { Heading, VStack } from '@astryxdesign/core';
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSearchScreen } from '@/shared/lib/route-search';
import { PageBack } from '../BackLink';
import { PageWidthContext, type PageWidth } from '../page-foot/page-width';
import { PageToolsContext, type PageChromeTargets } from './page-chrome';
import styles from './page-chrome.module.css';

/**
 * A list page laid out as Plane lays its pages: the card's header row names the page (the trail) and ends with its tools
 * and actions; a page with tabs gets a second row under it; the conditions in force follow in a row of their own; the
 * content takes the card's whole width. The title stays for screen readers.
 *
 * A desktop's tab row ends with the page's tools (search, sort, filters). A phone keeps the same rows: its tools stay at
 * the header row's end (the shell's toolbar), its tabs share the row's whole width, its action floats as the + (no
 * actions target), and its content keeps the phone's inset. A phone's search screen (useSearchScreen) searches the tab in
 * view, so its tab row steps aside.
 *
 * A page whose content reads better narrower than the card (sections, a settings list) gives a width: its header, tab
 * and conditions rows stay where and as tall as on every other page, and only its content keeps to a centred column of
 * PageFrame's widths on the page's insets (a phone's inset on a phone), its foot row lining up with it.
 */
export function HeaderChromePage({ title, actions, tabs, width, targets, isMobile, children }: {
  title: string; actions?: ReactNode; tabs?: ReactNode; width?: PageWidth; targets: PageChromeTargets & { tools: HTMLElement; rows: HTMLElement };
  isMobile: boolean; children: ReactNode;
}) {
  const [tabTools, setTabTools] = useState<HTMLElement | null>(null);
  const [applied, setApplied] = useState<HTMLElement | null>(null);
  const isFinding = useSearchScreen().isOpen && isMobile;
  const tools = tabs && !isMobile ? tabTools : targets.tools;
  return <VStack gap={0} className={styles.page}>
    <div className={styles.quiet}><Heading level={1}>{title}</Heading></div>
    {actions && targets.actions && createPortal(actions, targets.actions)}
    {createPortal(<>
      {tabs && !isFinding && <div className={styles.tabRow} data-mobile={isMobile || undefined}>
        <div className={styles.tabs}>{tabs}</div>
        {!isMobile && <div ref={setTabTools} className={styles.tabTools} />}
      </div>}
      <div ref={setApplied} className={styles.applied} data-mobile={isMobile || undefined} />
    </>, targets.rows)}
    {tools && applied && <PageToolsContext.Provider value={{ tools, actions: targets.actions, applied }}>
      <PageBack.Provider value={undefined}>{width
        ? <PageWidthContext.Provider value={width}><div className={styles.column} data-width={width}>{children}</div></PageWidthContext.Provider>
        : children}</PageBack.Provider>
    </PageToolsContext.Provider>}
  </VStack>;
}
