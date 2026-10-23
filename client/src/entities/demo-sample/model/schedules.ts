import { useSyncExternalStore } from 'react';

/**
 * A workspace's own schedule (일정), made from the home's 만들기: tied to one of its projects or to none, all day or for
 * hours, as Seoul wall-clock moments (an all-day one ends at the midnight after its day). Kept in memory for the demo's
 * visit; the real app has no schedules yet.
 */
export type DemoSchedule = { id: string; workspaceId: string; projectId?: string; title: string; allDay: boolean; start: string; end: string };

let list: readonly DemoSchedule[] = [];
const listeners = new Set<() => void>();

export function useSchedules() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => list);
}

/** Adds a schedule and returns its id. */
export function addSchedule(schedule: Omit<DemoSchedule, 'id'>): string {
  const id = `schedule-${Date.now().toString(36)}`;
  list = [...list, { ...schedule, id }];
  listeners.forEach(listener => listener());
  return id;
}
