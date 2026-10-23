import styles from './settings-card.module.css';

/**
 * The head of a settings page, as Kaneo's: its name large enough to read as the page's (the trail stays small above) and
 * one short line on what the page sets, nothing more: no notes on saving or applying, which the controls show by
 * working. Settings pages are the exception to bit-frontend 04's "no description under the title" (D-059).
 */
export function SettingsHead({ title, description }: { title: string; description: string }) {
  return <header className={styles.head}>
    <h2 className={styles.headTitle}>{title}</h2>
    <span className={styles.headDescription}>{description}</span>
  </header>;
}
