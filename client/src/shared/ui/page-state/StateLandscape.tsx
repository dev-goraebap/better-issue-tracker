import { useId, useState } from 'react';
import empty01 from './landscapes/empty-01.webp';
import empty02 from './landscapes/empty-02.webp';
import empty03 from './landscapes/empty-03.webp';
import search01 from './landscapes/search-01.webp';
import search02 from './landscapes/search-02.webp';
import search03 from './landscapes/search-03.webp';
import error40401 from './landscapes/error-404-01.webp';
import error40402 from './landscapes/error-404-02.webp';
import error40403 from './landscapes/error-404-03.webp';
import error50001 from './landscapes/error-500-01.webp';
import error50002 from './landscapes/error-500-02.webp';
import error50003 from './landscapes/error-500-03.webp';
import styles from './page-state.module.css';

/** What a state screen tells: nothing yet, nothing matching, no such thing, or a failure. */
export type StateKind = 'empty' | 'search' | 'not-found' | 'error';
/** One of a state's three drawings, fixed for a check or a screenshot. */
export type StateVariant = 0 | 1 | 2;

/**
 * Each state's three landscapes in thin pen lines (./landscapes), in the order variant picks them, each with
 * the line its drawing ends at: the paper below it is cut to a like margin, so the title sits as close under every one.
 */
const drawings: Record<StateKind, readonly [Drawing, Drawing, Drawing]> = {
  // A garden shed, a greenhouse, a stall.
  empty: [['empty-01', 894], ['empty-02', 902], ['empty-03', 916]],
  // A drawer with a magnifier, a telescope, an empty bookshop.
  search: [['search-01', 865], ['search-02', 915], ['search-03', 913]],
  // A mailbox, a garden gate, a small station.
  'not-found': [['error-404-01', 846], ['error-404-02', 951], ['error-404-03', 894]],
  // A tool shed, a windmill, a truck under repair.
  error: [['error-500-01', 879], ['error-500-02', 914], ['error-500-03', 838]],
};
type Drawing = readonly [name: string, end: number];
/** The paper kept above every drawing (the highest starts below it) and below each one's last line. */
const TOP = 110;
const MARGIN = 16;
const SIZE = { width: 1536, height: 1024 };

// Built into the app's assets, so each file is named by its content and cached for good.
const files: Record<string, unknown> = {
  'empty-01': empty01,
  'empty-02': empty02,
  'empty-03': empty03,
  'search-01': search01,
  'search-02': search02,
  'search-03': search03,
  'error-404-01': error40401,
  'error-404-02': error40402,
  'error-404-03': error40403,
  'error-500-01': error50001,
  'error-500-02': error50002,
  'error-500-03': error50003,
};
// A test run without the bundler gives a stand-in rather than an address; it draws nothing.
const fileOf = (name: string) => { const file = files[name]; return typeof file === 'string' ? file : ''; };
/** The drawings this page has already shown: they come back at once. */
const shown = new Set<string>();
/** Whether a drawing is at hand without waiting: shown before, or already in the browser's cache. */
function isAtHand(name: string): boolean {
  if (shown.has(name)) return true;
  if (typeof Image === 'undefined' || !fileOf(name)) return false;
  const probe = new Image();
  probe.src = fileOf(name);
  return probe.complete && probe.naturalWidth > 0;
}

/** One of a state's drawings by chance, for a host that outlives its state (a retry) to keep through it. */
export const pickVariant = () => Math.floor(Math.random() * 3) as StateVariant;

/**
 * A state's landscape: one of its three drawings, picked when the state first shows and kept through re-renders (a host
 * that unmounts it on a retry keeps its own pickVariant), never one of another state's. The file is no picture to show
 * as it is: its black lines and its blue marks (on some drawings only) are separated into two masks here and painted
 * with the theme's tokens, so every palette in light and dark draws it in its own ink and accent. Its room is kept from
 * the start; a drawing at hand (shown before, or in the browser's cache) shows at once, and one that has to be fetched
 * fades in once it has arrived. Decorative: the state's words carry its meaning.
 */
export function StateLandscape({ kind, variant, hasAccent = true }: {
  kind: StateKind; variant?: StateVariant; hasAccent?: boolean;
}) {
  // Masks and filters are found by id across the page, so each drawing keeps its own.
  const id = `landscape${useId().replace(/[^\w-]/g, '')}`;
  const [picked] = useState(pickVariant);
  const [name, end] = drawings[kind][variant ?? picked];
  // A drawing at hand shows at once; one that has to be fetched comes in once its file has arrived, rather than snapping
  // in partway through the state.
  const [arrived, setArrived] = useState(() => (isAtHand(name) ? name : undefined));
  const layer = (part: 'ink' | 'accent') => <mask id={`${id}-${part}`} maskUnits="userSpaceOnUse" x="0" y="0" {...SIZE} style={{ maskType: 'alpha' }}>
    <use href={`#${id}-image`} filter={`url(#${id}-${part}-filter)`} />
  </mask>;
  // Set on the frame's floor, so the title sits as close under every drawing whatever its height.
  return <svg viewBox={`0 ${TOP} ${SIZE.width} ${end + MARGIN - TOP}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" data-state-art={name}
    className={styles.drawing} data-arrived={arrived === name || undefined}>
    <defs>
      <image id={`${id}-image`} href={fileOf(name)} {...SIZE}
        onLoad={() => { shown.add(name); setArrived(name); }} />
      {/* A line is black (red as low as blue), a mark blue (blue over red): each filter keeps one of them as alpha. */}
      <filter id={`${id}-ink-filter`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 -1 0 1" />
        <feComposite in2="SourceAlpha" operator="in" />
      </filter>
      <filter id={`${id}-accent-filter`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1 0 1 0 0" />
        <feComposite in2="SourceAlpha" operator="in" />
      </filter>
      {layer('ink')}
      {hasAccent && layer('accent')}
    </defs>
    <rect {...SIZE} className={styles.ink} mask={`url(#${id}-ink)`} />
    {hasAccent && <rect {...SIZE} className={styles.accent} mask={`url(#${id}-accent)`} />}
  </svg>;
}
