import { useState, type DragEvent } from 'react';
import { IconButton, useToast } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { DefaultAvatar, NavIcon } from '@/shared/ui';
import { CATEGORIES, CATEGORY_LABELS, moveItem, PriorityMark, refreshItems, StatusBadge, type ColumnCategory, type IssueSearch, type WorkItem } from '@/entities/work-item';
import type { Scope } from '../model/scope';
import styles from './board.module.css';

type Lane = { key: string; name: string; category: ColumnCategory; cards: WorkItem[]; columnId?: string };

/**
 * The board view: a lane per status across the card's whole width, scrolling sideways inside its own box so the page
 * never shakes (bit-frontend 04 §5). In a project the lanes are its columns, in 전체 the categories (할 일, 진행 중,
 * 완료, D-066). A lane's head is the status's mark and name with its count and its own + to add there; a card is a link to
 * the issue's page with its key, title, priority and the assignee's picture (D-067). Only issues with a status show. In
 * a project a card is dragged to another lane (it goes to the lane's end), which moves the issue there.
 */
export function BoardView({ scope, items, search, onCreate }: { scope: Scope; items: readonly WorkItem[]; search: IssueSearch; onCreate?: (status: string) => void }) {
  const client = useQueryClient();
  const toast = useToast();
  const [dragged, setDragged] = useState<WorkItem | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const byPosition = (a: WorkItem, b: WorkItem) => a.position - b.position || a.id.localeCompare(b.id);
  const lanes: Lane[] = scope.project
    ? [...scope.columns].sort((a, b) => a.position - b.position).map(column => ({ key: column.id, name: column.name, category: column.category, columnId: column.id,
      cards: items.filter(item => item.columnId === column.id).sort(byPosition) }))
    : CATEGORIES.map(category => ({ key: category, name: CATEGORY_LABELS[category], category, cards: items.filter(item => item.columnCategory === category).sort(byPosition) }));
  const canDrag = !!scope.project && scope.canWrite;
  const drop = async (event: DragEvent, lane: Lane) => {
    event.preventDefault();
    setOver(null);
    const item = dragged;
    setDragged(null);
    if (!item || !lane.columnId || item.columnId === lane.columnId) return;
    try {
      await moveItem(scope.workspaceId, item.projectId, item.id, { expectedVersion: item.version, targetColumnId: lane.columnId, afterItemId: lane.cards.at(-1)?.id ?? null });
    } catch (failure) { toast({ body: authError(failure) }); }
    await refreshItems(client, scope.workspaceId, item.projectId);
  };
  return <div className={styles.board} role="list" aria-label="상태별 이슈">
    {lanes.map(lane => <section key={lane.key} className={styles.column} role="listitem" aria-label={`${lane.name} ${lane.cards.length}개`}
      data-over={over === lane.key || undefined}
      onDragOver={canDrag ? event => { if (dragged) { event.preventDefault(); setOver(lane.key); } } : undefined}
      onDragLeave={canDrag ? () => setOver(current => (current === lane.key ? null : current)) : undefined}
      onDrop={canDrag ? event => { void drop(event, lane); } : undefined}>
      <header className={styles.columnHead}>
        <span className={styles.columnName}><StatusBadge category={lane.category} name={lane.name} /></span><span className={styles.columnCount}>{lane.cards.length}</span>
        {onCreate && <span className={styles.columnAdd}><IconButton label={`${lane.name}에 이슈 추가`} icon={<NavIcon name="plus" />} variant="ghost" size="sm" onClick={() => onCreate(lane.key)} /></span>}
      </header>
      <ul className={styles.cards}>{lane.cards.map(item => <li key={item.id}>
        <Link to="/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId: scope.workspaceId, projectId: item.projectId, workItemId: item.id }} search={search}
          className={styles.card} draggable={canDrag} data-dragging={dragged?.id === item.id || undefined}
          onDragStart={canDrag ? event => { setDragged(item); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.key); } : undefined}
          onDragEnd={canDrag ? () => { setDragged(null); setOver(null); } : undefined}>
          <span className={styles.cardKey}>{item.key}</span>
          <span className={styles.cardTitle}>{item.title}</span>
          <span className={styles.cardMeta}>{item.priority ? <PriorityMark priority={item.priority} /> : <span />}{item.assigneeId && <DefaultAvatar seed={item.assigneeId} name={item.assigneeName ?? ''} size={20} />}</span>
        </Link>
      </li>)}</ul>
    </section>)}
  </div>;
}
