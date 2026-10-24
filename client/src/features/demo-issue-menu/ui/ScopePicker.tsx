import { NavIcon, Select } from '@/shared/ui';
import type { Project } from '@/entities/demo-sample';
import styles from './issue-menu.module.css';

const ALL = 'all';
const MANAGE = 'manage';

/**
 * The issue menus' scope at the head of their group (D-063), as a select the menu's width: 전체, then the workspace's
 * projects each led by its mark, then 프로젝트 관리 under a rule. Choosing a scope keeps the menu in view (onPick);
 * 프로젝트 관리 opens the projects (onManage) and leaves the scope as it was. A folded menu shows the chosen mark alone.
 */
export function ScopePicker({ projects, scope, isFolded, onPick, onManage }: {
  projects: readonly Project[]; scope?: string; isFolded: boolean; onPick: (projectId?: string) => void; onManage: () => void;
}) {
  const chosen = projects.find(project => project.id === scope);
  const mark = (project?: Project) => (project
    ? <span className={styles.scopeMark} aria-hidden="true">{project.key.slice(0, 1)}</span>
    : <span className={styles.scopeAll} aria-hidden="true"><NavIcon name="grid" /></span>);
  if (isFolded) return <span className={styles.scopeFolded} title={`범위: ${chosen?.name ?? '전체'}`}>{mark(chosen)}</span>;
  return <Select label="이슈 범위" isLabelHidden value={chosen?.id ?? ALL}
    options={[
      { value: ALL, label: '전체', icon: mark() },
      ...projects.map(project => ({ value: project.id, label: project.name, icon: mark(project) })),
      { type: 'divider' as const },
      { value: MANAGE, label: '프로젝트 관리', icon: <span className={styles.scopeAll} aria-hidden="true"><NavIcon name="settings" /></span> },
    ]}
    onChange={value => (value === MANAGE ? onManage() : onPick(!value || value === ALL ? undefined : value))} />;
}
