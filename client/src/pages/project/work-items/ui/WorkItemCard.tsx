import type { DragEvent } from 'react';
import { Button, HStack, Text, VStack } from '@astryxdesign/core';
import { Link } from '@tanstack/react-router';
import { PRIORITIES, type WorkItem } from '@/entities/work-item';
import type { BoardColumn } from '@/entities/project';
import { WorkItemActions } from './WorkItemActions';
import styles from './work-items.module.css';
export function WorkItemCard({ item, columns, canWrite, busy, onDrag, onDrop, up, down }: { item: WorkItem; columns: BoardColumn[]; canWrite: boolean; busy: boolean; onDrag: (item: WorkItem | null) => void; onDrop: (event: DragEvent, before: WorkItem) => void; up?: () => void; down?: () => void }) {
  return <article className={styles.card} draggable={canWrite && !busy && !item.deletedAt} onDragStart={event => { if (!canWrite || busy || item.deletedAt) { event.preventDefault(); return; } event.dataTransfer.setData('application/x-bit-work-item', item.id); event.dataTransfer.effectAllowed = 'move'; onDrag(item); }} onDragEnd={() => onDrag(null)} onDragOver={event => event.preventDefault()} onDrop={event => { event.stopPropagation(); onDrop(event, item); }}>
    <HStack gap={2} justify="between"><Text type="supporting" color="secondary">{item.key}</Text>{item.priority && <Text type="supporting" weight="medium">{PRIORITIES[item.priority]}</Text>}</HStack>
    {item.deletedAt ? <Text weight="semibold">{item.title}</Text> : <Link className={styles.taskTitle} to="/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId: item.workspaceId, projectId: item.projectId, workItemId: item.id }}>{item.title}</Link>}
    <HStack gap={3} wrap="wrap"><Text type="supporting" color="secondary">{item.assigneeName ?? '담당자 없음'}</Text>{item.dueDate && <Text type="supporting" color="secondary">{item.dueDate}</Text>}{item.archivedAt && <Text type="supporting">보관</Text>}</HStack>
    {canWrite && <HStack gap={1} className={styles.cardActions}><WorkItemActions item={item} columns={columns} disabled={busy} />{!item.deletedAt && <><Button label="위로" size="sm" variant="ghost" onClick={up} isDisabled={busy || !up} /><Button label="아래로" size="sm" variant="ghost" onClick={down} isDisabled={busy || !down} /></>}</HStack>}
  </article>;
}
