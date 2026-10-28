import { NavIcon } from '@/shared/ui';
import type { WorkItemTypeRef } from '../api/work-item-type';
import { DEFAULT_TYPE_ICON } from '../model/rules';
import styles from './type-mark.module.css';

/**
 * A work item's type (D-104) as a mark: its icon in its colour, 14px (sm) beside a title or in a menu, 16px (md) at a
 * settings row's lead. The type's name is the mark's accessible name and its tooltip.
 */
export function TypeMark({ type, size = 'sm' }: { type: Pick<WorkItemTypeRef, 'name' | 'icon' | 'color'>; size?: 'sm' | 'md' }) {
  return <span className={styles.mark} data-size={size} style={{ color: type.color }} role="img" aria-label={type.name} title={type.name}>
    <NavIcon name={type.icon || DEFAULT_TYPE_ICON} />
  </span>;
}
