import { useContext, useLayoutEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Heading, HStack, VStack } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { BackButton } from './BackButton';
import { backLinkOf, PageBack } from './BackLink';
import { NavIcon } from './NavIcon';
import { PageBackShownContext, PageChromeContext } from './page-chrome';
import { HeaderChromePage } from './page-chrome/HeaderChromePage';
import { PageFoot, PageWidthContext, type PageWidth } from './page-foot';
import styles from './page.module.css';

/**
 * Pages show only the title above the content; explanatory copy belongs next to the controls it explains.
 *
 * A list page's header has fixed layers: the title with the page's one action at its end, then the tabs if it has
 * any, then a rule. The rule is drawn with or without tabs, so every list starts at the same line. A long title is cut
 * with an ellipsis and never pushes the action to a new line, unless wrapsTitle lets it run on (a detail whose title is
 * its content), the actions then staying at its first line. icon names the menu's icon, shown small before the title.
 *
 * The page is centred. width fits it to what it holds: narrow (48rem) for reading one thing or filling in a form,
 * default (64rem) for lists and screens of sections, wide (80rem) for wide tables, full (no limit) for a board or a
 * timeline that uses the whole width.
 *
 * On a phone a page without a back link hides its large title and icon from sight (the top bar names the page) and
 * keeps them for screen readers, and leaves its create action to the floating + (FloatingAction) there; a detail page keeps its title,
 * which is its content.
 *
 * On a desktop too the card's header row names the page, so a page of its own keeps its title only for screen readers
 * and its actions alone stand at the end of the title row; a detail page (with a back link) keeps its title, which is
 * its content.
 *
 * The back link is not shown above the title (the trail says where the page belongs); it is handed down to the content,
 * so a not-found state in it offers the same way back as its action, and on a phone, where the page has the whole screen,
 * it is '이전으로' in a foot row unless the page has a foot of its own (PageFoot). The page's width reaches its foot row.
 */
export function PageFrame({ title, icon, back, actions, tabs, hasRule = !!tabs, width: givenWidth, wrapsTitle = false, chrome, tools, conditions, children }: {
  title: string; icon?: string; back?: ReactNode; actions?: ReactNode; tabs?: ReactNode; hasRule?: boolean;
  /**
   * The content's width (default 64rem). Under chrome="header" the content takes the card's whole width unless a width
   * is given; then only the content keeps to that centred column, the header, tab and conditions rows staying as wide
   * as on every other page.
   */
  width?: PageWidth;
  wrapsTitle?: boolean;
  /**
   * header lays a list page out as Plane does: its actions and its toolbar's tools at the card's header row, its tabs in
   * a row under it, the conditions in force under them, the content across the whole width (HeaderChromePage). A phone
   * keeps the same rows, its action floating as the +. width, when given, keeps the content alone to a centred column.
   */
  chrome?: 'header';
  /**
   * Legacy (BIT before the SandboxHr parts): a page's own controls at the header row's end and its conditions in a row
   * under it. New pages use chrome="header" with ListToolbar instead; these go once the old pages move.
   */
  tools?: ReactNode; conditions?: ReactNode;
  children: ReactNode;
}) {
  const targets = useContext(PageChromeContext);
  // A page with a way back (a detail, a form) tells the shell, which gives it a phone's whole screen.
  const setBackShown = useContext(PageBackShownContext);
  const hasBack = !!back;
  useLayoutEffect(() => {
    if (!hasBack) return undefined;
    setBackShown(true);
    return () => setBackShown(false);
  }, [hasBack, setBackShown]);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  if (chrome === 'header') {
    const { tools, actions: actionTarget, rows } = targets;
    // The shell's rows are set on its first commit; until then the page waits a frame rather than flash the old layout.
    if (!tools || !rows || (!isMobile && !actionTarget)) return null;
    return <HeaderChromePage title={title} actions={actions} tabs={tabs} width={givenWidth} targets={{ tools, actions: actionTarget, rows }} isMobile={isMobile}>
      {children}
    </HeaderChromePage>;
  }
  const width = givenWidth ?? 'default';
  // A page of its own (no back link) is named by the trail in the card's header row (the top bar on a phone).
  const quiet = back ? '' : `${styles.quiet} ${styles.mobileQuiet}`;
  const wayBack = backLinkOf(back);
  const mark = icon && <span className={`${styles.titleIcon} ${quiet}`} aria-hidden="true"><NavIcon name={icon} /></span>;
  // With tabs the page's actions end the tab row, above whatever the tabs hold; without, they end the title row.
  const rowActions = tabs ? undefined : actions;
  const actionsClass = quiet ? styles.mobileGone : '';
  const heading = rowActions || icon
    ? <HStack gap={3} vAlign={wrapsTitle ? 'start' : 'center'} className={styles.titleRow}>
      {mark}
      <div className={`${styles.title} ${quiet}`} data-wraps={wrapsTitle || undefined}><Heading level={1} maxLines={wrapsTitle ? undefined : 1}>{title}</Heading></div>
      {rowActions && <HStack gap={2} vAlign="center" className={`${styles.actions} ${actionsClass}`} data-page-action>{rowActions}</HStack>}
    </HStack>
    : <div className={quiet}><Heading level={1}>{title}</Heading></div>;
  const legacy = <>
    {tools && targets.tools && createPortal(tools, targets.tools)}
    {conditions && targets.rows && createPortal(<div className={styles.conditions} data-action-row>{conditions}</div>, targets.rows)}
  </>;
  return <VStack gap={6} className={`${styles.page} ${width === 'default' ? '' : styles[width]}`}>
    {legacy}
    {!targets.tools && tools}
    {tabs || hasRule
      // Without tabs a header with nothing in sight (no actions, or a phone's) leaves the page to the content with its rule.
      ? <VStack gap={4} className={tabs || back ? undefined : actions ? styles.mobileQuiet : styles.quiet}>{heading}
        <div className={`${styles.rule} ${tabs && actions ? styles.tabRow : ''}`}>{tabs}
          {tabs && actions && <HStack gap={2} vAlign="center" className={`${styles.tabActions} ${actionsClass}`} data-page-action>{actions}</HStack>}
        </div></VStack>
      : heading}
    <PageWidthContext.Provider value={width}>
      <PageBack.Provider value={back}>{children}</PageBack.Provider>
      {isMobile && wayBack && <PageFoot isFallback start={<BackButton link={wayBack} label="이전으로" variant="secondary" />} />}
    </PageWidthContext.Provider>
  </VStack>;
}
