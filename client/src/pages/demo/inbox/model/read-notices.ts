import { useSyncExternalStore } from 'react';
import { NOTICES } from '@/entities/demo-sample';

/**
 * Which notices the member has read, kept in memory for the demo's visit so the list and the detail (two addresses)
 * agree; a real page reads and marks them through the server.
 */
let read = new Set(NOTICES.filter(notice => notice.isRead).map(notice => notice.id));
const listeners = new Set<() => void>();
const set = (next: Set<string>) => { read = next; listeners.forEach(listener => listener()); };

export const markRead = (id: string) => { if (!read.has(id)) set(new Set([...read, id])); };
export const markUnread = (id: string) => { const next = new Set(read); next.delete(id); set(next); };
export const markAllRead = () => set(new Set(NOTICES.map(notice => notice.id)));
export function useReadNotices() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => read);
}
