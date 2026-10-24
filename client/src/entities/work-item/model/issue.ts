import type { ColumnCategory, WorkItem } from '../api/work-item';

/** An issue is a work item (D-066): no fixed types, only the properties it has and its labels. */
export type Priority = NonNullable<WorkItem['priority']>;
/** Where an issue stands across projects: its column's category, or none (no status, D-066). */
export type StatusCategory = ColumnCategory | 'none';
export const CATEGORY_LABELS: Record<StatusCategory, string> = { todo: '할 일', doing: '진행 중', done: '완료', none: '상태 없음' };
export const CATEGORIES: readonly ColumnCategory[] = ['todo', 'doing', 'done'];
export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
/** A label filter's value for the workspace's system label (결정기록), whatever its id in a workspace. */
export const SYSTEM_LABEL = 'system';

export const categoryOf = (item: Pick<WorkItem, 'columnCategory'>): StatusCategory => item.columnCategory ?? 'none';

/** The days an issue covers, for a calendar or a timeline: start to due, or its one day; none without a day. */
export function spanOf(item: Pick<WorkItem, 'startDate' | 'dueDate'>): { start: string; end: string } | undefined {
  const start = item.startDate ?? item.dueDate;
  const end = item.dueDate ?? item.startDate;
  return start && end ? { start, end } : undefined;
}

/** An issue's page, for what navigates rather than links (a calendar's bar, a toast's 보기). */
export const issueHref = (workspaceId: string, item: Pick<WorkItem, 'id' | 'projectId'>) => `/w/${workspaceId}/p/${item.projectId}/work-items/${item.id}`;
