import { useId, useState, type ReactNode } from 'react';
import { NavIcon } from '@/shared/ui';
import { type Relation } from '@/entities/relation';
import { RelationRow } from './RelationRow';
import styles from './relations.module.css';

export function RelationSection({ workspaceId, title, items, hint, actions, progress, onRemove, busy }: {
  workspaceId: string; title: string; items: Relation[]; hint: string; actions?: ReactNode; progress?: { done: number; total: number };
  onRemove?: (item: Relation) => void; busy?: string;
}) {
  const id = useId(); const [open, setOpen] = useState(true);
  return <section aria-labelledby={id} className={styles.section}>
    <div className={styles.sectionHead}>
      <h2 id={id}><button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls={`${id}-items`}>
        <span className={styles.chevron} data-open={open || undefined}><NavIcon name="forward" /></span>{title}<span className={styles.count}>{items.length}</span>
      </button></h2>
      {progress && <span className={styles.completion}><NavIcon name={progress.done === progress.total ? 'check' : 'status'} />{progress.done}/{progress.total} 완료</span>}
      {actions}
    </div>
    {open && <div id={`${id}-items`}>{items.length ? <ul className={styles.list}>{items.map(item => <RelationRow key={item.linkId} workspaceId={workspaceId} item={item}
      onRemove={onRemove && item.relation !== 'mentions' ? () => onRemove(item) : undefined} isBusy={busy === item.linkId} />)}</ul>
      : <p className={styles.hint}>{hint}</p>}</div>}
  </section>;
}
