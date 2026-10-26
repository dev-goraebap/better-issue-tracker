import { useEffect, useState } from 'react';
import { NavIcon } from '../NavIcon';
import { loadedIcons, loadIcons, markKind } from './catalog';
import styles from './icon-picker.module.css';

/**
 * A project's or a view's mark icon, whatever was picked (D-086): a lucide icon by name (its set is fetched the first
 * time one is needed, an empty square of the same size meanwhile), or a name from before as the app's own icon. Sized
 * by its parent like any icon (the svg's box).
 */
export function MarkIcon({ name }: { name: string }) {
  const kind = markKind(name);
  const [icons, setIcons] = useState(loadedIcons);
  useEffect(() => {
    if (kind !== 'icon' || icons) return;
    let isLive = true;
    void loadIcons().then(all => { if (isLive) setIcons(all); });
    return () => { isLive = false; };
  }, [kind, icons]);
  if (kind === 'legacy') return <NavIcon name={name} />;
  const Icon = icons?.[name];
  return Icon ? <Icon className="bit-nav-icon" size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" /> : <span className={styles.pending} aria-hidden="true" />;
}
