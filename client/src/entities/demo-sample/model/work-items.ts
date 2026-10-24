import { useSyncExternalStore } from 'react';
import { projectOf, WORK_ITEMS, type Priority, type Status, type WorkItem } from './mock';

/**
 * The work items for the demo's visit: the mock ones and any made in the 새 작업 dialog, kept in memory so every list
 * agrees. A real app creates one through the server and reads the list again.
 */
let version = 0;
const listeners = new Set<() => void>();

/** Every work item, read again whenever one is made. */
export function useWorkItems(): readonly WorkItem[] {
  useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => version);
  return WORK_ITEMS;
}

/** Adds a work item to a project under its next key (BIT-121, say), the newest first, and returns it. */
export function addWorkItem(draft: { projectId: string; title: string; status: Status; priority: Priority; assigneeId?: string; labels: string[]; dueAt?: string }): WorkItem {
  const project = projectOf(draft.projectId);
  const prefix = `${project?.key ?? 'NEW'}-`;
  const next = Math.max(0, ...WORK_ITEMS.filter(item => item.key.startsWith(prefix)).map(item => Number(item.key.slice(prefix.length)) || 0)) + 1;
  const now = new Date(Date.UTC(2026, 9, 23, 6)).toISOString();
  const item: WorkItem = { ...draft, id: `w-${Date.now().toString(36)}`, key: `${prefix}${next}`, createdAt: now, updatedAt: now, comments: 0 };
  WORK_ITEMS.unshift(item);
  version += 1;
  listeners.forEach(listener => listener());
  return item;
}
