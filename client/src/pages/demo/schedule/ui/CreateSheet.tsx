import { Button } from '@astryxdesign/core';
import { CompactDialog, NavIcon } from '@/shared/ui';
import type { Project } from '@/entities/demo-sample';
import styles from './schedule.module.css';

/**
 * A phone's 만들기, opened by the floating +: the desktop menu's choices laid out at once, 일정 first, then a work item
 * in each of the workspace's projects.
 */
export function CreateSheet({ isOpen, projects, onSchedule, onWork, onClose }: {
  isOpen: boolean; projects: readonly Project[]; onSchedule: () => void; onWork: (projectId: string) => void; onClose: () => void;
}) {
  return <CompactDialog isOpen={isOpen} title="만들기" onClose={onClose} footer={<Button label="닫기" variant="ghost" onClick={onClose} />}>
    <ul className={styles.choices}>
      <li><button type="button" className={styles.choice} onClick={onSchedule}>
        <span className={styles.menuIcon} data-kind="schedule"><NavIcon name="calendar" /></span>일정</button></li>
      {projects.map(project => <li key={project.id}><button type="button" className={styles.choice} onClick={() => onWork(project.id)}>
        <span className={styles.menuIcon} data-kind="work"><NavIcon name="tasks" /></span>{project.name}에 작업</button></li>)}
    </ul>
  </CompactDialog>;
}
