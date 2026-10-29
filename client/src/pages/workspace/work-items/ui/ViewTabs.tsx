import { useId } from 'react';
import { MoreMenu, NavIcon, PageTabs, type PageTab } from '@/shared/ui';
import type { WorkItemView } from '@/entities/work-item';
import styles from './views.module.css';

/**
 * The views as Linear's tab row (D-066, D-068): a chip each in the member's sight (the shared ones and their own
 * personal ones, a personal one marked with a person), in the scope's own order, its first the default (D-088). One
 * … after them holds the rest (BIT-121): 새 뷰, 뷰 순서 for those who may set it, and, under the view in sight's name,
 * 고치기, 복제 and 지우기 as the member may. The chips are tabs to assistive technology, the view the address's.
 */
export function ViewTabs({ views, value, panelId, onPick, onCreate, onOrder, onEdit, onCopy, onRemove }: {
  views: readonly WorkItemView[]; value: string; panelId: string;
  onPick: (id: string) => void; onCreate: () => void; onOrder?: () => void; onEdit: () => void; onCopy: () => void; onRemove: () => void;
}) {
  const current = views.find(view => view.id === value);
  const labelId = useId();
  const items: PageTab<string>[] = views.map(view => ({ value: view.id, label: view.name, mark: view.icon, tone: view.color,
    endContent: view.isPersonal ? <span className={styles.personal} aria-label="나만 보기"><NavIcon name="person" /></span> : undefined }));
  return <div className={styles.tabs} role="group" aria-labelledby={labelId}>
    <span id={labelId} className={styles.spoken}>뷰</span>
    <PageTabs value={value} items={items} panelId={panelId} onChange={onPick} />
    <MoreMenu label="뷰 메뉴" variant="ghost" size="sm" items={[
      { label: '새 뷰', icon: <NavIcon name="plus" />, onClick: onCreate },
      ...(onOrder ? [{ label: '뷰 순서 바꾸기', icon: <NavIcon name="sort" />, onClick: onOrder }] : []),
      ...(current && !current.isBuiltIn ? [{ type: 'section' as const, title: current.name, items: [
        ...(current.canEdit ? [{ label: '뷰 고치기', icon: <NavIcon name="edit" />, onClick: onEdit }] : []),
        { label: '복제', icon: <NavIcon name="copy" />, onClick: onCopy },
        ...(current.canEdit ? [{ label: '뷰 지우기', icon: <NavIcon name="delete" />, onClick: onRemove }] : []),
      ] }] : []),
    ]} />
  </div>;
}
