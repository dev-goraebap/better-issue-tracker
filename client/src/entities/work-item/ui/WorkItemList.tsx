import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core';
import { Link } from '@tanstack/react-router';
import type { WorkItem } from '../api/work-item';
import { PRIORITIES } from '../model/labels';
import styles from './work-item-list.module.css';
export function WorkItemList({ items, columnNames = {}, actions }: { items: WorkItem[]; columnNames?: Record<string, string>; actions?: (item: WorkItem) => ReactNode }) {
  return <section className={styles.scroll}><table className={styles.table}><thead><tr><th>작업</th><th>담당자</th><th>우선순위</th><th>상태</th><th>마감일</th>{actions && <th>동작</th>}</tr></thead><tbody>{items.map(item => <tr key={item.id}>
    <td>{item.deletedAt ? <Text>{item.key} · {item.title}</Text> : <Link to="/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId: item.workspaceId, projectId: item.projectId, workItemId: item.id }}><Text type="supporting" color="secondary">{item.key}</Text> {item.title}</Link>}</td>
    <td>{item.assigneeName ?? '—'}</td><td>{item.priority ? PRIORITIES[item.priority] : '—'}</td><td>{item.columnId ? columnNames[item.columnId] ?? (item.closedAt ? '완료' : '진행 중') : '백로그'}{item.archivedAt ? ' · 보관' : ''}</td><td>{item.dueDate ?? '—'}</td>{actions && <td>{actions(item)}</td>}
  </tr>)}</tbody></table></section>;
}
