import { useId } from 'react';
import { IconButton, MoreMenu } from '@astryxdesign/core';
import { NavIcon, PageTabs, type PageTab } from '@/shared/ui';
import { canEditView, type IssueView } from '@/entities/work-item';
import styles from './views.module.css';

/**
 * The views as Linear's tab row (D-066, D-068): a chip each in the member's sight (the shared ones and their own
 * personal ones, a personal one marked with a person), 전체 이슈 first; the + after them makes a new view; the view in
 * sight that the member may change has a menu to edit, copy or remove it. The chips are tabs to assistive technology,
 * the view the address's.
 */
export function ViewTabs({ views, value, panelId, me, role, onPick, onCreate, onEdit, onCopy, onRemove }: {
  views: readonly IssueView[]; value: string; panelId: string; me: string; role?: string;
  onPick: (id: string) => void; onCreate: () => void; onEdit: () => void; onCopy: () => void; onRemove: () => void;
}) {
  const current = views.find(view => view.id === value);
  const labelId = useId();
  const items: PageTab<string>[] = views.map(view => ({ value: view.id, label: view.name, icon: view.icon, tone: view.color,
    endContent: view.isPersonal ? <span className={styles.personal} aria-label="나만 보기"><NavIcon name="person" /></span> : undefined }));
  return <div className={styles.tabs} role="group" aria-labelledby={labelId}>
    <span id={labelId} className={styles.spoken}>뷰</span>
    <PageTabs value={value} items={items} panelId={panelId} onChange={onPick} />
    <IconButton label="새 뷰" tooltip="새 뷰" variant="ghost" size="sm" icon={<NavIcon name="plus" />} onClick={onCreate} />
    {current && !current.isBuiltIn && <MoreMenu label={`${current.name} 뷰 메뉴`} variant="ghost" size="sm" items={[
      ...(canEditView(current, me, role) ? [{ label: '뷰 고치기', icon: <NavIcon name="edit" />, onClick: onEdit }] : []),
      { label: '복제', icon: <NavIcon name="copy" />, onClick: onCopy },
      ...(canEditView(current, me, role) ? [{ label: '뷰 지우기', icon: <NavIcon name="delete" />, onClick: onRemove }] : []),
    ]} />}
  </div>;
}
