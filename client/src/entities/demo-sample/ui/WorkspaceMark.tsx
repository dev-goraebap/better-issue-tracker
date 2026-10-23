import type { Workspace } from '../model/mock';
import styles from './workspace-mark.module.css';

/**
 * A workspace's mark: its logo when it has one, otherwise its first letter on its tone, a rounded square at sm (20px,
 * menus and lists), md (24px, the menu's head) or lg (64px, the create dialog's preview).
 */
export function WorkspaceMark({ workspace, size = 'md' }: { workspace: Pick<Workspace, 'name' | 'logo' | 'tone'>; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={styles.mark} data-size={size} data-tone={workspace.tone} aria-hidden="true">
    {workspace.logo ? <img src={workspace.logo} alt="" /> : workspace.name.trim().slice(0, 1).toUpperCase() || '?'}
  </span>;
}
