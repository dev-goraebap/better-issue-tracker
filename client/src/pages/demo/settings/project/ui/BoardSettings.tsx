import { useState } from 'react';
import { Button, IconButton, VStack } from '@astryxdesign/core';
import { NavIcon, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';
import { STATUS_LABELS, WORK_ITEMS, type Project, type Status } from '@/entities/demo-sample';
import styles from './project-settings.module.css';

type Column = { id: Status; name: string; isDone: boolean };

/**
 * 보드 칸: the project's board columns in order, each its colour, name and how many work items sit in it, the one that
 * finishes work marked (D-049: at least one, and never the last column removed); moved up and down a place at a time.
 */
export function BoardSettings({ project }: { project: Project }) {
  const [columns, setColumns] = useState<Column[]>(() => (Object.keys(STATUS_LABELS) as Status[]).map(id => ({ id, name: STATUS_LABELS[id], isDone: id === 'done' })));
  const count = (id: Status) => WORK_ITEMS.filter(item => item.projectId === project.id && item.status === id).length;
  const move = (from: number, by: number) => {
    const next = [...columns];
    const [column] = next.splice(from, 1);
    next.splice(from + by, 0, column!);
    setColumns(next);
  };
  return <VStack gap={8}>
    <SettingsHead title="보드 칸" description="작업이 흘러가는 칸입니다. 완료 칸에 들어간 작업은 끝난 것으로 셉니다." />
    <SettingsCard title={`칸 ${columns.length}개`} id="board-columns" actions={<Button label="새 칸" variant="secondary" size="sm" icon={<NavIcon name="plus" />} />}>
      {columns.map((column, index) => <SettingsRow key={column.id} lead={<span className={styles.dot} data-status={column.id} aria-hidden="true" />}
        label={<>{column.name}{column.isDone && <> <StatusToken label="완료 칸" color="green" /></>}</>} description={`작업 ${count(column.id)}개`}>
        <span className={styles.rowActions}>
          <IconButton label={`${column.name} 위로`} tooltip="위로" variant="ghost" size="sm" isDisabled={index === 0}
            icon={<span className={styles.up}><NavIcon name="forward" /></span>} onClick={() => move(index, -1)} />
          <IconButton label={`${column.name} 아래로`} tooltip="아래로" variant="ghost" size="sm" isDisabled={index === columns.length - 1}
            icon={<span className={styles.down}><NavIcon name="forward" /></span>} onClick={() => move(index, 1)} />
          <IconButton label={`${column.name} 고치기`} tooltip="고치기" variant="ghost" size="sm" icon={<NavIcon name="edit" />} />
        </span>
      </SettingsRow>)}
    </SettingsCard>
  </VStack>;
}
