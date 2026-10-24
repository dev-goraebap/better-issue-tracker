import { IconButton, Text } from '@astryxdesign/core';
import { Link } from '@tanstack/react-router';
import { DefaultAvatar, NavIcon } from '@/shared/ui';
import { personOf, PriorityMark, STATUS_LABELS, type Status, type WorkItem, type WorkSearch } from '@/entities/demo-sample';
import styles from './board.module.css';

const COLUMNS: Status[] = ['todo', 'doing', 'review', 'done'];

/**
 * The board view: a column per status across the card's whole width, scrolling sideways inside its own box so the page
 * never shakes (bit-frontend 04 §5). A column's head names it with its count and its own + to add there; a card is a
 * link to the item's page with its key, title, priority and the assignee's picture.
 */
export function BoardView({ workspaceId, items, search, onCreate }: { workspaceId: string; items: WorkItem[]; search: WorkSearch; onCreate: () => void }) {
  return <div className={styles.board} role="list" aria-label="상태별 작업">
    {COLUMNS.map(status => {
      const cards = items.filter(item => item.status === status);
      return <section key={status} className={styles.column} role="listitem" aria-label={`${STATUS_LABELS[status]} ${cards.length}개`}>
        <header className={styles.columnHead}>
          <span className={styles.dot} data-status={status} aria-hidden="true" />
          <Text weight="semibold">{STATUS_LABELS[status]}</Text><Text type="supporting" color="secondary">{cards.length}</Text>
          <span className={styles.columnAdd}><IconButton label={`${STATUS_LABELS[status]}에 작업 추가`} icon={<NavIcon name="plus" />} variant="ghost" size="sm" onClick={onCreate} /></span>
        </header>
        <ul className={styles.cards}>{cards.map(item => {
          const person = personOf(item.assigneeId);
          return <li key={item.id}><Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} search={search} className={styles.card}>
            <span className={styles.cardKey}>{item.key}</span>
            <span className={styles.cardTitle}>{item.title}</span>
            <span className={styles.cardMeta}><PriorityMark priority={item.priority} />{person && <DefaultAvatar seed={person.id} name={person.name} size={20} />}</span>
          </Link></li>;
        })}</ul>
      </section>;
    })}
  </div>;
}
