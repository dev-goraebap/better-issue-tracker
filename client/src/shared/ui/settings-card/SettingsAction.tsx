import { Tooltip } from '@astryxdesign/core';
import { NavIcon } from '../NavIcon';
import styles from './settings-card.module.css';

/**
 * A SettingsRow's action (고치기, 삭제…) as the list header's 필터 and 표시: the icon small inside a round 28px chip on
 * a light ring, not bare, so a row's actions read as buttons side by side. A page's title row takes it for 편집 too. tone="danger" turns red under the pointer. On
 * a phone it stays 32px to look at and takes a 44px press (D-067).
 */
export function SettingsAction({ label, tooltip, icon, tone, isDisabled, onClick }: {
  label: string; tooltip: string; icon: string; tone?: 'danger'; isDisabled?: boolean; onClick: () => void;
}) {
  const button = <button type="button" className={styles.action} data-tone={tone} aria-label={label} disabled={isDisabled} onClick={onClick}>
    <NavIcon name={icon} />
  </button>;
  return isDisabled ? button : <Tooltip content={tooltip}>{button}</Tooltip>;
}
