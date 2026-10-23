import { createContext, useContext } from 'react';

/**
 * Where a page puts its chrome when it asks for the card's header (PageFrame chrome="header"), as Plane lays its pages
 * out: the header row's end (tools, then actions) and the rows under it (a desktop's tabs with their tools, then the
 * conditions in force), and for every page the card's foot (PageFoot). The shell provides the elements; a phone has no
 * actions there (its create action floats as the +). Without them (a page outside the shell) a page keeps its chrome
 * inside its own content.
 */
export type PageChromeTargets = { tools: HTMLElement | null; actions: HTMLElement | null; rows: HTMLElement | null; foot?: HTMLElement | null };
export const PageChromeContext = createContext<PageChromeTargets>({ tools: null, actions: null, rows: null, foot: null });

/**
 * What a page in the header chrome hands its toolbar: where its search, sort and filters go (on a desktop the tab row's
 * end when the page has tabs, else the header row's tools; on a phone the toolbar's end), where its main action goes (a
 * desktop's header row; none on a phone), and where the conditions in force are listed. null outside such a page, where
 * the toolbar lays itself out in the content as before.
 */
export type PageTools = { tools: HTMLElement; actions: HTMLElement | null; applied: HTMLElement };
export const PageToolsContext = createContext<PageTools | null>(null);

/**
 * Tells the shell the page in view has a way back of its own (PageFrame back: a detail, a form), so a phone gives it the
 * whole screen, no bars above or below. Set while the page is mounted, before it paints.
 */
export const PageBackShownContext = createContext<(hasBack: boolean) => void>(() => undefined);
export const usePageTools = () => useContext(PageToolsContext);
