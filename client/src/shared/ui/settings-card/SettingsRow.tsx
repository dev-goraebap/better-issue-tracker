import type { ReactNode } from 'react';
import styles from './settings-card.module.css';

/**
 * One line of a SettingsCard: what it sets (label, with a short description under it when the control needs one) at
 * the start and its control at the end (an input, a switch, a button), a hairline between lines. lead goes before the
 * label (a picture). A phone stacks the control under the label once the line is too narrow. isStacked always puts
 * the control under the label at the line's full width: for a value of several lines (a description), which a narrow
 * box at the end would cut short.
 */
export function SettingsRow({ label, description, lead, isStacked = false, children }: {
  label: ReactNode; description?: ReactNode; lead?: ReactNode; isStacked?: boolean; children?: ReactNode;
}) {
  return <div className={styles.row} data-stacked={isStacked || undefined}>
    {lead && <span className={styles.lead}>{lead}</span>}
    <span className={styles.text}>
      <span className={styles.label}>{label}</span>
      {description && <span className={styles.description}>{description}</span>}
    </span>
    {children && <span className={styles.control}>{children}</span>}
  </div>;
}
