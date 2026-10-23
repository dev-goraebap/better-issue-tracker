import { valuesOf } from '@/shared/ui';
import { PRIORITY_RANK, type WorkItem } from './mock';
import type { TableSearch } from './search';

/** The list a real server would return for these conditions and this order: here filtered and ordered in memory. */
export function filterWork(items: readonly WorkItem[], search: TableSearch, order: { key: string; direction: 'asc' | 'desc' }): WorkItem[] {
  const words = search.q?.toLowerCase();
  const statuses = valuesOf(search.status);
  const assignees = valuesOf(search.assignee);
  const sign = order.direction === 'asc' ? 1 : -1;
  return items
    .filter(item => !words || item.title.toLowerCase().includes(words) || item.key.toLowerCase().includes(words))
    .filter(item => statuses.length === 0 || statuses.includes(item.status))
    .filter(item => !search.priority || item.priority === search.priority)
    .filter(item => assignees.length === 0 || (item.assigneeId !== undefined && assignees.includes(item.assigneeId)))
    .sort((a, b) => {
      if (order.key === 'title') return sign * a.title.localeCompare(b.title, 'ko');
      if (order.key === 'priority') return sign * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      const field = order.key === 'created' ? 'createdAt' : 'updatedAt';
      return sign * a[field].localeCompare(b[field]);
    });
}
