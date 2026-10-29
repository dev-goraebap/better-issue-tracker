import { useEffect, useState } from 'react';
import { NavIcon } from '../NavIcon';
import { SOLAR_ICONS } from '../solar-icons';
import { SolarIcon } from '../SolarIcon';
import { loadedLucide, loadedSolar, loadLucide, loadSolar, markKind, markOf } from './catalog';
import styles from './icon-picker.module.css';

/**
 * A project's or a view's mark icon, whatever was picked (D-086, D-112): a Solar icon (the common ones drawn at once,
 * the rest once the whole set is fetched), a name from before as the app's own icon, or a lucide icon picked before
 * the marks were Solar's (as its Solar icon where there is one); an empty square of the same size holds the place
 * while a set is fetched. Sized by its parent like any icon (the svg's box).
 */
export function MarkIcon({ name }: { name: string }) {
  const mark = markOf(name);
  const kind = markKind(name);
  const own = SOLAR_ICONS[mark];
  const [solar, setSolar] = useState(loadedSolar);
  const [lucide, setLucide] = useState(loadedLucide);
  useEffect(() => {
    let isLive = true;
    if (kind === 'solar' && !own && !solar) void loadSolar().then(all => { if (isLive) setSolar(all); });
    if (kind === 'lucide' && !lucide) void loadLucide().then(all => { if (isLive) setLucide(all); });
    return () => { isLive = false; };
  }, [kind, own, solar, lucide]);
  if (kind === 'legacy') return <NavIcon name={mark} />;
  if (kind === 'solar') {
    const body = own ?? solar?.[mark.slice(2)];
    return body ? <SolarIcon body={body} /> : <span className={styles.pending} aria-hidden="true" />;
  }
  const Icon = lucide?.[mark];
  return Icon ? <Icon className="bit-nav-icon" size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" /> : <span className={styles.pending} aria-hidden="true" />;
}
