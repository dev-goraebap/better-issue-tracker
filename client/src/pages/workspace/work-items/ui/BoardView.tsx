import type { ReactNode } from 'react';
import { IconButton, useToast } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { NavIcon, useFillRoom } from '@/shared/ui';
import { CATEGORIES, CATEGORY_LABELS, WorkItemLink, moveItem, PeopleAvatars, PriorityMark, refreshItems, StatusBadge, type ColumnCategory, type WorkItemSearch, type WorkItem } from '@/entities/work-item';
import type { Scope } from '../model/scope';
import { useBoardMove } from './useBoardMove';
import styles from './board.module.css';

type Lane = { key: string; name: string; category: ColumnCategory; cards: WorkItem[]; columnId?: string };

/**
 * The board view: a lane per status across the card's whole width, scrolling sideways inside its own box so the page
 * never shakes (bit-frontend 04 §5). The board takes the height the page leaves below the toolbar (useFillRoom), so the
 * page never scrolls for it; each lane runs that full height and scrolls its own cards. In a project the lanes are its columns, in 전체 the categories (할 일, 진행 중,
 * 완료, D-066). A lane's head is the status's mark and name with its count and its own + to add there; a card is a link to
 * the work item's page with its key, title, priority and the assignee's picture (D-067). Only work items with a status show. In
 * a project a card is carried to another lane or place (useBoardMove) by mouse, by a resting finger or by the keys,
 * which moves the work item there.
 */
export function BoardView({ scope, items, search, onCreate, badges }: {
  scope: Scope; items: readonly WorkItem[]; search: WorkItemSearch; onCreate?: (status: string) => void; badges?: ReadonlyMap<string, ReactNode>;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const byPosition = (a: WorkItem, b: WorkItem) => a.position - b.position || a.id.localeCompare(b.id);
  const lanes: Lane[] = scope.project
    ? [...scope.columns].sort((a, b) => a.position - b.position).map(column => ({ key: column.id, name: column.name, category: column.category, columnId: column.id,
      cards: items.filter(item => item.columnId === column.id).sort(byPosition) }))
    : CATEGORIES.map(category => ({ key: category, name: CATEGORY_LABELS[category], category, cards: items.filter(item => item.columnCategory === category).sort(byPosition) }));
  const canMove = !!scope.project && scope.canWrite;
  const room = useFillRoom<HTMLDivElement>(true);
  const move = useBoardMove(lanes, canMove, styles.ghost, async (item, place) => {
    try {
      await moveItem(scope.workspaceId, item.projectId ?? '', item.id, { expectedVersion: item.version, ...place });
    } catch (failure) { toast({ body: authError(failure) }); }
    await refreshItems(client, scope.workspaceId, item.projectId ?? '');
  });
  return <>
    <div ref={room} className={styles.room}><div ref={move.board} className={styles.board} role="list" aria-label="상태별 업무" data-dragging={move.carry?.by === 'pointer' || undefined}>
      {move.shown.map(lane => <section key={lane.key} className={styles.column} role="listitem" aria-label={`${lane.name} ${lane.cards.length}개`}
        data-lane={lane.key} data-over={move.carry?.spot.lane === lane.key || undefined}>
        <header className={styles.columnHead}>
          <span className={styles.columnName}><StatusBadge category={lane.category} name={lane.name} /></span><span className={styles.columnCount}>{lane.cards.length}</span>
          {onCreate && <span className={styles.columnAdd}><IconButton label={`${lane.name}에 업무 추가`} icon={<NavIcon name="plus" />} variant="ghost" size="sm" onClick={() => onCreate(lane.key)} /></span>}
        </header>
        <ul className={styles.cards} data-lane-scroll="">{lane.cards.map(item => <li key={item.id}>
          <WorkItemLink workspaceId={scope.workspaceId} item={item} search={search} className={styles.card} {...move.cardProps(item)}>
            <span className={styles.cardKey}>{item.key}</span>
            <span className={styles.cardTitle}>{item.title}</span>
            <span className={styles.cardMeta}><span className={styles.cardMarks}>{item.priority && <PriorityMark priority={item.priority} />}{badges?.get(item.id)}</span><PeopleAvatars people={item.people} /></span>
          </WorkItemLink>
        </li>)}</ul>
      </section>)}
    </div></div>
    {canMove && <>
      <span id={move.hint} className={styles.hidden}>스페이스로 집고 화살표로 옮긴 뒤 스페이스나 Enter로 놓습니다. 손가락은 길게 눌러 집습니다.</span>
      <span className={styles.hidden} role="status" aria-live="polite">{move.said}</span>
    </>}
  </>;
}
