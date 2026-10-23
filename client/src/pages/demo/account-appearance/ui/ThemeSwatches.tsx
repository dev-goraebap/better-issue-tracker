import { LOOK_CHOICES, lookOf } from '@/shared/config';
import { setAppearance, useAppearance } from '@/shared/lib/appearance';
import { NavIcon } from '@/shared/ui';
import styles from './appearance.module.css';

/**
 * The looks as swatches (as Discord shows its themes): a square per look, its own picture (system half light, half dark with the sync
 * mark), the one in force ringed in the accent with a check; pressing one applies it at once for this browser. A radio
 * group to assistive technology, each named by its label, which also shows under the swatch on hover.
 */
export function ThemeSwatches() {
  const appearance = useAppearance();
  const current = lookOf(appearance);
  return <div className={styles.swatches} role="radiogroup" aria-label="색상 테마">
    {LOOK_CHOICES.map(choice => {
      const isChosen = choice.id === current;
      return <button key={choice.id} type="button" role="radio" aria-checked={isChosen} className={styles.swatch} data-chosen={isChosen || undefined}
        title={`${choice.label} · ${choice.description}`} onClick={() => setAppearance(choice.apply)}>
        <span className={styles.swatchArt} style={{ background: choice.preview }} aria-hidden="true">
          {choice.id === 'system' && <span className={styles.syncMark}><NavIcon name="retry" /></span>}
        </span>
        {isChosen && <span className={styles.check} aria-hidden="true"><NavIcon name="check" /></span>}
        <span className={styles.swatchLabel}>{choice.label}</span>
      </button>;
    })}
  </div>;
}
