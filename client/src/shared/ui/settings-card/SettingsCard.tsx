import type { ReactNode } from 'react';
import { SectionHeader } from '../section-header';
import styles from './settings-card.module.css';

/**
 * A section of settings as one card, as Kaneo's settings: the section's quiet name above (SectionHeader, its own action
 * at the end), then a ruled card of SettingsRow lines. tone="danger" rules the card in the danger colour for the
 * section that removes things, always the page's last.
 */
export function SettingsCard({ title, id, actions, tone, children }: { title: string; id?: string; actions?: ReactNode; tone?: 'danger'; children: ReactNode }) {
  return <section className={styles.section} aria-labelledby={id}>
    <SectionHeader id={id} title={title} actions={actions} />
    <div className={styles.card} data-tone={tone}>{children}</div>
  </section>;
}
