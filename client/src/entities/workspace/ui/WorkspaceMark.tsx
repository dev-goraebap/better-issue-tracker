import { useMemo, useState } from 'react';
import { isImageAtHand, noteImageArrived } from '@/shared/lib/image-traits';
import type { Picture } from '@/shared/lib/person-pictures';
import styles from './workspace-mark.module.css';

/** One of six quiet tones, the same for a workspace every time (from its id). */
const toneOf = (id: string) => [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;

/** Where a workspace's logo is read; its id is in it, so a browser keeps the bytes for good. */
export const logoUrl = (workspaceId: string, logo: Picture) =>
  `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/logo/${encodeURIComponent(logo.id)}`;

/**
 * A workspace's mark, a rounded square at sm (20px, menus and lists), md (24px, the menu's head) or lg (64px): its logo
 * when it has one (BIT-30), fading in over the logo's main colour unless it is at hand already, else its first letter
 * on its tone.
 */
export function WorkspaceMark({ workspace, size = 'md' }: {
  workspace: { id: string; name: string; logo?: Picture | null }; size?: 'sm' | 'md' | 'lg';
}) {
  const src = workspace.logo ? logoUrl(workspace.id, workspace.logo) : undefined;
  const [loaded, setLoaded] = useState<string>();
  const isAtOnce = useMemo(() => isImageAtHand(src), [src]);
  if (!src) return <span className={styles.mark} data-size={size} data-tone={toneOf(workspace.id)} aria-hidden="true">
    {workspace.name.trim().slice(0, 1).toUpperCase() || '?'}
  </span>;
  return <span className={styles.mark} data-size={size} data-tone={workspace.logo?.color ? undefined : toneOf(workspace.id)}
    data-picture data-shown={isAtOnce || loaded === src || undefined} data-at-once={isAtOnce || undefined}
    style={workspace.logo?.color ? { background: workspace.logo.color } : undefined} aria-hidden="true">
    <img key={src} src={src} alt="" onLoad={() => { noteImageArrived(src); setLoaded(src); }} />
  </span>;
}
