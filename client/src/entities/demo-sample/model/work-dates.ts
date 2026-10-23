import { useSyncExternalStore } from 'react';

/**
 * Due days given on the demo's visit to work made without one (the home's 날짜 미정 drawer, dropped on a calendar day),
 * by work item id, as Seoul days. Kept in memory; the real app saves the item's due date through the server.
 */
let dues: Readonly<Record<string, string>> = {};
const listeners = new Set<() => void>();

export function useWorkDues() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => dues);
}

export function setWorkDue(itemId: string, day: string) {
  dues = { ...dues, [itemId]: day };
  listeners.forEach(listener => listener());
}

/** Takes back a day given on the visit, so the work has none again. */
export function clearWorkDue(itemId: string) {
  const { [itemId]: _, ...rest } = dues;
  dues = rest;
  listeners.forEach(listener => listener());
}
