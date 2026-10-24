import type { DragEvent, MouseEvent } from 'react';
import { Button, IconButton } from '@astryxdesign/core';
import { CompactDialog, DefaultAvatar, NavIcon } from '@/shared/ui';
import { personOf, PriorityMark, type WorkItem } from '@/entities/demo-sample';
import { WORK_DRAG_TYPE } from '@/widgets/demo-calendar';
import styles from './schedule.module.css';

/**
 * 날짜 미정: the workspace's open work with no due day, beside the calendar. A desktop's is a drawer at the calendar's
 * end, each row carried onto a day to give it that day (WORK_DRAG_TYPE) or pressed to open it; a phone's is a sheet
 * whose rows open the item. The page decides when it shows.
 */
export function UndatedWork({ items, workspaceId, isMobile, isOpen, onClose, onOpen }: {
  items: readonly WorkItem[]; workspaceId: string; isMobile: boolean; isOpen: boolean; onClose: () => void; onOpen: (href: string) => void;
}) {
  const hrefOf = (item: WorkItem) => `/demo/w/${workspaceId}/p/${item.projectId}/work-items/${item.id}`;
  const open = (item: WorkItem) => (event: MouseEvent) => { event.preventDefault(); onOpen(hrefOf(item)); };
  const carry = (item: WorkItem) => (event: DragEvent) => {
    event.dataTransfer.setData(WORK_DRAG_TYPE, item.id);
    event.dataTransfer.effectAllowed = 'move';
  };
  const rows = items.length === 0 ? <p className={styles.undatedEmpty}>날짜 없는 작업이 없습니다.</p> : <ul className={styles.undated}>{items.map(item => {
    const assignee = personOf(item.assigneeId);
    return <li key={item.id}>
      <a href={hrefOf(item)} className={styles.undatedRow} draggable={!isMobile} onDragStart={carry(item)} onClick={open(item)}>
        <span className={styles.undatedKey}>{item.key}</span>
        <span className={styles.undatedTitle}>{item.title}</span>
        <span className={styles.undatedMeta}>
          <PriorityMark priority={item.priority} />
          {assignee && <DefaultAvatar seed={assignee.id} name={assignee.name} size={20} />}
        </span>
      </a>
    </li>;
  })}</ul>;
  if (isMobile) return <CompactDialog isOpen={isOpen} title={`날짜 미정 ${items.length}`} onClose={onClose}
    footer={<Button label="닫기" variant="ghost" onClick={onClose} />}>{rows}</CompactDialog>;
  if (!isOpen) return null;
  return <aside className={styles.drawer} aria-label="날짜 미정 작업">
    <header className={styles.drawerHead}>
      <h2 className={styles.drawerTitle}>날짜 미정 <span className={styles.drawerCount}>{items.length}</span></h2>
      <IconButton label="날짜 미정 접기" tooltip="접기" variant="ghost" size="sm" icon={<NavIcon name="close" />} onClick={onClose} />
    </header>
    {rows}
  </aside>;
}
