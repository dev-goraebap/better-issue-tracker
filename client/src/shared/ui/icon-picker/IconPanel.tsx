import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { MARK_ICONS } from '@/shared/config';
import { ColorPalette } from '../color-palette';
import { NavIcon } from '../NavIcon';
import { SOLAR_ICONS } from '../solar-icons';
import { loadedSolar, loadSolar, markOf, searchIcons } from './catalog';
import { SolarIcon } from '../SolarIcon';
import styles from './icon-picker.module.css';

export type Mark = { icon: string; color: string };

/** How many icons the full set draws at first and adds as its end scrolls into sight: there are about 1,460. */
const PAGE = 240;
/** The icons offered first, before the whole set: the marks' first icons and the Solar ones teams reach for most (D-112). */
const COMMON = [...MARK_ICONS, ...Object.keys(SOLAR_ICONS).filter(name => name.startsWith('s:'))];

/**
 * The inside of the mark picker, as Linear's (D-086): a search across the top (an icon's English name or a common
 * Korean word), the palette's colours in two rows of eight, then a grid of the common icons and every Solar icon, in
 * the mark's colour. The full set is fetched the first time the picker opens. Arrow keys move through the grid, Down
 * in the search steps into it and Enter there picks the first match.
 */
export function IconPanel({ value, isMobile, onPick, onColor }: {
  value: Mark; isMobile: boolean; onPick: (icon: string) => void; onColor: (color: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [icons, setIcons] = useState(loadedSolar);
  const grid = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const chosen = markOf(value.icon);

  useEffect(() => {
    if (icons) return;
    let isLive = true;
    void loadSolar().then(all => { if (isLive) setIcons(all); });
    return () => { isLive = false; };
  }, [icons]);
  useEffect(() => { setLimit(PAGE); grid.current?.scrollTo({ top: 0 }); }, [query]);
  useEffect(() => {
    const sentinel = end.current;
    if (!sentinel) return;
    const watch = new IntersectionObserver(seen => { if (seen.some(each => each.isIntersecting)) setLimit(count => count + PAGE); }, { root: grid.current, rootMargin: '200px' });
    watch.observe(sentinel);
    return () => watch.disconnect();
  });

  const names = useMemo(() => (icons ? Object.keys(icons).sort() : []), [icons]);
  const found = useMemo(() => searchIcons(names, query).map(name => `s:${name}`), [names, query]);

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const cells = [...(grid.current?.querySelectorAll<HTMLButtonElement>('button[data-cell]') ?? [])];
    const at = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const columns = Math.max(1, Math.round((grid.current?.clientWidth ?? 0) / cells[0]!.offsetWidth));
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    cells[Math.min(cells.length - 1, Math.max(0, at + step))]?.focus();
  };

  // A cell is a mark's value: an app icon's name, or `s:` and a Solar icon's.
  const cell = (mark: string) => {
    const solar = mark.startsWith('s:') ? mark.slice(2) : undefined;
    const drawing = solar ? SOLAR_ICONS[mark] ?? icons?.[solar] : undefined;
    return <button key={mark} type="button" data-cell className={styles.cell} aria-pressed={chosen === mark} aria-label={solar ?? mark} title={solar ?? mark}
      tabIndex={chosen === mark ? 0 : -1} style={{ color: value.color }} onClick={() => onPick(mark)}>{drawing ? <SolarIcon body={drawing} /> : <NavIcon name={mark} />}</button>;
  };

  let body;
  if (!icons) body = <p className={styles.note}>불러오는 중입니다</p>;
  else if (query) body = found.length ? <div className={styles.cells}>{found.slice(0, limit).map(cell)}</div> : <p className={styles.note}>'{query}'에 맞는 아이콘이 없습니다</p>;
  else body = <>
    <h3 className={styles.group}>자주 쓰는 아이콘</h3><div className={styles.cells}>{COMMON.map(cell)}</div>
    <h3 className={styles.group}>모든 아이콘 {names.length.toLocaleString()}개</h3><div className={styles.cells}>{names.slice(0, limit).map(name => cell(`s:${name}`))}</div>
  </>;

  return <div className={styles.panel} data-size={isMobile ? 'lg' : undefined}>
    <div className={styles.top}>
      <label className={styles.searchBox}>
        <NavIcon name="search" />
        <input className={styles.search} value={query} autoFocus={!isMobile} aria-label="아이콘 찾기" placeholder="아이콘 찾기 (예: 달력, rocket)"
          onChange={event => setQuery(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); const first = query ? found[0] : COMMON[0]; if (first) onPick(first); }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              (grid.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? grid.current?.querySelector<HTMLButtonElement>('button[data-cell]'))?.focus();
            }
          }} />
      </label>
      <ColorPalette value={value.color} onChange={onColor} />
    </div>
    <div ref={grid} className={styles.grid} role="group" aria-label="아이콘" onKeyDown={keys}>
      {body}
      <div ref={end} className={styles.end} />
    </div>
  </div>;
}
