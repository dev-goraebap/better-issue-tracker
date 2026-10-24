import styles from './workspace-mark.module.css';

/** One of six quiet tones, the same for a workspace every time (from its id). */
const toneOf = (id: string) => [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;

/**
 * A workspace's mark: its first letter on its tone, a rounded square at sm (20px, menus and lists), md (24px, the menu's
 * head) or lg (64px). A workspace logo replaces the letter once workspaces have one (D-071).
 */
export function WorkspaceMark({ workspace, size = 'md' }: { workspace: { id: string; name: string }; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={styles.mark} data-size={size} data-tone={toneOf(workspace.id)} aria-hidden="true">
    {workspace.name.trim().slice(0, 1).toUpperCase() || '?'}
  </span>;
}
