import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { rowReorderStyles as rows, useRowReorder } from '@/shared/lib/row-reorder';
import { CompactDialog, FormMessage, MarkIcon, NavIcon, StatusToken } from '@/shared/ui';
import { setViewOrder, type IssueView } from '@/entities/issue';
import styles from './views.module.css';

const VIEW = { word: '뷰', object: '뷰를', topic: '뷰는' };

/**
 * 뷰 순서 (D-088): the scope's views in its own order, each carried by its grip (useRowReorder, or Alt + ↑ / ↓) as a
 * board's columns are. The first is the scope's default, where its name in the trail leads; it is marked so. Each move
 * is kept at once for everyone in the workspace.
 */
export function ViewOrderDialog({ workspaceId, scope, scopeName, views, onClose }: {
  workspaceId: string; scope: string; scopeName: string; views: readonly IssueView[]; onClose: () => void;
}) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const reorder = useRowReorder(views, VIEW, rows.ghost, async order => {
    setError('');
    await setViewOrder(client, workspaceId, scope, order);
  }, failure => setError(authError(failure)));
  const shown = reorder.order.flatMap(id => views.filter(view => view.id === id));
  return <CompactDialog title={`${scopeName} 뷰 순서`} subtitle="맨 위의 뷰가 기본 뷰입니다. 위쪽 경로에서 이름을 누르면 기본 뷰가 열립니다." width={460} onClose={onClose}
    footer={<Button label="닫기" variant="secondary" onClick={onClose} />}>
    <div ref={reorder.list} className={`${rows.list} ${styles.order}`} role="list" aria-label={`${scopeName} 뷰 순서`}>
      {shown.map((view, index) => <div key={view.id} className={rows.row} role="listitem" {...reorder.rowProps(view.id)}>
        <span className={styles.orderRow}>
          <button type="button" className={rows.grip} {...reorder.gripProps(view)}><NavIcon name="grip" /></button>
          <span className={styles.orderMark} style={{ color: view.color }}><MarkIcon name={view.icon} /></span>
          <span className={styles.orderName}>{view.name}</span>
          {view.isPersonal && <span className={styles.personal} aria-label="나만 보기"><NavIcon name="person" /></span>}
          {index === 0 && <StatusToken label="기본" color="blue" />}
        </span>
      </div>)}
    </div>
    <span id={reorder.hint} className={styles.spoken}>끌어서 옮기거나, Alt와 위아래 화살표로 한 칸씩 옮깁니다. 끄는 동안 Esc는 취소입니다.</span>
    <span className={styles.spoken} role="status" aria-live="polite">{reorder.said}</span>
    <FormMessage message={error} />
  </CompactDialog>;
}
