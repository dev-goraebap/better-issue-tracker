import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { MARK_ICONS, PALETTE } from '@/shared/config';
import { NavIcon } from '../NavIcon';
import { iconOf, LEGACY_MARKS, loadedIcons, loadIcons, searchIcons } from './catalog';
import styles from './icon-picker.module.css';

export type Mark = { icon: string; color: string };

/** How many icons the full set draws at first and adds as its end scrolls into sight: there are about 1,900. */
const PAGE = 240;
/** The icons offered first, before the whole set: the marks' first icons and the ones teams reach for most. */
const COMMON = [...MARK_ICONS.map(name => LEGACY_MARKS[name]!), 'Rocket', 'Star', 'Heart', 'Target', 'Lightbulb', 'Bug', 'Code', 'Palette',
  'Briefcase', 'Globe', 'Zap', 'Bell', 'Book', 'Box', 'Building2', 'ChartColumn', 'CreditCard', 'Database', 'Gift', 'GraduationCap',
  'Megaphone', 'Package', 'Smartphone', 'Trophy', 'Bot', 'Brain', 'Cloud', 'Coffee', 'Compass', 'Flame', 'Leaf', 'Map', 'Music', 'Puzzle'];

/**
 * The inside of the mark picker, as Linear's (D-086): a search across the top (an icon's English name or a common
 * Korean word), the palette's colours in two rows of eight, then a grid of the common icons and every lucide icon, in
 * the mark's colour. The full set is fetched the first time the picker opens. Arrow keys move through the grid, Down
 * in the search steps into it and Enter there picks the first match.
 */
export function IconPanel({ value, isMobile, onPick, onColor }: {
  value: Mark; isMobile: boolean; onPick: (icon: string) => void; onColor: (color: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [icons, setIcons] = useState(loadedIcons);
  const grid = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const chosen = iconOf(value.icon);

  useEffect(() => {
    if (icons) return;
    let isLive = true;
    void loadIcons().then(all => { if (isLive) setIcons(all); });
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
  const common = useMemo(() => COMMON.filter(name => icons?.[name]), [icons]);
  const found = useMemo(() => searchIcons(names, query), [names, query]);

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

  const cell = (name: string) => {
    const Icon = icons![name]!;
    return <button key={name} type="button" data-cell className={styles.cell} aria-pressed={chosen === name} aria-label={name} title={name}
      tabIndex={chosen === name ? 0 : -1} style={{ color: value.color }} onClick={() => onPick(name)}><Icon aria-hidden="true" /></button>;
  };

  let body;
  if (!icons) body = <p className={styles.note}>불러오는 중입니다</p>;
  else if (query) body = found.length ? <div className={styles.cells}>{found.slice(0, limit).map(cell)}</div> : <p className={styles.note}>'{query}'에 맞는 아이콘이 없습니다</p>;
  else body = <>
    <h3 className={styles.group}>자주 쓰는 아이콘</h3><div className={styles.cells}>{common.map(cell)}</div>
    <h3 className={styles.group}>모든 아이콘 {names.length.toLocaleString()}개</h3><div className={styles.cells}>{names.slice(0, limit).map(cell)}</div>
  </>;

  return <div className={styles.panel} data-size={isMobile ? 'lg' : undefined}>
    <div className={styles.top}>
      <label className={styles.searchBox}>
        <NavIcon name="search" />
        <input className={styles.search} value={query} autoFocus={!isMobile} aria-label="아이콘 찾기" placeholder="아이콘 찾기 (예: 달력, rocket)"
          onChange={event => setQuery(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); const first = query ? found[0] : common[0]; if (first) onPick(first); }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              (grid.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? grid.current?.querySelector<HTMLButtonElement>('button[data-cell]'))?.focus();
            }
          }} />
      </label>
      <div className={styles.colors} role="group" aria-label="색">
        {PALETTE.map(color => <button key={color.value} type="button" aria-pressed={value.color === color.value} aria-label={color.name} title={color.name}
          className={styles.color} style={{ background: color.value }} onClick={() => onColor(color.value)} />)}
      </div>
    </div>
    <div ref={grid} className={styles.grid} role="group" aria-label="아이콘" onKeyDown={keys}>
      {body}
      <div ref={end} className={styles.end} />
    </div>
  </div>;
}
