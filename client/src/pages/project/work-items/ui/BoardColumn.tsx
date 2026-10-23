import type { DragEvent } from 'react';
import { Button, HStack, Text, VStack } from '@astryxdesign/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { itemsQuery, type TaskFilters, type WorkItem } from '@/entities/work-item';
import type { BoardColumn as Column } from '@/entities/project';
import { QueryMessage } from '@/shared/ui';
import { WorkItemCard } from './WorkItemCard';
import styles from './work-items.module.css';
export function BoardColumn({ workspaceId, projectId, column, columns, filters, count, canWrite, busy, onCreate, onDrag, drop, move }: { workspaceId: string; projectId: string; column: Column; columns: Column[]; filters: TaskFilters; count?: number; canWrite: boolean; busy: boolean; onCreate: () => void; onDrag: (item: WorkItem | null) => void; drop: (event: DragEvent, column: string, before?: WorkItem, after?: WorkItem) => void; move: (item: WorkItem, column: string, before?: WorkItem, after?: WorkItem) => void }) {
  const result = useInfiniteQuery(itemsQuery(workspaceId, projectId, { ...filters, column: column.id, sort: 'position', direction: 'ASC' })); const items = result.error ? [] : result.data?.pages.flatMap(page => page.items) ?? [];
  return <section className={styles.column} style={column.color ? { borderBlockStartColor: column.color } : undefined} aria-label={column.name} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, column.id, undefined, items.at(-1))}>
    <HStack gap={2} className={styles.columnHead}><Text weight="semibold">{column.name}</Text><Text type="supporting" color="secondary">{count ?? '…'}</Text>{column.isFinal && <Text type="supporting" color="secondary">완료</Text>}{canWrite && <Button label={`${column.name}에 작업 추가`} variant="ghost" size="sm" onClick={onCreate} isDisabled={busy} />}</HStack>
    <VStack gap={3}><QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
      {!result.isPending && !result.error && !items.length && <Text type="supporting" color="secondary">작업이 없습니다.</Text>}
      {items.map((item, index) => <WorkItemCard key={item.id} item={item} columns={columns} canWrite={canWrite} busy={busy} onDrag={onDrag} onDrop={(event, before) => drop(event, column.id, before)} up={index ? () => move(item, column.id, items[index - 1]) : undefined} down={index < items.length - 1 ? () => move(item, column.id, undefined, items[index + 1]) : undefined} />)}
      {result.hasNextPage && <Button label={`${column.name} 작업 더 불러오기`} onClick={() => { void result.fetchNextPage(); }} isLoading={result.isFetchingNextPage} />}
    </VStack>
  </section>;
}
