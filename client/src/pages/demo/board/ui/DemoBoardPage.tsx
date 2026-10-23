import { useMemo, useState } from 'react';
import { IconButton, SegmentedControl, SegmentedControlItem, Text } from '@astryxdesign/core';
import { Link, useNavigate } from '@tanstack/react-router';
import { DefaultAvatar, ListToolbar, NavIcon, PageFrame, valuesOf, type ListFilter } from '@/shared/ui';
import styles from './board.module.css';
import { PEOPLE, personOf, PriorityMark, type Status, STATUS_LABELS, WORK_ITEMS } from '@/entities/demo-sample';

const COLUMNS: Status[] = ['todo', 'doing', 'review', 'done'];

/**
 * PATTERN · 보드 (full width). Copy this page for a screen that uses the card's whole width (a board, a timeline).
 *
 * - chrome="header" without width: the content runs edge to edge; the columns scroll sideways inside their own box and
 *   never shake the page (bit-frontend 04 §5).
 * - ListToolbar lead puts the view switch first in the header row (보드 | 표), as Plane leads with its layouts.
 * - A card is a link to the item's page: its key, title, then priority and the assignee's avatar on one line.
 * - A column's head shows its name and count, with its own + to add a card to that column.
 */
export function DemoBoardPage() {
  const navigate = useNavigate();
  const [assignee, setAssignee] = useState<string | undefined>();
  const filters: ListFilter[] = [{ key: 'assignee', label: '담당자', icon: 'person', value: assignee, isMultiple: true, isSearchable: true,
    options: PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={20} /> })) }];
  const items = useMemo(() => { const chosen = valuesOf(assignee); return WORK_ITEMS.filter(item => chosen.length === 0 || (item.assigneeId && chosen.includes(item.assigneeId))); }, [assignee]);
  const lead = <SegmentedControl label="보기" value="board" size="sm" onChange={value => { if (value === 'table') void navigate({ to: '/demo/table' }); }}>
    <SegmentedControlItem value="board" label="보드" icon={<NavIcon name="board" />} />
    <SegmentedControlItem value="table" label="표" icon={<NavIcon name="table" />} />
  </SegmentedControl>;
  return <PageFrame title="보드" icon="board" chrome="header">
    <ListToolbar label="보드 조건" lead={lead} filters={filters} onFiltersChange={values => setAssignee(values.assignee)}
      action={{ label: '새 작업', icon: 'plus', onClick: () => void navigate({ to: '/demo/items/new' }), isCreate: true }} />
    <div className={styles.board} role="list" aria-label="상태별 작업">
      {COLUMNS.map(status => {
        const cards = items.filter(item => item.status === status);
        return <section key={status} className={styles.column} role="listitem" aria-label={`${STATUS_LABELS[status]} ${cards.length}개`}>
          <header className={styles.columnHead}>
            <span className={styles.dot} data-status={status} aria-hidden="true" />
            <Text weight="semibold">{STATUS_LABELS[status]}</Text><Text type="supporting" color="secondary">{cards.length}</Text>
            <span className={styles.columnAdd}><IconButton label={`${STATUS_LABELS[status]}에 작업 추가`} icon={<NavIcon name="plus" />} variant="ghost" size="sm" onClick={() => void navigate({ to: '/demo/items/new' })} /></span>
          </header>
          <ul className={styles.cards}>{cards.map(item => {
            const person = personOf(item.assigneeId);
            return <li key={item.id}><Link to="/demo/items/$id" params={{ id: item.id }} className={styles.card}>
              <span className={styles.cardKey}>{item.key}</span>
              <span className={styles.cardTitle}>{item.title}</span>
              <span className={styles.cardMeta}><PriorityMark priority={item.priority} />{person && <DefaultAvatar seed={person.id} name={person.name} size={20} />}</span>
            </Link></li>;
          })}</ul>
        </section>;
      })}
    </div>
  </PageFrame>;
}
