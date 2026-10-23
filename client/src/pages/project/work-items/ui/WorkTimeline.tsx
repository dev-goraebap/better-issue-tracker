import { Text, VStack } from '@astryxdesign/core';
import { Link } from '@tanstack/react-router';
import type { WorkItem } from '@/entities/work-item';
import styles from './work-items.module.css';
const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000;
export function WorkTimeline({ items }: { items: WorkItem[] }) {
  const dated = items.filter(item => item.startDate || item.dueDate); const undated = items.filter(item => !item.startDate && !item.dueDate);
  const starts = dated.map(item => day(item.startDate ?? item.dueDate!)); const ends = dated.map(item => day(item.dueDate ?? item.startDate!));
  const min = starts.length ? Math.min(...starts) : 0; const max = ends.length ? Math.max(...ends) : min; const span = Math.max(7, max - min + 1);
  return <VStack gap={5}>{dated.length ? <section className={styles.timeline} aria-label="작업 일정">{dated.map(item => { const left = (day(item.startDate ?? item.dueDate!) - min) / span * 100; const width = Math.max(1, (day(item.dueDate ?? item.startDate!) - day(item.startDate ?? item.dueDate!) + 1) / span * 100); return <article key={item.id} className={styles.timelineRow}>
    <>{item.deletedAt ? <Text>{item.key} · {item.title} · 삭제됨</Text> : <Link to="/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId: item.workspaceId, projectId: item.projectId, workItemId: item.id }}>{item.key} · {item.title}</Link>}</><section className={styles.track}><section className={styles.bar} style={{ marginInlineStart: `${left}%`, inlineSize: `${width}%` }} title={`${item.startDate ?? '미정'} ~ ${item.dueDate ?? '미정'}`} /><Text type="supporting" color="secondary">{item.startDate ?? '미정'} ~ {item.dueDate ?? '미정'}</Text></section>
  </article>; })}</section> : <Text color="secondary">날짜가 있는 작업이 없습니다.</Text>}
    {!!undated.length && <VStack gap={3}><Text weight="semibold">일정 미지정</Text>{undated.map(item => <section key={item.id}>{item.deletedAt ? <Text>{item.key} · {item.title} · 삭제됨</Text> : <Link to="/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId: item.workspaceId, projectId: item.projectId, workItemId: item.id }}>{item.key} · {item.title}</Link>}</section>)}</VStack>}
  </VStack>;
}
