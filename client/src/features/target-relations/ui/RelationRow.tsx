import { DefaultAvatar, MoreMenu, NavIcon } from '@/shared/ui';
import { DocumentLink } from '@/entities/document';
import { WorkItemLink, StatusBadge, type ColumnCategory } from '@/entities/work-item';
import { type Relation } from '@/entities/relation';
import styles from './relations.module.css';

export function RelationRow({ workspaceId, item, onRemove, isBusy }: { workspaceId: string; item: Relation; onRemove?: () => void; isBusy?: boolean }) {
  if (item.type !== 'document' && item.type !== 'work_item') return null;
  const content = <>
    <span className={styles.mark}>{item.type === 'work_item' && item.category
      ? <StatusBadge category={item.category as ColumnCategory} name={item.status ?? undefined} isLabelHidden /> : <NavIcon name={item.type === 'document' ? 'document' : 'task'} />}</span>
    {item.reference && <span className={styles.reference}>{item.reference}</span>}
    <span className={styles.rowTitle}>{item.title}</span>
    <span className={styles.meta}>{item.relation === 'mentions' && <span className={styles.origin}>본문 참조</span>}
      {item.people.length > 0 && <span className={styles.people} title={item.people.join(', ')}>{item.people.slice(0, 3).map((name, index) => <DefaultAvatar key={item.peopleIds?.[index] ?? name} seed={item.peopleIds?.[index] ?? name} name={name} size={20} />)}</span>}</span>
  </>;
  return <li className={styles.row}>
    {item.type === 'document' ? <DocumentLink workspaceId={workspaceId} document={item} className={styles.target}>{content}</DocumentLink>
      : <WorkItemLink workspaceId={workspaceId} item={{ id: item.id, projectId: item.projectId ?? null }} className={styles.target}>{content}</WorkItemLink>}
    {onRemove && <span className={styles.rowMenu}><MoreMenu label={`${item.title} 관계 메뉴`} variant="ghost" isDisabled={isBusy}
      items={[{ label: '연결 해제', icon: <NavIcon name="unlink" />, onClick: onRemove }]} /></span>}
  </li>;
}
