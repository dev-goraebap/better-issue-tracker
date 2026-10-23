import { DropdownMenu } from '@astryxdesign/core';
import { NavIcon } from '@/shared/ui';
import type { Project } from '@/entities/demo-sample';
import styles from './home.module.css';

/**
 * The desktop's 만들기 at the end of the home's header row, as SandboxHr's calendar has its 새로 만들기: a schedule of
 * the workspace (onSchedule opens its dialog), or a work item, which belongs to a project, so 작업 opens the projects to
 * put it in.
 */
export function CreateMenu({ projects, onSchedule, onWork }: { projects: readonly Project[]; onSchedule: () => void; onWork: (projectId: string) => void }) {
  return <DropdownMenu button={{ label: '만들기', variant: 'primary', size: 'sm', icon: <NavIcon name="plus" /> }} hasChevron menuWidth={280} alignment="end" items={[
    { id: 'schedule', label: '일정', description: '워크스페이스 달력에 올립니다', icon: <span className={styles.menuIcon} data-kind="schedule"><NavIcon name="calendar" /></span>, onClick: onSchedule },
    { id: 'work', label: '작업', description: '프로젝트에 넣습니다', icon: <span className={styles.menuIcon} data-kind="work"><NavIcon name="tasks" /></span>,
      items: projects.map(project => ({ id: project.id, label: project.name, icon: <span className={styles.projectKey}>{project.key.slice(0, 1)}</span>, onClick: () => onWork(project.id) })) },
  ]} />;
}
