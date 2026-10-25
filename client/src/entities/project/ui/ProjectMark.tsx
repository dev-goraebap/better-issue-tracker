import type { CSSProperties } from 'react';
import { NavIcon } from '@/shared/ui';
import styles from './project-mark.module.css';

/**
 * A project's mark: its icon in its colour on a faint wash of that colour, or, for a project without one (made before
 * marks or by an agent), the key's first letter on a muted square. sm (20px) sits in menus and the sidebar, xs (14px)
 * in the new issue's chip, md (28px) at a list row's lead.
 */
export function ProjectMark({ project, size = 'sm' }: { project: { key: string; icon?: string | null; color?: string | null }; size?: 'xs' | 'sm' | 'md' }) {
  const tone = project.color ? { '--mark': project.color } as CSSProperties : undefined;
  return <span className={styles.mark} data-size={size} data-icon={project.icon ? '' : undefined} style={tone} aria-hidden="true">
    {project.icon ? <NavIcon name={project.icon} /> : project.key.slice(0, 1)}
  </span>;
}
